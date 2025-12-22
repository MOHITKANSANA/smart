
'use server';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, userPhone, userName, item, itemType, orderId } = body;

    // 1. Validate essential information
    if (!item || typeof item.price !== 'number' || !item.name || !userId || !orderId) {
      return NextResponse.json({ error: 'Item, user, or orderId information is missing or invalid' }, { status: 400 });
    }
    
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_SECRET_KEY === 'YOUR_CASHFREE_SECRET_KEY_HERE') {
      console.error('Cashfree credentials are not configured on the server.');
      return NextResponse.json({ error: 'Payment gateway credentials are not configured.' }, { status: 500 });
    }
    
    // The return_url points to the home page. The client-side will handle verification.
    // Using the {order_id} placeholder as recommended by Cashfree for a stable URL.
    const returnUrl = "https://app.learnx.co.in/home?order_id={order_id}";

    // 2. Construct the request body for Cashfree API
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
        // The notify_url is for server-to-server webhooks
        notify_url: new URL('/api/payment-status', req.nextUrl.origin).toString(),
      },
      order_tags: {
        itemId: item.id,
        itemType: itemType,
        userId: userId,
      }
    };
    
    // 3. Make the API call to Cashfree's production server
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

    // 4. Handle the response from Cashfree
    if (!response.ok) {
        console.error('Cashfree API Error:', responseData);
        const errorMessage = responseData.message || 'Failed to create order with Cashfree';
        return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    // 5. Send the successful payment session ID back to the client
    return NextResponse.json({
      payment_session_id: responseData.payment_session_id,
    });

  } catch (error: any) {
    console.error('[API Create Order] Server Error:', error);
    return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}
