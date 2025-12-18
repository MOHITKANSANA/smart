'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function TermsConditionsPage() {
  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
                <div className="inline-block bg-primary/10 p-4 rounded-full mx-auto w-fit">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
              <CardTitle className="text-3xl font-headline gradient-text">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none text-muted-foreground">
                <p><strong>Last Updated:</strong> 18 December 2025</p>

                <h2>1. Agreement to Terms</h2>
                <p>
                    By using the MPPSC & Civil Notes application ("App"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App.
                </p>

                <h2>2. Intellectual Property Rights</h2>
                <p>
                    Unless otherwise indicated, the App is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the App (collectively, the “Content”) and the trademarks, service marks, and logos contained therein (the “Marks”) are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.
                </p>

                <h2>3. User Representations</h2>
                <p>By using the App, you represent and warrant that:</p>
                <ul>
                    <li>All registration information you submit will be true, accurate, current, and complete.</li>
                    <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
                    <li>You have the legal capacity and you agree to comply with these Terms and Conditions.</li>
                </ul>

                <h2>4. Prohibited Activities</h2>
                <p>
                    You may not access or use the App for any purpose other than that for which we make the App available. The App may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
                </p>

                <h2>5. Payments and Refunds</h2>
                <p>
                    All payments are processed via Razorpay. We do not store any of your payment information. All purchases of digital content (PDFs, combos, etc.) are final and non-refundable. By completing a purchase, you acknowledge that you will lose your right to a refund once the content is accessed.
                </p>

                <h2>6. Disclaimer</h2>
                <p>
                    The content provided in this App is for educational purposes only. We do not guarantee the accuracy, completeness, or usefulness of any information in the App. We are not responsible for any errors or omissions, or for the results obtained from the use of this information.
                </p>

                <h2>7. Governing Law</h2>
                <p>
                    These Terms and Conditions and your use of the App are governed by and construed in accordance with the laws of India.
                </p>

                <h2>8. Contact Us</h2>
                <p>
                    In order to resolve a complaint regarding the App or to receive further information regarding use of the App, please contact us.
                </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}
