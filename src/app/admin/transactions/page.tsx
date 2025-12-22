
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Payment } from "@/lib/types";

function getStatusVariant(status: 'PENDING' | 'SUCCESS' | 'FAILED') {
    switch (status) {
        case 'SUCCESS': return 'default';
        case 'FAILED': return 'destructive';
        case 'PENDING': return 'secondary';
        default: return 'outline';
    }
}

export default function TransactionsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  
  const paymentsQuery = useMemoFirebase(() => query(collection(firestore, "payments"), orderBy("createdAt", "desc")), [firestore]);
  const { data: payments, isLoading } = useCollection<Payment>(paymentsQuery);

  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2">ट्रांजेक्शन हिस्ट्री</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>सभी ट्रांजेक्शन</CardTitle>
            <CardDescription>यहाँ सभी सफल, विफल और लंबित भुगतानों की सूची दी गई है।</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8"><LoaderCircle className="animate-spin h-8 w-8"/></div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Order ID</TableHead>
                      <TableHead className="min-w-[200px]">User ID</TableHead>
                      <TableHead className="min-w-[150px]">Item ID</TableHead>
                      <TableHead>राशि</TableHead>
                      <TableHead>स्टेटस</TableHead>
                      <TableHead className="min-w-[180px]">तारीख</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments && payments.length > 0 ? payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs break-all">{p.id}</TableCell>
                        <TableCell className="font-mono text-xs break-all">{p.userId}</TableCell>
                        <TableCell className="font-mono text-xs break-all">{p.itemId}</TableCell>
                        <TableCell>₹{p.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(p.status)}>{p.status}</Badge>
                        </TableCell>
                        <TableCell>{p.createdAt?.toDate().toLocaleString() ?? 'N/A'}</TableCell>
                      </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                कोई ट्रांजेक्शन नहीं मिला।
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
