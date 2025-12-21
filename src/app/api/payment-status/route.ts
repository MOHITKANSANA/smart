
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

let adminApp: App | null = null;
let adminFirestore: ReturnType<typeof getAdminFirestore> | null = null;

try {
    if (!getApps().length) {
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
    } else {
        adminApp = getApps()[0];
        adminFirestore = getAdminFirestore(adminApp);
    }
} catch (error: any) {
    console.error('[API Payment Status] Firebase Admin initialization error:', error.message);
}


// Function to verify Cashfree signature
function verifySignature(orderId: string, txStatus: string, signature: string): boolean {
  if (!process.env.CASHFREE_SECRET_KEY) {
      console.error('Cashfree secret key is not configured.');
      return false;
  }
  const data = orderId + txStatus;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
    .update(data)
    .digest('base64');

  return signature === expectedSignature;
}

async function handleSuccessfulPayment(orderId: string, itemData: { userId: string, itemId: string, itemType: string, amount: number }) {
    if (!adminFirestore) {
        throw new Error('Firestore Admin is not initialized.');
    }
    const paymentRef = adminFirestore.collection('payments').doc(orderId);
    const paymentDoc = await paymentRef.get();

    // Prevent re-processing a successful payment
    if (paymentDoc.exists && paymentDoc.data()?.status === 'SUCCESS') {
        console.log(`Order ${orderId} already processed as SUCCESS.`);
        return;
    }

    const { userId, itemId } = itemData;
    
    if (!userId || !itemId) {
        throw new Error(`Missing userId or itemId in payment record for order ${orderId}`);
    }

    const userRef = adminFirestore.collection('users').doc(userId);
    const batch = adminFirestore.batch();
    
    // 1. Update payment document to SUCCESS
    batch.update(paymentRef, {
        status: 'SUCCESS',
        updatedAt: FieldValue.serverTimestamp(),
    });

    // 2. Add purchased item to the user's document
    batch.update(userRef, {
        purchasedItems: FieldValue.arrayUnion(itemId),
    });

    await batch.commit();

    console.log(`Successfully processed payment for order ${orderId}. User ${userId} granted access to ${itemId}.`);
}

async function handleFailedPayment(orderId: string, failureReason: string | null) {
     if (!adminFirestore) {
        throw new Error('Firestore Admin is not initialized.');
    }
    const paymentRef = adminFirestore.collection('payments').doc(orderId);
    const paymentDoc = await paymentRef.get();

    if (paymentDoc.exists && paymentDoc.data()?.status !== 'SUCCESS') {
        await paymentRef.update({
            status: 'FAILED',
            error: failureReason || 'Payment failed or was cancelled.',
            updatedAt: FieldValue.serverTimestamp(),
        });
         console.log(`Marked payment as FAILED for order ${orderId}.`);
    }
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    const orderId = body.get('order_id') as string;
    const txStatus = body.get('tx_status') as string;
    const signature = body.get('signature') as string;

    if (!orderId || !txStatus || !signature) {
      console.error('Missing required parameters from webhook:', { orderId, txStatus, signature });
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Since we don't have the order tags here, we need to fetch them from Cashfree
    const orderDetailsResponse = await fetch(`https://api.cashfree.com/pg/orders/${orderId}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'x-client-id': process.env.CASHFREE_APP_ID!,
            'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
            'x-api-version': '2023-08-01',
        },
    });

    if (!orderDetailsResponse.ok) {
        throw new Error(`Failed to fetch order details for ${orderId} from Cashfree.`);
    }

    const orderDetails = await orderDetailsResponse.json();
    const { userId, itemId, itemType } = orderDetails.order_tags || {};
    const amount = orderDetails.order_amount;
    
    if(!userId || !itemId || !itemType) {
        throw new Error(`Missing order tags in Cashfree order details for ${orderId}.`);
    }

    const itemData = { userId, itemId, itemType, amount };

    if (txStatus === 'SUCCESS') {
        await handleSuccessfulPayment(orderId, itemData);
    } else {
        await handleFailedPayment(orderId, body.get('error_details') as string | null);
    }

    // IMPORTANT: Always respond to the webhook with a 200 OK
    return NextResponse.json({ status: "ok" });
    
  } catch (error: any) {
    console.error('Error handling payment webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET handler is deprecated in favor of client-side handling but kept as a fallback.
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    if (!orderId) {
      return NextResponse.redirect(new URL('/home?payment=failed&reason=no_order_id', baseUrl));
    }
  
    // Redirect user to home page. Client-side logic will handle the status check.
    return NextResponse.redirect(new URL(`/home?order_id=${orderId}&payment_check=true`, baseUrl));
}
