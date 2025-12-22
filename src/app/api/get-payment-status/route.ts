
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// --- Firebase Admin Initialization ---
let adminApp: App | null = null;
let adminFirestore: ReturnType<typeof getAdminFirestore> | null = null;

const initializeAdmin = () => {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey && getApps().length === 0) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            adminApp = initializeApp({ credential: cert(serviceAccount) });
            adminFirestore = getAdminFirestore(adminApp);
        } catch (error: any) {
            console.error('[API Get Payment Status] Firebase Admin initialization error:', error.message);
        }
    } else if (getApps().length > 0) {
        adminApp = getApps()[0];
        adminFirestore = getAdminFirestore(adminApp);
    }
};

initializeAdmin();
// --- End of Firebase Admin Initialization ---

async function handleSuccessfulPayment(orderId: string, itemData: { userId: string, itemId: string }) {
    if (!adminFirestore) {
        throw new Error('Firestore Admin is not initialized. Cannot process payment.');
    }
    const { userId, itemId } = itemData;
    if (!userId || !itemId) {
        throw new Error(`Server Verification: Missing userId or itemId for order ${orderId}`);
    }
    
    const paymentRef = adminFirestore.collection('payments').doc(orderId);
    const userRef = adminFirestore.collection('users').doc(userId);
    
    const batch = adminFirestore.batch();
    
    batch.set(paymentRef, { status: 'SUCCESS', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.update(userRef, { purchasedItems: FieldValue.arrayUnion(itemId) });

    await batch.commit();
    console.log(`Server Verification: Successfully processed payment for order ${orderId}. User ${userId} granted access to ${itemId}.`);
}


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
    return NextResponse.json({ error: 'Cashfree credentials are not configured on the server.' }, { status: 500 });
  }
   if (!adminFirestore) {
    return NextResponse.json({ error: 'Server database connection is not configured.' }, { status: 500 });
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
    
    // --- Server-Side Logic to Update Database ---
    if (orderDetails.order_status === 'PAID') {
        const { userId, itemId } = orderDetails.order_tags || {};
        const paymentDoc = await adminFirestore.collection('payments').doc(orderId).get();

        // Only process if it's not already marked as SUCCESS
        if (!paymentDoc.exists() || paymentDoc.data()?.status !== 'SUCCESS') {
            await handleSuccessfulPayment(orderId, { userId, itemId });
        }
    }
    // --- End of Server-Side Logic ---

    // Return the final status to the client
    return NextResponse.json({
        status: orderDetails.order_status === 'PAID' ? 'SUCCESS' : 'FAILED',
        error: orderDetails.order_status !== 'PAID' ? 'Payment was not successful.' : null
    });

  } catch (error: any) {
    console.error("Get Payment Status API Error:", error);
    return NextResponse.json({ error: error.message, status: 'ERROR' }, { status: 500 });
  }
}
