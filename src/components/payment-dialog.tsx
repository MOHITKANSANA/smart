
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
import { useCashfree } from '@/hooks/use-cashfree';

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
    const { isReady: isSdkReady } = useCashfree();

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: appUser } = useDoc<AppUser>(userDocRef);

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            console.log("Payment started for item:", item.name);

            if (!isSdkReady) {
                toast({ variant: 'destructive', title: 'त्रुटि', description: 'कैशफ्री SDK लोड नहीं हुई है, कृपया कुछ क्षण प्रतीक्षा करें।' });
                setIsProcessing(false);
                return;
            }

            const isTestPayment = itemType === 'test';
            
            if (!user && !isTestPayment) {
                toast({ variant: 'destructive', title: 'त्रुटि', description: 'उपयोगकर्ता लॉग इन नहीं है।' });
                setIsProcessing(false);
                return;
            }

            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: isTestPayment ? 'test_user_001' : user!.uid,
                    userName: isTestPayment ? 'Test User' : (appUser?.fullName || user?.email),
                    userEmail: isTestPayment ? 'test@example.com' : user!.email,
                    userPhone: appUser?.mobileNumber,
                    item: { id: item.id, name: item.name, price: item.price || 0 },
                    itemType: itemType,
                })
            });
            
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Server से order बनाने में विफल।');
            }

            const { payment_session_id } = responseData;

            if (!payment_session_id) {
                throw new Error('सर्वर से अमान्य भुगतान सत्र डेटा।');
            }

            const cashfree = new window.Cashfree(payment_session_id);

            cashfree.checkout({
                paymentSessionId: payment_session_id,
                redirectTarget: "_self",
            });

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
                    <Button 
                        onClick={handlePayment} 
                        disabled={isProcessing || !isSdkReady} 
                        className="w-full h-12 text-lg"
                    >
                        {isProcessing ? (
                            <LoaderCircle className="animate-spin" />
                        ) : !isSdkReady ? (
                             <>
                                <LoaderCircle className="animate-spin mr-2" />
                                SDK लोड हो रहा है...
                             </>
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

    