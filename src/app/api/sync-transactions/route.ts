
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';

let adminApp: App;
if (!getApps().length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            adminApp = initializeApp({ credential: cert(serviceAccount) });
        }
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
} else {
    adminApp = getApps()[0];
}

const adminFirestore = adminApp ? getAdminFirestore(adminApp) : null;

async function fetchAllSuccessfulOrdersFromCashfree() {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30); // Last 30 days
    const from = fromDate.toISOString().split('T')[0];

    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 1);
    const to = toDate.toISOString().split('T')[0];
    
    let allPaidOrders: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;

    do {
        const url = new URL('https://api.cashfree.com/pg/orders');
        url.searchParams.append('from', from);
        url.searchParams.append('to', to);
        url.searchParams.append('count', '100');
        url.searchParams.append('order_status', 'PAID'); // Crucial fix: Specify the status

        if (nextCursor) {
            url.searchParams.append('cursor', nextCursor);
        }
        
        const response = await fetch(url.toString(), {
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
            console.error('Cashfree API Error while fetching orders:', errorData);
            throw new Error(`Failed to fetch orders from Cashfree: ${errorData.message}`);
        }
        
        const data = await response.json();
        
        // The API now only returns PAID orders, so no need to filter
        if(Array.isArray(data)) {
           allPaidOrders.push(...data);
        }

        // Check for next page using the 'x-next-cursor' header
        const cursorFromHeader = response.headers.get('x-next-cursor');
        if (cursorFromHeader) {
            nextCursor = cursorFromHeader;
            hasMore = true;
        } else {
            hasMore = false;
        }

    } while (hasMore);
    
    return allPaidOrders;
}


export async function POST(req: NextRequest) {
    try {
        if (!adminFirestore) {
            return NextResponse.json({ error: "Firestore Admin is not initialized." }, { status: 500 });
        }
        
        const successfulOrders = await fetchAllSuccessfulOrdersFromCashfree();
        const batch = adminFirestore.batch();
        let syncedCount = 0;

        for (const order of successfulOrders) {
            const orderId = order.order_id;
            const paymentRef = adminFirestore.collection('payments').doc(orderId);
            const paymentDoc = await paymentRef.get();
            
            // Only process if the payment is not already marked as SUCCESS
            if (!paymentDoc.exists || paymentDoc.data()?.status !== 'SUCCESS') {
                const { userId, itemId, itemType } = order.order_tags;

                if (!userId || !itemId || !itemType) {
                    console.warn(`Skipping order ${orderId} due to missing tags.`);
                    continue;
                }

                // 1. Create or update payment record
                batch.set(paymentRef, {
                    id: orderId,
                    userId: userId,
                    itemId: itemId,
                    itemType: itemType,
                    amount: order.order_amount,
                    status: 'SUCCESS',
                    createdAt: new Date(order.order_expiry_time), // Approximate time
                    updatedAt: new Date(),
                }, { merge: true });

                // 2. Grant access to the user
                const userRef = adminFirestore.collection('users').doc(userId);
                batch.update(userRef, {
                    purchasedItems: FieldValue.arrayUnion(itemId)
                });
                
                syncedCount++;
            }
        }

        if (syncedCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({ message: `Sync complete. ${syncedCount} new transactions processed.`, syncedCount });

    } catch (error: any) {
        console.error('Error during transaction sync:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
