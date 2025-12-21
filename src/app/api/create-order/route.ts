'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';
import { randomUUID } from 'crypto';

Cashfree.XClientId = process.env.CASHFREE_APP_ID!;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY!;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX; // Changed to SANDBOX for testing

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, userPhone, userName, item } = await req.json();

    if (!userId || !item) {
        return NextResponse.json({ error: 'User or item information is missing' }, { status: 400 });
    }

    const orderId = `order_${randomUUID()}`;

    const request = {
      order_amount: item.price,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: userId,
        customer_email: userEmail,
        customer_phone: userPhone || "9999999999", // Fallback phone number
        customer_name: userName,
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment-status?order_id={order_id}`,
      },
      order_note: `Payment for ${item.name}`,
    };

    const response = await Cashfree.PGCreateOrder("2023-08-01", request);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Cashfree order creation error:', error);
    // Respond with a more structured error
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create payment session';
    return NextResponse.json({ error: errorMessage }, { status: error.response?.status || 500 });
  }
}
