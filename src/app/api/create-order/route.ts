'use server';

import { NextRequest, NextResponse } from 'next/server';

// This is the server-side API route that creates a payment order with Cashfree.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, userPhone, userName, item, itemType } = body;

    // Validate essential item information
    if (!item || typeof item.price !== 'number' || !item.name) {
      return NextResponse.json({ error: 'Item information (id, name, price) is missing or invalid' }, { status: 400 });
    }
     if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment gateway credentials are not configured on the server.' }, { status: 500 });
    }


    const orderId = `order_${Date.now()}`;
    
    // The request body for Cashfree API
    const requestBody = {
      order_id: orderId,
      order_amount: Number(item.price),
      order_currency: "INR",
      order_note: `Payment for ${item.name}`,
      customer_details: {
        customer_id: userId || `user_test_${Date.now()}`,
        customer_email: userEmail || 'default-email@example.com',
        customer_phone: userPhone || "9999999999", // Default phone number as per Cashfree docs
        customer_name: userName || 'Test User',
      },
       order_meta: {
        // We handle the return URL on the client-side after payment for better UX.
        // No return_url needed here for this flow.
      },
    };

    // Making the API call to Cashfree's production server
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

    // If the response from Cashfree is not okay, forward the error
    if (!response.ok) {
        console.error('Cashfree API Error:', responseData);
        const errorMessage = responseData.message || 'Failed to create order with Cashfree';
        return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    return NextResponse.json({
      payment_session_id: responseData.payment_session_id,
    });

  } catch (error: any) {
    // Catch any other server-side errors
    console.error('Order creation API error:', error);
    return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}
