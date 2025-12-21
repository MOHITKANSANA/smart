
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, userPhone, userName, item, itemType } = body;

    if (itemType !== 'test' && (!userId || !item || !item.price)) {
        return NextResponse.json({ error: 'User or item information is missing' }, { status: 400 });
    }

    if(itemType === 'test' && !item.price) {
         return NextResponse.json({ error: 'Test item price is missing' }, { status: 400 });
    }
    
    // Use Production URL
    const cashfreeURL = "https://api.cashfree.com/pg/orders";

    const orderId = `order_${Date.now()}`;
    const returnUrl = `https://studiopublicproxy-4x6y3j5qxq-uc.a.run.app/api/payment-status?order_id={order_id}`;

    const requestBody = {
        order_id: orderId,
        order_amount: Number(item.price),
        order_currency: "INR",
        customer_details: {
            customer_id: userId || "user_test_001",
            customer_email: userEmail || 'default-email@example.com',
            customer_phone: userPhone || "9999999999",
            customer_name: userName || 'User',
        },
        order_meta: {
            return_url: returnUrl,
        },
        order_note: `Payment for ${item.name}`,
    };

    const response = await fetch(cashfreeURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-client-id": process.env.CASHFREE_APP_ID!,
            "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
            "x-api-version": "2023-08-01",
        },
        body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Cashfree API Error:", data);
        return NextResponse.json({ error: data?.message || "Failed to create order with Cashfree." }, { status: response.status });
    }
    
    if (itemType !== 'test') {
        const { getFirestore: getAdminFirestore, Timestamp } = await import('firebase-admin/firestore');
        const { initializeApp, getApps } = await import('firebase-admin/app');

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
        payment_session_id: data.payment_session_id,
    });

  } catch (error: any) {
    console.error('Cashfree order creation error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create payment session';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
