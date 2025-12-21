
'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
                <div className="inline-block bg-primary/10 p-4 rounded-full mx-auto mb-4 w-fit">
                    <FileText className="w-8 h-8 text-primary" />
                </div>
              <CardTitle className="text-3xl font-headline gradient-text">Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none text-muted-foreground">
              <p><strong>Last Updated:</strong> 18 December 2025</p>

              <h2>Introduction</h2>
              <p>
                Welcome to MPPSC & Civil Notes. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
              </p>

              <h2>Information We Collect</h2>
              <p>
                We may collect information about you in a variety of ways. The information we may collect via the Application includes:
              </p>
              <ul>
                <li>
                  <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, that you voluntarily give to us when you register with the Application.
                </li>
                <li>
                  <strong>Derivative Data:</strong> Information our servers automatically collect when you access the Application, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Application.
                </li>
              </ul>
              
              <h2>Use of Your Information</h2>
              <p>
                Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
              </p>
              <ul>
                <li>Create and manage your account.</li>
                <li>Email you regarding your account or order.</li>
                <li>Enable user-to-user communications.</li>
                <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Application.</li>
              </ul>

              <h2>Payment Processing</h2>
                <p>
                    All payments made for our services are processed through <strong>Cashfree</strong>, a third-party payment gateway. We do not collect, store, or have access to any of your sensitive financial information, such as credit card numbers, bank account details, or UPI IDs.
                </p>
                <p>
                    When you make a payment, you are redirected to Cashfree's secure platform. Any information you provide during the payment process is governed by Cashfree's own privacy policy and security measures. We strongly encourage you to review Cashfree's policies.
                </p>
                <p>
                    <strong>Our Commitment: We do not store any card, UPI, or banking details on our servers.</strong> Your financial security is paramount, and we rely on industry-standard secure payment processors to handle all transactions.
                </p>

              <h2>Security of Your Information</h2>
              <p>
                We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
              </p>

              <h2>Contact Us</h2>
              <p>
                If you have questions or comments about this Privacy Policy, please contact us.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}
