
'use server';

import { NextRequest, NextResponse } from 'next/server';

// This is a proxy API to securely get payment status from the client-side
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
    return NextResponse.json({ error: 'Cashfree credentials are not configured on the server.' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.cashfree.com/pg/orders/${orderId}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'x-client-id': process.env.CASHFREE_APP_ID!,
            'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
            'x-api-version': '2023-08-01',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch order status from Cashfree.');
    }

    const orderDetails = await response.json();

    // Only return necessary details to the client
    return NextResponse.json({
        order_id: orderDetails.order_id,
        order_status: orderDetails.order_status,
        order_tags: orderDetails.order_tags,
    });

  } catch (error: any) {
    console.error("Get Payment Status API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
