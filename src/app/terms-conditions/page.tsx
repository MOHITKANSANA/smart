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
                <h2>1. Services Provided</h2>
                <p>
                    Services provided are digital in nature. This includes, but is not limited to, PDF documents, combos, and other digital course materials.
                </p>

                <h2>2. Access to Content</h2>
                <p>
                    Access is granted after successful payment for paid content. Free content is accessible as specified within the application.
                </p>

                <h2>3. User Accounts</h2>
                <p>
                    Users must not share login credentials. Each account is for a single user only. You are responsible for maintaining the confidentiality of your account and password.
                </p>

                <h2>4. Content Usage</h2>
                <p>
                    Misuse of content may result in account suspension. Prohibited activities include, but are not limited to, unauthorized distribution, reproduction, or commercial use of the content.
                </p>

                <h2>5. Updates to Policies</h2>
                <p>
                    Quickly Study reserves the right to update services and policies at any time. We will notify users of any significant changes, but it is the user's responsibility to review the terms periodically.
                </p>
                
                <h2>6. Disclaimer</h2>
                <p>
                    The content provided in this App is for educational purposes only. We do not guarantee the accuracy, completeness, or usefulness of any information in the App. We are not responsible for any errors or omissions, or for the results obtained from the use of this information.
                </p>

                <h2>7. Contact Us</h2>
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
