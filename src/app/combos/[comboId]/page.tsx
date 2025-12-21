
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { collection, query, where, orderBy, doc, getDoc, getDocs, DocumentData } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoaderCircle, FileText, Home, ChevronLeft, Lock, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Combo, PdfDocument, User as AppUser } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import PaymentDialog from '@/components/payment-dialog';

const pdfGradients = [
    'from-blue-600 to-indigo-700',
    'from-purple-600 to-pink-700',
    'from-green-600 to-teal-700',
    'from-amber-600 to-orange-700',
    'from-rose-600 to-red-700',
    'from-violet-600 to-purple-700',
];


function PdfItem({ pdf, index }: { pdf: DocumentData; index: number }) {
    const router = useRouter();
    const gradientClass = `bg-gradient-to-r ${pdfGradients[index % pdfGradients.length]}`;

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push(`/ad-gateway?url=${encodeURIComponent(pdf.googleDriveLink)}`);
    }

    return (
        <a href="#" onClick={handleClick} className="block">
          <div className={cn("flex items-center p-3 rounded-lg hover:shadow-md transition-all duration-200 text-white", gradientClass)}>
            <div className={cn("p-2 rounded-md mr-4", 'bg-white/20')}>
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{pdf.name}</p>
            </div>
          </div>
        </a>
    )
}

export default function ComboDetailPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const { user, isUserLoading } = useUser();
    const comboId = params.comboId as string;
    
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: appUser } = useDoc<AppUser>(userDocRef);

    const comboRef = useMemoFirebase(() => doc(firestore, 'combos', comboId), [firestore, comboId]);
    const { data: combo, isLoading: isLoadingCombo } = useDoc<Combo>(comboRef);

    const isDataLoading = isUserLoading || !appUser;

    const hasAccess = useMemo(() => {
        if (!combo || !appUser) return false;
        if (combo.accessType === 'Free') return true;
        return appUser.purchasedItems?.includes(combo.id) ?? false;
    }, [combo, appUser]);
    
    const isLoading = isLoadingCombo;

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center">
                    <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (!combo) {
        return (
             <AppLayout>
                <div className="flex flex-col h-full items-center justify-center text-center p-4">
                    <FileText className="w-16 h-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold">कॉम्बो नहीं मिला</h1>
                    <p className="text-muted-foreground">यह कॉम्बो मौजूद नहीं है या हटा दिया गया है।</p>
                    <Button onClick={() => router.push('/home')} className="mt-4">
                        <Home className="mr-2 h-4 w-4" /> होम पर वापस जाएं
                    </Button>
                </div>
            </AppLayout>
        )
    }

    const handleBuyNow = () => {
        setIsPaymentDialogOpen(true);
    }

    return (
        <AppLayout>
            <main className="flex-1 flex flex-col p-4 sm:p-6">
                 <div className="flex items-center mb-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="font-headline text-2xl sm:text-3xl font-bold gradient-text">{combo.name}</h1>
                </div>

                {combo.accessType === 'Paid' && !hasAccess && (
                    <Card className="mb-6 bg-yellow-500/10 border-yellow-500/50">
                        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-yellow-200">यह एक पेड कॉम्बो है</CardTitle>
                                <CardDescription className="text-yellow-300/80">इस कॉम्बो के सभी PDFs को एक्सेस करने के लिए अभी खरीदें।</CardDescription>
                            </div>
                            <Button onClick={handleBuyNow} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold shadow-lg w-full sm:w-auto" disabled={isDataLoading}>
                                {isDataLoading ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                )}
                                 अभी खरीदें ₹{combo.price}
                            </Button>
                        </CardContent>
                    </Card>
                )}
                
                {isLoading && (
                    <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>
                )}

                {hasAccess && (!combo.pdfDetails || combo.pdfDetails.length === 0) && (
                     <p className="text-center text-muted-foreground p-8">इस कॉम्बो में अभी कोई PDF नहीं है।</p>
                )}

                {hasAccess && combo.pdfDetails && (
                   <div className="space-y-2">
                       {combo.pdfDetails.map((pdf: DocumentData, pdfIndex: number) => <PdfItem key={pdf.id} pdf={pdf} index={pdfIndex} />)}
                   </div>
                )}
                
                {!hasAccess && combo.accessType === 'Paid' && (
                     <div className="text-center p-8 bg-muted/50 rounded-lg flex flex-col items-center">
                        <Lock className="w-12 h-12 text-muted-foreground mb-4"/>
                        <h2 className="text-xl font-bold">कंटेंट लॉक है</h2>
                        <p className="text-muted-foreground">इस कॉम्बो को खरीदने के बाद आपको यहां सभी PDFs दिखाई देंगे।</p>
                     </div>
                )}
            </main>
            {combo && (
                <PaymentDialog
                    isOpen={isPaymentDialogOpen}
                    setIsOpen={setIsPaymentDialogOpen}
                    item={combo}
                    itemType="combo"
                />
            )}
        </AppLayout>
    );
}
