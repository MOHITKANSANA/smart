
"use client";

import React, { useState } from 'react';
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
import type { Combo, PdfDocument, User as AppUser } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Cashfree: any;
  }
}

const loadCashfree = () => {
  return new Promise((resolve) => {
    if (document.getElementById("cashfree-js")) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "cashfree-js";
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};


interface PaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: Combo | PdfDocument | { id: string, name: string, price: number };
  itemType: 'combo' | 'pdf' | 'test';
}

export default function PaymentDialog({ isOpen, setIsOpen, item, itemType }: PaymentDialogProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: appUser } = useDoc<AppUser>(userDocRef);

    const handlePayment = async () => {
        if (typeof window === "undefined") {
            return;
        }
        setIsProcessing(true);

        const loaded = await loadCashfree();
        if (!loaded) {
            toast({ variant: 'destructive', title: 'त्रुटि', description: 'पेमेंट गेटवे लोड नहीं हो सका। कृपया पृष्ठ को रीफ़्रेश करें।' });
            setIsProcessing(false);
            return;
        }

        if (!user) {
            toast({ variant: 'destructive', title: 'त्रुटि', description: 'कृपया भुगतान करने के लिए लॉगिन करें।' });
            setIsProcessing(false);
            return;
        }

        const orderId = `order_${Date.now()}`;
        const paymentRef = doc(firestore, "payments", orderId);

        try {
            // 1. Create a PENDING record in Firestore on the client-side
            await setDoc(paymentRef, {
                id: orderId,
                userId: user.uid,
                itemId: item.id,
                itemType: itemType,
                amount: item.price || 0,
                status: 'PENDING',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 2. Create order with the backend to get a session ID
            const res = await fetch("/api/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: orderId,
                    userId: user?.uid,
                    userName: appUser?.fullName || user?.email || 'Test User',
                    userEmail: user?.email || 'default-email@example.com',
                    userPhone: appUser?.mobileNumber || '9999999999',
                    item: { id: item.id, name: item.name, price: item.price || 0 },
                    itemType: itemType,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `सर्वर से ऑर्डर बनाने में विफल।`);
            }

            const data = await res.json();
            
            if (!data.payment_session_id) {
                throw new Error('सर्वर से भुगतान सत्र बनाने में विफल।');
            }

            // 4. Initiate Cashfree checkout
            const cashfree = new window.Cashfree({
                mode: "production" 
            });
            cashfree.checkout({
                paymentSessionId: data.payment_session_id,
            });
             setIsProcessing(false); // Enable button again after checkout is initiated

        } catch (error: any) {
            console.error("Payment Failed:", error.message);
            toast({
                variant: 'destructive',
                title: 'भुगतान में समस्या आई',
                description: error.message || 'एक अज्ञात त्रुटि हुई।',
            });
            // If something fails, update the record to FAILED
            await setDoc(paymentRef, { status: 'FAILED', error: error.message, updatedAt: serverTimestamp() }, { merge: true });
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
                    <Button 
                        onClick={handlePayment} 
                        disabled={isProcessing} 
                        className="w-full h-12 text-lg"
                    >
                        {isProcessing ? (
                            <LoaderCircle className="animate-spin" />
                        ) : (
                             `₹${item.price} का भुगतान करें`
                        )}
                    </Button>
                    <DialogClose asChild>
                        <Button variant="ghost" className="w-full">रद्द करें</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
