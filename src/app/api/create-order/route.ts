'use server';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, userPhone, userName, item, itemType } = await req.json();

    if (!userId || !item || !item.price) {
        return NextResponse.json({ error: 'User or item information is missing' }, { status: 400 });
    }

    const orderId = `order_${randomUUID()}`;
    
    // Using Cashfree's PRODUCTION endpoint
    const response = await fetch("https://api.cashfree.com/pg/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_APP_ID!,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
          "x-api-version": "2023-08-01",
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: item.price,
          order_currency: "INR",
          customer_details: {
            customer_id: userId,
            customer_email: userEmail,
            customer_phone: userPhone || "9999999999",
            customer_name: userName,
          },
          order_meta: {
            return_url: `https://studiopublicproxy-4x6y3j5qxq-uc.a.run.app/api/payment-status?order_id={order_id}`,
          },
          order_note: `Payment for ${item.name}`,
        }),
      });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Cashfree API Error');
    }
    
    // Store the pending payment in Firestore before sending the response to the client
    const { getFirestore: getAdminFirestore, Timestamp } = await import('firebase-admin/firestore');
    const { initializeApp, getApps } = await import('firebase-admin/app');

    // Check if the app is already initialized
    if (getApps().length === 0) {
        initializeApp();
    }
    
    const adminFirestore = getAdminFirestore();
    const paymentRef = adminFirestore.collection('payments').doc(orderId);
    await paymentRef.set({
        userId: userId,
        itemId: item.id,
        itemType: itemType,
        amount: item.price,
        orderId: orderId,
        status: 'PENDING',
        createdAt: Timestamp.now(),
    });


    return NextResponse.json({
        payment_session_id: data.payment_session_id,
    });

  } catch (error: any) {
    console.error('Cashfree order creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment session' }, { status: 500 });
  }
}
