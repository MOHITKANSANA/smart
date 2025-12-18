'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleDollarSign } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
                <div className="inline-block bg-primary/10 p-4 rounded-full mx-auto w-fit">
                    <CircleDollarSign className="w-8 h-8 text-primary" />
                </div>
              <CardTitle className="text-3xl font-headline gradient-text">Refund & Cancellation Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none text-muted-foreground text-center">
                <h2 className="text-xl font-bold text-foreground">NO REFUNDS POLICY</h2>
                <p>
                    All products and services offered by MPPSC & Civil Notes are digital.
                </p>
                <p>
                    Once payment is completed, <strong>no refunds will be provided</strong>.
                </p>
                <p>
                    No cancellations are permitted after course or content access is granted.
                </p>
                <p className="font-semibold">
                    Please read all details carefully before making a payment.
                </p>
                <p className="mt-6 text-sm">
                    By making a payment, you agree to this policy.
                </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}
