
'use server';

import { NextRequest, NextResponse } from 'next/server';

// This function now acts as a proxy to the Cashfree API.
// The client-side will call this, and this will call Cashfree.
// This is to protect the API keys.
export async function POST(req: NextRequest) {
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
        return NextResponse.json({ error: 'Cashfree credentials are not configured on the server.' }, { status: 500 });
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30); // Last 30 days
    const from = fromDate.toISOString().split('T')[0];

    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 1);
    const to = toDate.toISOString().split('T')[0];
    
    try {
        let allPaidOrders: any[] = [];
        let nextCursor: string | null = null;
        let hasMore = true;

        do {
            const url = new URL('https://api.cashfree.com/pg/orders');
            url.searchParams.append('from', from);
            url.searchParams.append('to', to);
            url.searchParams.append('count', '100');
            url.searchParams.append('order_status', 'PAID'); 

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
                throw new Error(`Failed to fetch orders from Cashfree: ${errorData.message || 'Unknown API error'}`);
            }
            
            const data = await response.json();
            
            if(Array.isArray(data)) {
            allPaidOrders.push(...data);
            }

            const cursorFromHeader = response.headers.get('x-next-cursor');
            if (cursorFromHeader) {
                nextCursor = cursorFromHeader;
                hasMore = true;
            } else {
                hasMore = false;
            }

        } while (hasMore);
        
        return NextResponse.json({ successfulOrders: allPaidOrders });

    } catch(error: any) {
        console.error("Sync API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
