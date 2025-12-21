
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';

Cashfree.XClientId = process.env.CASHFREE_APP_ID!;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY!;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;
Cashfree.XApiVersion = "2023-08-01";

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, userPhone, userName, item, itemType } = await req.json();

    if (!userId || !item || !item.price) {
        return NextResponse.json({ error: 'User or item information is missing' }, { status: 400 });
    }

    const orderId = `order_${Date.now()}`;
    const returnUrl = `https://studiopublicproxy-4x6y3j5qxq-uc.a.run.app/api/payment-status?order_id={order_id}`;

    const orderRequest = {
        order_id: orderId,
        order_amount: item.price,
        order_currency: "INR",
        customer_details: {
            customer_id: userId,
            customer_email: userEmail || 'default-email@example.com',
            customer_phone: userPhone || "9999999999",
            customer_name: userName || 'User',
        },
        order_meta: {
            return_url: returnUrl,
        },
        order_note: `Payment for ${item.name}`,
    };

    const response = await Cashfree.PGCreateOrder(orderRequest);
    const orderData = response.data;
    
    if (itemType !== 'test') {
        const { getFirestore: getAdminFirestore, Timestamp } = await import('firebase-admin/firestore');
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');

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
    }

    return NextResponse.json({
        payment_session_id: orderData.payment_session_id,
    });

  } catch (error: any) {
    console.error('Cashfree order creation error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create payment session';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
