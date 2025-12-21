
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

let adminApp: App;

if (!getApps().length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            adminApp = initializeApp({
                credential: cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
} else {
    adminApp = getApps()[0];
}

const adminFirestore = adminApp ? getAdminFirestore(adminApp) : null;

// This is the server-side API route that creates a payment order with Cashfree.
export async function POST(req: NextRequest) {
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
    
    // Using a hardcoded production URL to satisfy Cashfree's validation requirements
    const returnUrl = `https://pcsnote.netlify.app/api/payment-status`;
    
    // 3. Create a pending payment record in Firestore (Safely)
    if (adminFirestore) {
        try {
            const paymentRef = adminFirestore.collection('payments').doc(orderId);
            await paymentRef.set({
                id: orderId,
                userId: userId,
                itemId: item.id,
                itemType: itemType,
                amount: item.price,
                status: 'PENDING',
                createdAt: new Date(),
            });
        } catch (dbError) {
            console.error("Firestore write error:", dbError);
            // Non-critical error, we can still proceed with payment creation.
            // The sync mechanism can be used later to reconcile.
        }
    } else {
        console.warn("Firestore Admin is not initialized. Skipping DB write for pending payment.");
    }


    // 4. Construct the request body for Cashfree API
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
      },
      order_tags: {
        itemId: item.id,
        itemType: itemType,
        userId: userId,
      }
    };
    
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
        // Update the payment record to FAILED
         if (adminFirestore) {
            await adminFirestore.collection('payments').doc(orderId).update({ status: 'FAILED', error: errorMessage, updatedAt: new Date() });
         }
        return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    // 7. Send the successful payment session ID and our orderId back to the client
    return NextResponse.json({
      payment_session_id: responseData.payment_session_id,
      order_id: orderId
    });

  } catch (error: any) {
    console.error('[API Create Order] Server Error:', error);
    return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}
