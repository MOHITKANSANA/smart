
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
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User as AppUser } from '@/lib/types';

interface PaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: Combo | PdfDocument | { id: string, name: string, price: number };
  itemType: 'combo' | 'pdf' | 'test';
}

declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function PaymentDialog({ isOpen, setIsOpen, item, itemType }: PaymentDialogProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: appUser } = useDoc<AppUser>(userDocRef);

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            console.log("Payment started");

            if (!user && itemType !== 'test') {
              throw new Error("भुगतान के लिए आपको लॉग इन करना होगा।");
            }
            
            const res = await fetch("/api/create-order", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  userId: user?.uid || 'test_user_001',
                  userName: appUser?.fullName || user?.email || 'Test User',
                  userEmail: user?.email || 'test@example.com',
                  userPhone: appUser?.mobileNumber,
                  item: { id: item.id, name: item.name, price: item.price || 0 },
                  itemType: itemType,
              }),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error("Server Error: " + (errText || "Order create failed"));
            }

            const data = await res.json();
            console.log("Server response:", data);
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.payment_session_id) {
                throw new Error("सर्वर से payment_session_id नहीं मिला।");
            }
    
            if (typeof window === "undefined" || !window.Cashfree) {
                throw new Error("Cashfree SDK लोड नहीं हुई। कृपया पेज रीफ्रेश करें।");
            }
    
            const cashfree = new window.Cashfree({
                mode: "PROD", 
            });
    
            cashfree.checkout({
                paymentSessionId: data.payment_session_id,
                redirectTarget: "_self",
            });
    
        } catch (error: any) {
            console.error("Payment Failed:", error.message);
            toast({
                variant: 'destructive',
                title: 'भुगतान में समस्या आई',
                description: error.message,
            });
        } finally {
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
