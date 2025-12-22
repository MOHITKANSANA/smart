
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlayCircle, Shield, Hourglass, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const AD_COUNTDOWN_SECONDS = 5;

const AdGatewayPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pdfUrl = searchParams.get('url');

    const [countdown, setCountdown] = useState(AD_COUNTDOWN_SECONDS);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!pdfUrl) {
            return;
        }

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsReady(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [pdfUrl]);

    const handleProceedToPdf = () => {
        if (pdfUrl) {
            // Redirect to the in-app PDF viewer page, now using the public domain
            const viewPdfUrl = `https://pcsnote.netlify.app/view-pdf?url=${encodeURIComponent(pdfUrl)}`;
            router.push(viewPdfUrl);
        }
    };
    
    if (!pdfUrl) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
                <Shield className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">अमान्य लिंक</h1>
                <p className="text-muted-foreground">PDF का लिंक नहीं मिला। कृपया वापस जाएं।</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-lg shadow-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white border-white/20">
                <CardHeader className="text-center">
                     <div className="flex justify-center mb-4"><PlayCircle className="w-16 h-16 text-primary animate-pulse" /></div>
                    <CardTitle className="text-3xl font-headline">आपका कंटेंट लोड हो रहा है</CardTitle>
                    <CardDescription className="text-white/70">
                        जारी रखने से पहले एक छोटा विज्ञापन दिखाया जाएगा।
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    <div className="p-4 rounded-lg bg-black/30 flex items-center justify-center space-x-4">
                        <Hourglass className="w-8 h-8 text-yellow-400" />
                        <div className="text-left">
                            <p className="font-semibold">विज्ञापन समाप्त होगा:</p>
                            <p className="text-2xl font-bold text-yellow-400">{countdown} सेकंड में</p>
                        </div>
                    </div>

                    <Button 
                        onClick={handleProceedToPdf}
                        disabled={!isReady}
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-teal-400 hover:from-green-600 hover:to-teal-500 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed transition-all"
                    >
                        {isReady ? (
                            'PDF पर जाएं'
                        ) : (
                            <>
                             <LoaderCircle className="animate-spin mr-2" />
                             कृपया प्रतीक्षा करें...
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-white/50">यह एक डेमो विज्ञापन है। भविष्य में यहां असली विज्ञापन दिखाए जाएंगे।</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AdGatewayClient() {
    // Use Suspense to handle the initial rendering before searchParams are available
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <AdGatewayPageContent />
        </React.Suspense>
    );
}
