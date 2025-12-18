"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { collection, query, where, orderBy, doc, getDoc, getDocs, DocumentData } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoaderCircle, FileText, Home, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Combo, PdfDocument } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';

const pdfGradients = [
    'dark:from-sky-900/70 dark:to-blue-900/70 from-sky-100 to-blue-100',
    'dark:from-fuchsia-900/70 dark:to-purple-900/70 from-fuchsia-100 to-purple-100',
    'dark:from-emerald-900/70 dark:to-green-900/70 from-emerald-100 to-green-100',
    'dark:from-amber-900/70 dark:to-yellow-900/70 from-amber-100 to-yellow-100',
    'dark:from-rose-900/70 dark:to-red-900/70 from-rose-100 to-red-100',
    'dark:from-violet-900/70 dark:to-indigo-900/70 from-violet-100 to-indigo-100',
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
          <div className={cn("flex items-center p-3 rounded-lg hover:shadow-md transition-all duration-200", gradientClass)}>
            <div className={cn("p-2 rounded-md mr-4", 'bg-green-500/20')}>
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">{pdf.name}</p>
              <p className="text-xs text-muted-foreground">{pdf.description}</p>
            </div>
          </div>
        </a>
    )
}

export default function ComboDetailPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const comboId = params.comboId as string;
    
    const comboRef = useMemoFirebase(() => doc(firestore, 'combos', comboId), [firestore, comboId]);
    const { data: combo, isLoading: isLoadingCombo } = useDoc<Combo>(comboRef);

    const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
    const [isLoadingPdfs, setIsLoadingPdfs] = useState(true);

    useEffect(() => {
        const fetchPdfs = async () => {
            if (!combo || !combo.pdfIds || combo.pdfIds.length === 0) {
                setIsLoadingPdfs(false);
                return;
            }

            setIsLoadingPdfs(true);
            const fetchedPdfs: PdfDocument[] = [];
            
            // This is a workaround. A better data structure would be a root-level `pdfs` collection.
            // With the current structure, we have to iterate a lot.
             const subFoldersSnapshot = await getDocs(collection(firestore, 'subFolders'));
            for (const subFolderDoc of subFoldersSnapshot.docs) {
                const pdfsSnapshot = await getDocs(collection(subFolderDoc.ref, 'pdfDocuments'));
                pdfsSnapshot.forEach(pdfDoc => {
                    if (combo.pdfIds.includes(pdfDoc.id)) {
                        const pdfData = { ...pdfDoc.data(), id: pdfDoc.id } as PdfDocument;
                         if(!fetchedPdfs.find(p => p.id === pdfData.id)) {
                           fetchedPdfs.push(pdfData);
                        }
                    }
                });
            }
            
            setPdfs(fetchedPdfs);
            setIsLoadingPdfs(false);
        };

        if (combo) {
            fetchPdfs();
        }
    }, [combo, firestore]);
    
    const isLoading = isLoadingCombo;

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center">
                    <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (!combo) {
        return (
             <AppLayout>
                <div className="flex flex-col h-full items-center justify-center text-center p-4">
                    <FileText className="w-16 h-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold">कॉम्बो नहीं मिला</h1>
                    <p className="text-muted-foreground">यह कॉम्बो मौजूद नहीं है या हटा दिया गया है।</p>
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
                    <h1 className="font-headline text-2xl sm:text-3xl font-bold gradient-text">{combo.name}</h1>
                </div>
                <p className="text-muted-foreground mb-6">{combo.description}</p>
                
                {isLoadingPdfs ? (
                    <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>
                ) : !pdfs || pdfs.length === 0 ? (
                     <p className="text-center text-muted-foreground p-8">इस कॉम्बो में अभी कोई PDF नहीं है।</p>
                ) : (
                   <div className="space-y-2">
                       {pdfs.map((pdf, pdfIndex) => <PdfItem key={pdf.id} pdf={pdf} index={pdfIndex} />)}
                   </div>
                )}
            </main>
        </AppLayout>
    );
}
