'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';
import { randomUUID } from 'crypto';

// Initialize Cashfree with credentials from environment variables
// This ensures that the keys are not hardcoded and are secure.
Cashfree.XClientId = process.env.CASHFREE_APP_ID!;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY!;
// Force PRODUCTION environment because the provided keys are for production.
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;


export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, userPhone, userName, item } = await req.json();

    if (!userId || !item) {
        return NextResponse.json({ error: 'User or item information is missing' }, { status: 400 });
    }

    const orderId = `order_${randomUUID()}`;

    // IMPORTANT: The return_url must be a publicly accessible HTTPS URL.
    // The development URL from cloud workstations is often not accepted by payment gateways.
    // We are forcing a public proxy URL for development/testing purposes.
    // In a real production deployment, this should be replaced by the actual app's domain.
    const returnUrl = `https://studiopublicproxy-4x6y3j5qxq-uc.a.run.app/api/payment-status?order_id={order_id}`;

    const request = {
      order_amount: item.price,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: userId,
        customer_email: userEmail,
        customer_phone: userPhone || "9999999999", // Fallback phone number as it's required
        customer_name: userName,
      },
      order_meta: {
        return_url: returnUrl,
      },
      order_note: `Payment for ${item.name}`,
    };

    // The '2023-08-01' is the API version required by Cashfree SDK
    const response = await Cashfree.PGCreateOrder("2023-08-01", request);
    
    // Successfully created order, send back session ID to client
    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error('Cashfree order creation error:', error);
    
    // Provide a more structured error response
    // The error from Cashfree SDK might be in `error.response.data`
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create payment session';
    const statusCode = error.response?.status || 500;

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
