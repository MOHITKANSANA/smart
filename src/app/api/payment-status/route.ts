'use server';

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getSdks } from '@/firebase'; // Assuming a server-compatible way to init admin
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
// This should be done only once.
if (!getApps().length) {
    initializeApp();
}
const adminFirestore = getAdminFirestore();


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.redirect(new URL('/home?payment=failed', req.url));
  }

  try {
    const paymentRef = doc(adminFirestore, 'payments', orderId);
    const paymentDoc = await getDoc(paymentRef);

    if (!paymentDoc.exists()) {
      console.error(`Payment document not found for orderId: ${orderId}`);
      return NextResponse.redirect(new URL('/home?payment=failed', req.url));
    }

    const paymentData = paymentDoc.data();
    const { userId, itemId } = paymentData;

    // Here you would typically verify the payment status with Cashfree's server-to-server API
    // For this example, we'll assume the redirect means the payment was successful.
    // In a real app, VERIFY the transaction status from your backend before marking as SUCCESS.
    const paymentStatus = 'SUCCESS';

    if (paymentStatus === 'SUCCESS') {
      // Update payment document
      await updateDoc(paymentRef, { status: 'SUCCESS' });

      // Add purchased item to the user's document
      const userRef = doc(adminFirestore, 'users', userId);
      await updateDoc(userRef, {
        purchasedItems: arrayUnion(itemId),
      });

      // Redirect to a success page
      return NextResponse.redirect(new URL(`/home?payment=success&item=${itemId}`, req.url));
    } else {
      // Update payment document
      await updateDoc(paymentRef, { status: 'FAILED' });
      // Redirect to a failure page
      return NextResponse.redirect(new URL('/home?payment=failed', req.url));
    }
  } catch (error) {
    console.error('Error handling payment status:', error);
    return NextResponse.redirect(new URL('/home?payment=failed', req.url));
  }
}
