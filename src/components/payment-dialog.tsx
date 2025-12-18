"use client";

import React from 'react';
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
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/firebase';
import type { Combo, PdfDocument } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: Combo | PdfDocument;
  itemType: 'combo' | 'pdf';
}

export default function PaymentDialog({ isOpen, setIsOpen, item, itemType }: PaymentDialogProps) {
  const router = useRouter();

  const handleAccess = () => {
    setIsOpen(false);
    if (itemType === 'pdf') {
      router.push(`/ad-gateway?url=${encodeURIComponent((item as PdfDocument).googleDriveLink)}`);
    } else {
      router.push(`/combos/${item.id}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4">
             <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">{item.name}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{item.description}</DialogDescription>
        </DialogHeader>

        <div className="my-4">
            <Card className="bg-green-900/20 border-green-500/50">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
                    <ShieldCheck className="w-6 h-6 text-green-400" />
                    <CardTitle className="text-green-300 text-lg">Payment Disclaimer</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm text-green-200/80">
                    <p>All payments are processed securely using Razorpay.</p>
                    <p className="mt-2">We do not store any card, UPI, or banking details on our servers.</p>
                </CardContent>
            </Card>
        </div>


        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={handleAccess} className="w-full h-12 text-lg">
              एक्सेस करें
          </Button>
          <DialogClose asChild>
            <Button variant="outline" className="w-full">रद्द करें</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
