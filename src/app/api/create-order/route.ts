
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// This is the server-side API route that creates a payment order with Cashfree.
export async function POST(req: NextRequest) {
  let adminApp: App;
  
  // Reliably initialize the Firebase Admin SDK for every request if not already initialized.
  if (!getApps().length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          adminApp = initializeApp({
              credential: cert(serviceAccount)
          });
      } else {
          console.error("FATAL: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
          return NextResponse.json({ error: 'Server configuration error: Firebase credentials missing.' }, { status: 500 });
      }
  } else {
      adminApp = getApps()[0];
  }

  const adminFirestore = getAdminFirestore(adminApp);


  try {
    const body = await req.json();
    const { userId, userEmail, userPhone, userName, item, itemType } = body;

    // 1. Validate essential item information from our client
    if (!item || typeof item.price !== 'number' || !item.name || !userId) {
      return NextResponse.json({ error: 'Item or user information is missing or invalid' }, { status: 400 });
    }
    
    // 2. Validate server environment variables
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      console.error('Cashfree credentials are not configured on the server.');
      return NextResponse.json({ error: 'Payment gateway credentials are not configured.' }, { status: 500 });
    }

    const orderId = `order_${Date.now()}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
    const returnUrl = `${baseUrl}/api/payment-status?order_id={order_id}`;
    
    // 3. Construct the request body for Cashfree API
    const requestBody = {
      order_id: orderId,
      order_amount: Number(item.price),
      order_currency: "INR",
      order_note: `Payment for ${item.name}`,
      customer_details: {
        customer_id: userId,
        customer_email: userEmail || 'default-email@example.com',
        customer_phone: userPhone || "9999999999",
        customer_name: userName || 'Test User',
      },
       order_meta: {
        return_url: returnUrl,
        notify_url: `${baseUrl}/api/payment-status`,
      },
      order_tags: {
        itemId: item.id,
        itemType: itemType,
        userId: userId,
      }
    };

    // 4. Create a PENDING payment record in Firestore
    const paymentRef = doc(adminFirestore, 'payments', orderId);
    await setDoc(paymentRef, {
        userId: userId,
        itemId: item.id,
        itemType: itemType,
        amount: Number(item.price),
        orderId: orderId,
        status: 'PENDING',
        createdAt: serverTimestamp(),
    });

    // 5. Make the API call to Cashfree's production server
    const response = await fetch("https://api.cashfree.com/pg/orders", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': process.env.CASHFREE_APP_ID!,
            'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
            'x-api-version': '2023-08-01',
        },
        body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    // 6. Handle the response from Cashfree
    if (!response.ok) {
        console.error('Cashfree API Error:', responseData);
        const errorMessage = responseData.message || 'Failed to create order with Cashfree';
        await setDoc(paymentRef, { status: 'FAILED', error: errorMessage }, { merge: true });
        return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    // 7. Send the successful payment session ID back to the client
    return NextResponse.json({
      payment_session_id: responseData.payment_session_id,
    });

  } catch (error: any) {
    console.error('Order creation API error:', error);
    return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}

