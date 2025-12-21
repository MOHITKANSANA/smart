
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
    const returnUrl = `https://studiopublicproxy-4x6y3j5qxq-uc.a.run.app/api/payment-status?order_id={order_id}`;

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
        return_url: returnUrl,
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
        throw new Error(responseData.message || 'Failed to create order with Cashfree');
    }
    
    // In a real application, you would save the pending payment to your database here.
    // This is commented out to focus on the payment gateway integration itself.
    /*
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
    */

    return NextResponse.json({
      payment_session_id: responseData.payment_session_id,
    });

  } catch (error: any) {
    console.error('Order creation API error:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
