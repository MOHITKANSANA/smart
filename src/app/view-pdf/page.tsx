

'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

function PDFViewer() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pdfUrl = searchParams.get('url');

    const getEmbedUrl = (url: string | null) => {
        if (!url) return null;
        try {
            const urlObject = new URL(url);
            const pathParts = urlObject.pathname.split('/');
            const fileIdIndex = pathParts.findIndex(part => part === 'd') + 1;

            if (fileIdIndex > 0 && pathParts[fileIdIndex]) {
                const fileId = pathParts[fileIdIndex];
                return `https://drive.google.com/file/d/${fileId}/preview`;
            }
            return null;
        } catch (e) {
            console.error("Invalid URL for PDF viewer:", e);
            return null;
        }
    };

    const embedUrl = getEmbedUrl(pdfUrl);

    if (!embedUrl) {
        return (
             <div className="flex flex-col h-full flex-1 items-center justify-center text-center p-4">
                <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">PDF लोड करने में त्रुटि</h1>
                <p className="text-muted-foreground">दिया गया PDF लिंक अमान्य है।</p>
                <Button onClick={() => router.back()} className="mt-4">
                    <ChevronLeft className="mr-2 h-4 w-4" /> वापस जाएं
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full flex-1">
            <iframe
                src={embedUrl}
                className="w-full h-full flex-1 border-0"
                allow="autoplay"
            ></iframe>
        </div>
    );
}

export default function ViewPdfPage() {
  const router = useRouter();
  return (
    <main className="flex-1 flex flex-col h-screen bg-background">
        <div className="p-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>
        <Suspense fallback={<div className="flex h-full items-center justify-center">Loading PDF...</div>}>
        <PDFViewer />
        </Suspense>
    </main>
  );
}
