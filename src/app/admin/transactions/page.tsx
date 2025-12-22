
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle, ChevronLeft } from "lucide-react";
import type { Payment, User, Combo, PdfDocument } from "@/lib/types";

function getStatusVariant(status: 'PENDING' | 'SUCCESS' | 'FAILED') {
    switch (status) {
        case 'SUCCESS': return 'default';
        case 'FAILED': return 'destructive';
        case 'PENDING': return 'secondary';
        default: return 'outline';
    }
}

interface EnrichedPayment extends Payment {
  userName?: string;
  userEmail?: string;
  itemName?: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  
  const [enrichedPayments, setEnrichedPayments] = useState<EnrichedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Fetch all necessary data in parallel
        const paymentsQuery = query(collection(firestore, "payments"), orderBy("createdAt", "desc"));
        const usersQuery = collection(firestore, "users");
        
        const [paymentsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(paymentsQuery),
          getDocs(usersQuery),
        ]);

        const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const usersMap = new Map(users.map(u => [u.id, u]));

        // We also need all combos and pdfs to get their names
        const combosSnapshot = await getDocs(collection(firestore, "combos"));
        const combos = combosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Combo));
        const itemsMap = new Map<string, { name: string }>(combos.map(c => [c.id, { name: c.name }]));

        // This is complex: fetching all PDFs from all sub-folders.
        // For simplicity in this context, we will try to fetch them. In a real large-scale app, this should be optimized.
        const papersSnapshot = await getDocs(collection(firestore, "papers"));
        for (const paperDoc of papersSnapshot.docs) {
          const tabsSnapshot = await getDocs(collection(paperDoc.ref, "tabs"));
          for (const tabDoc of tabsSnapshot.docs) {
            const subFoldersSnapshot = await getDocs(collection(tabDoc.ref, "subFolders"));
            for (const subFolderDoc of subFoldersSnapshot.docs) {
              const pdfsSnapshot = await getDocs(collection(subFolderDoc.ref, "pdfDocuments"));
              pdfsSnapshot.forEach(pdfDoc => {
                const pdfData = pdfDoc.data() as PdfDocument;
                itemsMap.set(pdfDoc.id, { name: pdfData.name });
              });
            }
          }
        }
        
        // Enrich payment data
        const enriched = payments.map(p => {
          const user = usersMap.get(p.userId);
          const item = itemsMap.get(p.itemId);
          return {
            ...p,
            userName: user?.fullName || 'अज्ञात',
            userEmail: user?.email || 'कोई ईमेल नहीं',
            itemName: item?.name || 'आइटम नहीं मिला',
          };
        });

        setEnrichedPayments(enriched);
      } catch (e) {
        console.error("Error fetching transactions data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [firestore]);


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
                      <TableHead className="min-w-[200px]">यूज़र</TableHead>
                      <TableHead className="min-w-[150px]">आइटम</TableHead>
                      <TableHead>राशि</TableHead>
                      <TableHead>स्टेटस</TableHead>
                      <TableHead className="min-w-[180px]">तारीख</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedPayments && enrichedPayments.length > 0 ? enrichedPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                            <div className="font-medium break-words">{p.userName}</div>
                            <div className="text-xs text-muted-foreground break-all">{p.userEmail}</div>
                        </TableCell>
                        <TableCell className="break-words">{p.itemName}</TableCell>
                        <TableCell>₹{p.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(p.status)}>{p.status}</Badge>
                        </TableCell>
                        <TableCell>{p.createdAt?.toDate().toLocaleString() ?? 'N/A'}</TableCell>
                      </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
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
