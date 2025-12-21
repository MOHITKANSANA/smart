
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, ChevronLeft, AlertTriangle, BookMarked } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Tutorials } from '@/lib/types';
import '../ai-notes-generator/preview/notes-style.css';


export default function TutorialsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  
  const tutorialRef = useMemoFirebase(() => doc(firestore, 'settings', 'tutorials'), [firestore]);
  const { data: tutorial, isLoading } = useDoc<Tutorials>(tutorialRef);

  const renderedHtml = tutorial?.content ? marked(tutorial.content) as string : '';
  
  return (
    <AppLayout>
      <main className="flex-1 p-4 sm:p-6">
         <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold gradient-text flex items-center gap-2"><BookMarked /> इम्पोर्टेन्ट ट्यूटोरियल</h1>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-0">
             {isLoading && (
                 <div className="flex items-center justify-center p-20">
                     <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
                 </div>
             )}
             {!isLoading && (!tutorial || !tutorial.content) && (
                 <div className="flex flex-col items-center justify-center p-20 text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                    <h2 className="text-xl font-bold">कोई ट्यूटोरियल उपलब्ध नहीं है</h2>
                    <p className="text-muted-foreground">एडमिन ने अभी तक कोई ट्यूटोरियल नहीं जोड़ा है।</p>
                 </div>
             )}
            {renderedHtml && (
                <div className="p-6 sm:p-8">
                  <div
                    className="prose prose-sm sm:prose-base lg:prose-lg max-w-none colorful-notes dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}

