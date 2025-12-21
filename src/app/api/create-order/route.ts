'use server';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, userPhone, userName, item, itemType } = body;

    // Basic validation
    if (!item || typeof item.price !== 'number' || !item.name) {
      return NextResponse.json({ error: 'Item information (id, name, price) is missing or invalid' }, { status: 400 });
    }

    const orderId = `order_${Date.now()}`;
    // The return_url is now managed by Cashfree's redirect. We handle status on the client.
    // However, if you need server-to-server webhook verification, you'd set that up in the Cashfree dashboard.
    
    const requestBody = {
      order_id: orderId,
      order_amount: Number(item.price),
      order_currency: "INR",
      order_note: `Payment for ${item.name}`,
      customer_details: {
        customer_id: userId || `user_${Date.now()}`,
        customer_email: userEmail || 'default-email@example.com',
        customer_phone: userPhone || "9999999999",
        customer_name: userName || 'User',
      },
       order_meta: {
        // No return_url here for standard checkout, it's handled client-side.
        // If you were using seamless, you would provide it.
      },
    };

    // Make the API call to Cashfree using fetch
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

    if (!response.ok) {
        console.error('Cashfree API Error:', responseData);
        // Forward the specific error from Cashfree to the client
        return NextResponse.json({ error: responseData.message || 'Failed to create order with Cashfree' }, { status: response.status });
    }
    
    // In a real application with server-side payment verification, you would save this pending payment.
    // For now, it's handled on the client.

    return NextResponse.json({
      payment_session_id: responseData.payment_session_id,
    });

  } catch (error: any) {
    console.error('Order creation API error:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
