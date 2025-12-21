
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';

// Initialize Cashfree credentials. It's important to do this outside the request handler
// to avoid re-initializing on every call.
Cashfree.XClientId = process.env.CASHFREE_APP_ID!;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY!;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION; // Use PRODUCTION for live transactions
Cashfree.XApiVersion = "2023-08-01";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, userPhone, userName, item, itemType } = body;

    // Basic validation
    if (!item || !item.price || !item.name) {
      return NextResponse.json({ error: 'Item information (id, name, price) is missing' }, { status: 400 });
    }

    const orderId = `order_${Date.now()}`;
    const returnUrl = `https://studiopublicproxy-4x6y3j5qxq-uc.a.run.app/api/payment-status?order_id={order_id}`;

    const orderRequest = {
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

    // Make the API call to Cashfree
    const response = await Cashfree.PGCreateOrder(orderRequest);
    const orderData = response.data;
    
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
      payment_session_id: orderData.payment_session_id,
    });

  } catch (error: any) {
    // This is the crucial part. We now capture the detailed error from the SDK.
    console.error('Cashfree order creation API error:', error);
    // The error object from cashfree-pg often has a `response.data.message` field.
    const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred with Cashfree.';
    
    // Return the specific error message in the JSON response.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
