"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { LoaderCircle, Folder, Home, ChevronLeft, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubFolder, PdfDocument } from '@/lib/types';
import { Button } from '@/components/ui/button';

const pdfGradients = [
    'from-blue-600 to-indigo-700',
    'from-purple-600 to-pink-700',
    'from-green-600 to-teal-700',
    'from-amber-600 to-orange-700',
    'from-rose-600 to-red-700',
    'from-violet-600 to-purple-700',
];

function PdfItem({ pdf, index }: { pdf: PdfDocument; index: number }) {
    const router = useRouter();
    const gradientClass = `bg-gradient-to-r ${pdfGradients[index % pdfGradients.length]}`;

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push(`/ad-gateway?url=${encodeURIComponent(pdf.googleDriveLink)}`);
    }

    return (
        <a href="#" onClick={handleClick} className="block">
          <div className={cn("flex items-center p-3 rounded-lg hover:shadow-md transition-all duration-200 text-white", gradientClass)}>
            <div className={cn("p-2 rounded-md mr-4", 'bg-white/20')}>
                <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{pdf.name}</p>
              <p className="text-xs text-white/80">{pdf.description}</p>
            </div>
          </div>
        </a>
    )
}

function SubFolderDetailContent() {
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const subFolderId = params.subFolderId as string;
    const tabId = searchParams.get('tabId');
    
    const subFolderRef = useMemoFirebase(() => {
        if (!tabId || !subFolderId) return null;
        return doc(firestore, `tabs/${tabId}/subFolders`, subFolderId);
    }, [firestore, tabId, subFolderId]);
    
    const { data: subFolder, isLoading: isLoadingSubFolder } = useDoc<SubFolder>(subFolderRef);

    const pdfsQuery = useMemoFirebase(() => 
        query(collection(firestore, `subFolders/${subFolderId}/pdfDocuments`), orderBy('createdAt')), 
        [firestore, subFolderId]
    );
    const { data: pdfs, isLoading: isLoadingPdfs } = useCollection<PdfDocument>(pdfsQuery);
    
    const isLoading = isLoadingSubFolder || isLoadingPdfs;

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center">
                    <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (!subFolder) {
        return (
             <AppLayout>
                <div className="flex flex-col h-full items-center justify-center text-center p-4">
                    <Folder className="w-16 h-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold">सब-फोल्डर नहीं मिला</h1>
                    <p className="text-muted-foreground">यह सब-फोल्डर मौजूद नहीं है या हटा दिया गया है।</p>
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
                 <div className="flex items-center mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="font-headline text-2xl sm:text-3xl font-bold gradient-text">{subFolder.name}</h1>
                </div>
                
                {!pdfs || pdfs.length === 0 ? (
                     <p className="text-center text-muted-foreground p-8">इस फोल्डर में अभी कोई PDF नहीं है।</p>
                ) : (
                    <div className="space-y-2">
                       {pdfs.map((pdf, index) => <PdfItem key={pdf.id} pdf={pdf} index={index} />)}
                    </div>
                )}
            </main>
        </AppLayout>
    );
}

export default function SubFolderDetailPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><LoaderCircle className="w-10 h-10 animate-spin text-primary" /></div>}>
            <SubFolderDetailContent />
        </Suspense>
    );
}
