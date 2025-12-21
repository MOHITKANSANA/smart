
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminFirestore: ReturnType<typeof getAdminFirestore> | null = null;

const initializeAdmin = () => {
    if (getApps().length === 0) {
        try {
            const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            if (serviceAccountKey) {
                const serviceAccount = JSON.parse(serviceAccountKey);
                adminApp = initializeApp({
                    credential: cert(serviceAccount)
                });
                adminFirestore = getAdminFirestore(adminApp);
            } else {
                 console.warn('[API Payment Status] FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
            }
        } catch (error: any) {
            console.error('[API Payment Status] Firebase Admin initialization error:', error.message);
        }
    } else {
        adminApp = getApps()[0];
        adminFirestore = getAdminFirestore(adminApp);
    }
};

initializeAdmin();

async function handleSuccessfulPayment(orderId: string, itemData: { userId: string, itemId: string, itemType: string, amount: number }) {
    if (!adminFirestore) {
        throw new Error('Firestore Admin is not initialized. Cannot process payment.');
    }
    const paymentRef = adminFirestore.collection('payments').doc(orderId);
    const paymentDoc = await paymentRef.get();

    // Prevent re-processing a successful payment
    if (paymentDoc.exists && paymentDoc.data()?.status === 'SUCCESS') {
        console.log(`Webhook: Order ${orderId} already processed as SUCCESS.`);
        return;
    }

    const { userId, itemId } = itemData;
    if (!userId || !itemId) {
        throw new Error(`Webhook: Missing userId or itemId in payment record for order ${orderId}`);
    }

    const userRef = adminFirestore.collection('users').doc(userId);
    const batch = adminFirestore.batch();
    
    // 1. Update or create payment document to SUCCESS
    batch.set(paymentRef, {
        ...itemData,
        id: orderId,
        status: 'SUCCESS',
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: paymentDoc.exists ? paymentDoc.data()?.createdAt : FieldValue.serverTimestamp()
    }, { merge: true });

    // 2. Add purchased item to the user's document
    batch.update(userRef, {
        purchasedItems: FieldValue.arrayUnion(itemId),
    });

    await batch.commit();
    console.log(`Webhook: Successfully processed payment for order ${orderId}. User ${userId} granted access to ${itemId}.`);
}

async function handleFailedPayment(orderId: string, failureReason: string | null) {
     if (!adminFirestore) {
        console.warn('Firestore Admin not initialized. Cannot mark payment as FAILED.');
        return;
    }
    const paymentRef = adminFirestore.collection('payments').doc(orderId);
    const paymentDoc = await paymentRef.get();

    // Only update if it's not already successful
    if (paymentDoc.exists && paymentDoc.data()?.status !== 'SUCCESS') {
        await paymentRef.update({
            status: 'FAILED',
            error: failureReason || 'Payment failed or was cancelled.',
            updatedAt: FieldValue.serverTimestamp(),
        });
         console.log(`Webhook: Marked payment as FAILED for order ${orderId}.`);
    }
}

// This is the server-to-server webhook from Cashfree
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body.data.order.order_id;
    const txStatus = body.data.payment.payment_status;

    if (!orderId || !txStatus) {
      console.error('Webhook: Missing required parameters from webhook:', { orderId, txStatus });
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { userId, itemId, itemType } = body.data.order.order_tags || {};
    const amount = body.data.order.order_amount;
    
    if(!userId || !itemId || !itemType) {
        console.error(`Webhook: Missing order tags in Cashfree webhook for ${orderId}.`);
        // Still return 200 to acknowledge webhook, but log the error.
        return NextResponse.json({ status: "ok", error: "Missing order tags" });
    }

    const itemData = { userId, itemId, itemType, amount };

    if (txStatus === 'SUCCESS') {
        await handleSuccessfulPayment(orderId, itemData);
    } else {
        await handleFailedPayment(orderId, body.data.payment.payment_message || 'Payment not successful');
    }

    // IMPORTANT: Always respond to the webhook with a 200 OK
    return NextResponse.json({ status: "ok" });
    
  } catch (error: any) {
    console.error('Webhook Error:', error);
    // Return 200 even on error to prevent Cashfree from retrying indefinitely,
    // but log the error for debugging.
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
