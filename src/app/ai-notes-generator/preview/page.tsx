'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, AlertTriangle, LoaderCircle } from 'lucide-react';
import './notes-style.css';

export default function PreviewPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This code now runs only on the client side
    const storedNotes = sessionStorage.getItem('generatedNotes');
    const storedTopic = sessionStorage.getItem('notesTopic');
    
    if (storedNotes) {
      setNotes(marked(storedNotes) as string);
      setTopic(storedTopic || 'Generated Notes');
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <AppLayout>
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <LoaderCircle className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">नोट्स लोड हो रहे हैं...</p>
          </div>
      </AppLayout>
    );
  }

  if (!notes) {
      return (
        <AppLayout>
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                <h1 className="text-xl font-bold">नोट्स जेनरेट नहीं हुए</h1>
                <p className="text-muted-foreground mb-4">ऐसा लगता है कि कोई नोट्स नहीं बने या लोड नहीं हो पाए।</p>
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
            <Button variant="ghost" size="icon" onClick={() => router.push('/ai-notes-generator')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="font-headline text-2xl font-bold gradient-text">{topic}</h1>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-6 sm:p-8">
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
