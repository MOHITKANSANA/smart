
'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

function PDFViewer() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pdfUrl = searchParams.get('url');

    const getEmbedUrl = (url: string | null) => {
        if (!url) return null;
        try {
            // Standard Google Drive Link: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
            // We need to transform it to: https://drive.google.com/file/d/FILE_ID/preview
            const urlObject = new URL(url);
            const pathParts = urlObject.pathname.split('/');
            const fileIdIndex = pathParts.findIndex(part => part === 'd') + 1;

            if (fileIdIndex > 0 && pathParts[fileIdIndex]) {
                const fileId = pathParts[fileIdIndex];
                return `https://drive.google.com/file/d/${fileId}/preview`;
            }
            return null; // Invalid format
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
             <div className="flex items-center p-2 border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="font-headline text-lg font-bold ml-2">PDF Viewer</h1>
            </div>
            <iframe
                src={embedUrl}
                className="w-full h-full flex-1 border-0"
                allow="autoplay"
            ></iframe>
        </div>
    );
}


export default function ViewPdfPage() {
  return (
    <AppLayout>
      <main className="flex-1 flex flex-col">
          <Suspense fallback={<div className="flex h-full items-center justify-center">Loading PDF...</div>}>
            <PDFViewer />
          </Suspense>
      </main>
    </AppLayout>
  );
}
