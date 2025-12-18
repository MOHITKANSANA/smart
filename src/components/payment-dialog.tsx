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
import { Info } from 'lucide-react';
import type { Combo, PdfDocument } from '@/lib/types';

interface PaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: Combo | PdfDocument;
  itemType: 'combo' | 'pdf';
}

export default function PaymentDialog({ isOpen, setIsOpen, item }: PaymentDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto bg-blue-900/20 p-3 rounded-full mb-4 border border-blue-500/50">
             <Info className="w-8 h-8 text-blue-400" />
          </div>
          <DialogTitle className="text-2xl font-bold">पेमेंट सुविधा जल्द ही आ रही है</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            अभी हम यहां पर पेमेंट स्वीकार नहीं कर सकते। हम जल्द ही रेजरपे पेमेंट गेटवे जोड़ेंगे।
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" className="w-full">ठीक है</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
