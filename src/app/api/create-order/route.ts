
'use server';

import { NextRequest, NextResponse } from 'next/server';

// This is the server-side API route that creates a payment order with Cashfree.
// It no longer interacts with Firestore to prevent server crashes related to firebase-admin initialization.
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
    
    const returnUrl = `https://pcsnote.netlify.app/api/payment-status`;

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
      },
      order_tags: {
        itemId: item.id,
        itemType: itemType,
        userId: userId,
      }
    };
    
    // 4. Make the API call to Cashfree's production server
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

    // 5. Handle the response from Cashfree
    if (!response.ok) {
        console.error('Cashfree API Error:', responseData);
        const errorMessage = responseData.message || 'Failed to create order with Cashfree';
        return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    // 6. Send the successful payment session ID and our orderId back to the client
    return NextResponse.json({
      payment_session_id: responseData.payment_session_id,
      order_id: orderId
    });

  } catch (error: any) {
    console.error('[API Create Order] Server Error:', error);
    return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}
