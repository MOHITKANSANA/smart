"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { collection, query, orderBy, doc, getDocs } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LoaderCircle, BookOpen, FileText, Lock, Unlock, Home, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Paper, Tab, PdfDocument, SubFolder } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import PaymentDialog from '@/components/payment-dialog';

const pdfGradients = [
    'dark:from-sky-900/70 dark:to-blue-900/70',
    'dark:from-fuchsia-900/70 dark:to-purple-900/70',
    'dark:from-emerald-900/70 dark:to-green-900/70',
    'dark:from-amber-900/70 dark:to-yellow-900/70',
    'dark:from-rose-900/70 dark:to-red-900/70',
    'dark:from-violet-900/70 dark:to-indigo-900/70',
];

function PdfItem({ pdf, index }: { pdf: PdfDocument; index: number }) {
    const router = useRouter();
    const isPaid = pdf.accessType === 'Paid';
    const [dialogOpen, setDialogOpen] = useState(false);
    
    const gradientClass = `bg-gradient-to-r ${pdfGradients[index % pdfGradients.length]}`;

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isPaid) {
            setDialogOpen(true);
        } else {
            router.push(`/ad-gateway?url=${encodeURIComponent(pdf.googleDriveLink)}`);
        }
    }

    return (
        <>
        <a href="#" onClick={handleClick} className="block">
          <div className={cn("flex items-center p-3 rounded-lg hover:shadow-md transition-all duration-200", gradientClass)}>
            <div className={cn("p-2 rounded-md mr-4", isPaid ? 'bg-amber-500/20' : 'bg-green-500/20')}>
              {isPaid 
                ? <Lock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                : <Unlock className="h-5 w-5 text-green-600 dark:text-green-400" />
              }
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">{pdf.name}</p>
              <p className="text-xs text-muted-foreground">{pdf.description}</p>
            </div>
          </div>
        </a>
        <PaymentDialog 
            isOpen={dialogOpen} 
            setIsOpen={setDialogOpen} 
            item={pdf}
            itemType="pdf"
        />
        </>
    )
}

function SubFolderItem({ subFolder, index }: { subFolder: SubFolder; index: number }) {
    const router = useRouter();
    const handleClick = () => {
        router.push(`/sub-folders/${subFolder.id}`);
    }

    const subFolderGradients = [
        'from-pink-500 to-rose-500',
        'from-amber-500 to-orange-500',
        'from-lime-500 to-green-500',
        'from-cyan-500 to-sky-500',
    ];

     return (
        <div
            className={cn(
                "w-full rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer p-4 flex items-center justify-between text-white",
                subFolderGradients[index % subFolderGradients.length]
            )}
            onClick={handleClick}
        >
            <div>
                <h3 className="font-headline text-lg font-bold">{subFolder.name}</h3>
            </div>
            <ChevronRight className="w-6 h-6" />
        </div>
    );
}


export default function PaperDetailPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const paperId = params.paperId as string;
    const openTabId = searchParams.get('tab');
    
    const paperRef = useMemoFirebase(() => doc(firestore, 'papers', paperId), [firestore, paperId]);
    const { data: paper, isLoading: isLoadingPaper } = useDoc<Paper>(paperRef);

    const topicsQuery = useMemoFirebase(() => query(collection(firestore, `papers/${paperId}/tabs`), orderBy('name')), [paperId, firestore]);
    const { data: topics, isLoading: isLoadingTopics } = useCollection<Tab>(topicsQuery);
    
    const [subFoldersByTopic, setSubFoldersByTopic] = useState<Record<string, SubFolder[]>>({});
    const [loadingSubFolders, setLoadingSubFolders] = useState<Record<string, boolean>>({});
    const [openAccordion, setOpenAccordion] = useState<string>(openTabId || '');

    const fetchSubFoldersForTopic = useCallback(async (topicId: string) => {
        if (!topicId || subFoldersByTopic[topicId]) return;
        setLoadingSubFolders(prev => ({...prev, [topicId]: true}));
        const subFoldersQuery = query(collection(firestore, `tabs/${topicId}/subFolders`), orderBy('createdAt'));
        const querySnapshot = await getDocs(subFoldersQuery);
        const subFolders = querySnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as SubFolder));
        setSubFoldersByTopic(prev => ({...prev, [topicId]: subFolders}));
        setLoadingSubFolders(prev => ({...prev, [topicId]: false}));
    }, [firestore, subFoldersByTopic]);

    useEffect(() => {
      if (openTabId) {
        setOpenAccordion(openTabId);
        fetchSubFoldersForTopic(openTabId);
      }
    }, [openTabId, fetchSubFoldersForTopic]);


    const handleAccordionChange = (value: string) => {
        if(value && !subFoldersByTopic[value]) {
            fetchSubFoldersForTopic(value);
        }
        setOpenAccordion(value);
    }
    
    const isLoading = isLoadingPaper || isLoadingTopics;

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center">
                    <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (!paper) {
        return (
             <AppLayout>
                <div className="flex flex-col h-full items-center justify-center text-center p-4">
                    <BookOpen className="w-16 h-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold">विषय नहीं मिला</h1>
                    <p className="text-muted-foreground">यह विषय मौजूद नहीं है या हटा दिया गया है।</p>
                    <Button onClick={() => router.push('/home')} className="mt-4">
                        <Home className="mr-2 h-4 w-4" /> होम पर वापस जाएं
                    </Button>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <main className="flex-1 flex flex-col p-4 sm:p-6">
                 <div className="flex items-center mb-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="font-headline text-2xl sm:text-3xl font-bold gradient-text">{paper.name}</h1>
                </div>
                <p className="text-muted-foreground mb-6">{paper.description}</p>
                
                {!topics || topics.length === 0 ? (
                     <p className="text-center text-muted-foreground p-8">इस विषय के लिए अभी कोई टॉपिक उपलब्ध नहीं है।</p>
                ) : (
                    <Accordion type="single" collapsible className="w-full space-y-4" value={openAccordion} onValueChange={handleAccordionChange}>
                       {topics.map((topic, index) => (
                           <AccordionItem key={topic.id} value={topic.id} className="border-b-0">
                             <Card className="overflow-hidden shadow-md border-0 transition-all duration-300 ease-in-out hover:shadow-xl">
                                 <AccordionTrigger className={cn("p-4 text-white text-left hover:no-underline bg-gradient-to-r from-purple-500 to-pink-600")}>
                                    <div className="flex-1">
                                        <h3 className="font-headline text-lg font-bold">{topic.name}</h3>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-2 bg-card">
                                   {loadingSubFolders[topic.id] ? <LoaderCircle className="mx-auto my-4 w-6 h-6 animate-spin" /> : 
                                    !subFoldersByTopic[topic.id] || subFoldersByTopic[topic.id].length === 0 ? (
                                        <p className="text-center text-muted-foreground p-4">इस टॉपिक में कोई सब-फोल्डर नहीं है।</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                                           {subFoldersByTopic[topic.id].map((sf, sfIndex) => <SubFolderItem key={sf.id} subFolder={sf} index={sfIndex} />)}
                                        </div>
                                    )
                                   }
                                </AccordionContent>
                             </Card>
                           </AccordionItem>
                       ))}
                    </Accordion>
                )}
            </main>
        </AppLayout>
    );
}
