
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

let adminApp: App;

if (!getApps().length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            adminApp = initializeApp({
                credential: cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
} else {
    adminApp = getApps()[0];
}


const adminFirestore = adminApp ? getAdminFirestore(adminApp) : null;


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

    const { userId, itemId, itemType, amount } = itemData;
    
    if (!userId || !itemId) {
        throw new Error(`Missing userId or itemId in payment record for order ${orderId}`);
    }

    const userRef = adminFirestore.collection('users').doc(userId);
    const batch = adminFirestore.batch();
    
    // 1. Create or Update payment document to SUCCESS
    batch.set(paymentRef, {
        id: orderId,
        userId,
        itemId,
        itemType,
        amount,
        status: 'SUCCESS',
        createdAt: new Date(),
        updatedAt: new Date(),
    }, { merge: true });

    // 2. Add purchased item to the user's document
    batch.update(userRef, {
        purchasedItems: FieldValue.arrayUnion(itemId),
    });

    await batch.commit();

    console.log(`Successfully processed payment for order ${orderId}.`);
}

async function handleFailedPayment(orderId: string, failureReason: string | null, itemData: { userId: string, itemId: string, itemType: string, amount: number }) {
     if (!adminFirestore) {
        throw new Error('Firestore Admin is not initialized.');
    }
    const paymentRef = adminFirestore.collection('payments').doc(orderId);
    const paymentDoc = await paymentRef.get();

    if (paymentDoc.exists) {
        await paymentRef.update({
            status: 'FAILED',
            error: failureReason || 'Payment failed or was cancelled.',
            updatedAt: new Date(),
        });
    } else {
        // Create a new failed record if it doesn't exist
        await paymentRef.set({
            id: orderId,
            ...itemData,
            status: 'FAILED',
            error: failureReason || 'Payment failed or was cancelled.',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    console.log(`Marked payment as FAILED for order ${orderId}.`);
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
        await handleFailedPayment(orderId, body.get('error_details') as string | null, itemData);
    }

    // IMPORTANT: Always respond to the webhook with a 200 OK
    return NextResponse.json({ status: "ok" });
    
  } catch (error: any) {
    console.error('Error handling payment webhook:', error);
    // Respond with an error status but don't redirect
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    // This GET handler is now just for redirecting the user after they complete the payment.
    // The actual status update happens via the POST webhook.
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
  
    if (!orderId) {
      return NextResponse.redirect(new URL('/home?payment=failed&reason=no_order_id', req.url));
    }

    if (!adminFirestore) {
      console.error('Firestore Admin not initialized for GET request.');
      return NextResponse.redirect(new URL('/home?payment=failed&reason=server_error', req.url));
    }

    try {
        const paymentRef = adminFirestore.collection('payments').doc(orderId);
        const paymentDoc = await paymentRef.get();

        if (!paymentDoc.exists) {
             return NextResponse.redirect(new URL(`/home?payment=failed&reason=not_found&order_id=${orderId}`, req.url));
        }
        
        const paymentData = paymentDoc.data();
        if (!paymentData) {
            return NextResponse.redirect(new URL(`/home?payment=failed&reason=no_data&order_id=${orderId}`, req.url));
        }

        // Redirect based on the status found in Firestore, which was updated by the webhook.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
        if (paymentData.status === 'SUCCESS') {
            return NextResponse.redirect(new URL(`/home?payment=success&order_id=${orderId}`, baseUrl));
        } else {
            return NextResponse.redirect(new URL(`/home?payment=failed&reason=payment_not_confirmed&order_id=${orderId}`, baseUrl));
        }

    } catch (error) {
        console.error('Error handling payment status redirect:', error);
        return NextResponse.redirect(new URL(`/home?payment=failed&reason=server_error&order_id=${orderId}`, req.url));
    }
}
