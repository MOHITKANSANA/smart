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
import { LoaderCircle } from 'lucide-react';

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">रद्द करें</Button>
          </DialogClose>
          <Button onClick={handleAccess}>
              एक्सेस करें
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
