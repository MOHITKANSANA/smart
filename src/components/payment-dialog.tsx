"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoaderCircle, ShoppingCart } from 'lucide-react';
import type { Combo, PdfDocument } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User as AppUser } from '@/lib/types';

interface PaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: Combo | PdfDocument;
  itemType: 'combo' | 'pdf';
}

declare global {
    interface Window {
        cashfree: any;
    }
}


export default function PaymentDialog({ isOpen, setIsOpen, item, itemType }: PaymentDialogProps) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: appUser } = useDoc<AppUser>(userDocRef);

    const handlePayment = async () => {
        setIsProcessing(true);

        if (typeof window === "undefined" || !window.cashfree) {
            toast({ variant: 'destructive', title: 'त्रुटि', description: 'कैशफ्री पेमेंट SDK लोड नहीं हुई। कृपया पेज को रीफ्रेश करें।' });
            setIsProcessing(false);
            return;
        }

        if (!user) {
            toast({ variant: 'destructive', title: 'त्रुटि', description: 'भुगतान करने से पहले कृपया लॉगिन करें।' });
            setIsProcessing(false);
            return;
        }

        try {
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    userName: appUser?.fullName || user.displayName || 'Guest User',
                    userEmail: user.email, // Always use the primary email from auth
                    userPhone: appUser?.mobileNumber || '9999999999', // Provide a fallback
                    item: { ...item, price: item.price || 0 },
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to create order from server.');
            }

            const { payment_session_id, order_id } = responseData;

            if (!payment_session_id || !order_id) {
                throw new Error('सर्वर से अमान्य भुगतान सत्र डेटा।');
            }

            // Create pending payment record in Firestore
            const paymentRef = doc(firestore, 'payments', order_id);
            await setDoc(paymentRef, {
                userId: user.uid,
                itemId: item.id,
                itemType: itemType,
                amount: item.price,
                orderId: order_id,
                status: 'PENDING',
                createdAt: serverTimestamp(),
            });

            // Redirect to Cashfree
            let cashfree = new window.cashfree.Cashfree(payment_session_id);
            cashfree.redirect();

        } catch (error: any) {
            console.error('Payment initiation error:', error);
            toast({ variant: 'destructive', title: 'भुगतान त्रुटि', description: `भुगतान सत्र बनाने में विफल: ${error.message}` });
            setIsProcessing(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit">
                        <ShoppingCart className="w-8 h-8 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">"{item.name}" खरीदें</DialogTitle>
                    <DialogDescription className="text-muted-foreground pt-2">
                        आप ₹{item.price} का भुगतान करने वाले हैं। जारी रखने के लिए नीचे दिए गए बटन पर क्लिक करें।
                    </DialogDescription>
                </DialogHeader>

                <div className="my-4 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">कुल भुगतान</p>
                    <p className="text-4xl font-bold">₹{item.price}</p>
                </div>
                
                <DialogFooter className="flex flex-col gap-2">
                    <Button onClick={handlePayment} disabled={isProcessing || isUserLoading} className="w-full h-12 text-lg">
                        {(isProcessing || isUserLoading) ? <LoaderCircle className="animate-spin" /> : `₹${item.price} का भुगतान करें`}
                    </Button>
                    <DialogClose asChild>
                        <Button variant="ghost" className="w-full">रद्द करें</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
