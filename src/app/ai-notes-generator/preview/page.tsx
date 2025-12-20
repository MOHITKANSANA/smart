'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, ChevronLeft, LoaderCircle, AlertTriangle } from 'lucide-react';
import './notes-style.css';

export default function PreviewPage() {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedNotes = sessionStorage.getItem('generatedNotes');
    if (storedNotes) {
      // Use marked to convert markdown to HTML
      setNotes(marked(storedNotes) as string);
    } else {
        // If no notes are found, redirect back to generator
        router.replace('/ai-notes-generator');
    }
  }, [router]);

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);
    
    try {
        const canvas = await html2canvas(contentRef.current, {
            scale: 2, // Increase resolution for better quality
            useCORS: true,
            backgroundColor: null, // Use transparent background
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('ai-generated-notes.pdf');

    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        setIsDownloading(false);
    }
  };

  if (!notes) {
      return (
        <AppLayout>
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                <h1 className="text-xl font-bold">नोट्स नहीं मिले</h1>
                <p className="text-muted-foreground mb-4">ऐसा लगता है कि कोई नोट्स जेनरेट नहीं हुए हैं।</p>
                <Button onClick={() => router.push('/ai-notes-generator')}>
                    वापस जेनरेटर पर जाएं
                </Button>
            </div>
        </AppLayout>
      );
  }

  return (
    <AppLayout>
      <main className="flex-1 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="font-headline text-2xl font-bold gradient-text">जेनरेटेड नोट्स</h1>
          </div>
          <Button onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <LoaderCircle className="animate-spin mr-2" />
                डाउनलोड हो रहा है...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                PDF डाउनलोड करें
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {/* The ref is attached here for PDF generation */}
            <div ref={contentRef} className="p-6">
              {/* The generated HTML from markdown is rendered here */}
              <div
                className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none colorful-notes"
                dangerouslySetInnerHTML={{ __html: notes }}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
