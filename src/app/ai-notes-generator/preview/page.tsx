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
import { useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { NoteStyleSettings } from '@/lib/types';

export default function PreviewPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [notes, setNotes] = useState('');
  const [topic, setTopic] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [styleSettings, setStyleSettings] = useState<NoteStyleSettings | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedNotes = sessionStorage.getItem('generatedNotes');
    const storedTopic = sessionStorage.getItem('notesTopic');
    if (storedNotes) {
      setNotes(marked(storedNotes) as string);
      setTopic(storedTopic || 'Generated Notes');
    } else {
        router.replace('/ai-notes-generator');
    }

    const fetchStyleSettings = async () => {
        const settingsRef = doc(firestore, 'settings', 'notesStyle');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            setStyleSettings(docSnap.data() as NoteStyleSettings);
        }
    };
    fetchStyleSettings();

  }, [router, firestore]);

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);
    
    try {
        const content = contentRef.current;
        
        // A4 page dimensions in pixels at 96 DPI: 794px x 1123px
        const a4Width = 794;
        
        // Temporarily set a fixed width for canvas rendering
        const originalWidth = content.style.width;
        content.style.width = `${a4Width}px`;

        const canvas = await html2canvas(content, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            windowWidth: a4Width,
        });

        // Restore original width
        content.style.width = originalWidth;

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // jsPDF A4 dimensions in points: 595.28 x 841.89
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4',
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Calculate the aspect ratio to fit the content on the PDF page
        const ratio = imgWidth / pdfWidth;
        const projectedHeight = imgHeight / ratio;
        
        let heightLeft = projectedHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, projectedHeight);
        heightLeft -= pdfHeight;

        // Add new pages if content is longer than one page
        while (heightLeft >= 0) {
            position = heightLeft - projectedHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, projectedHeight);
            heightLeft -= pdfHeight;
        }

        const safeTopicName = topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        pdf.save(`${safeTopicName}_notes.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        setIsDownloading(false);
    }
  };

  const dynamicStyles = styleSettings ? `
    :root {
        --notes-h1-color: ${styleSettings.h1Color};
        --notes-h2-color: ${styleSettings.h2Color};
        --notes-text-color: ${styleSettings.textColor};
        --notes-highlight-color: ${styleSettings.highlightColor};
    }
  ` : '';

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
      <style>{dynamicStyles}</style>
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
                A4 PDF डाउनलोड करें
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div ref={contentRef} className="p-6 sm:p-8">
              <div
                className="prose prose-sm sm:prose-base lg:prose-lg max-w-none colorful-notes"
                dangerouslySetInnerHTML={{ __html: notes }}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
