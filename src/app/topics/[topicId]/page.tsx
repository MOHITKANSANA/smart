
"use client";

import React from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { LoaderCircle, Folder, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tab, SubFolder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import Link from 'next/link';

const subFolderGradients = [
    'from-pink-600 to-rose-700',
    'from-amber-600 to-orange-700',
    'from-lime-600 to-green-700',
    'from-cyan-600 to-sky-700',
    'from-violet-600 to-purple-700',
    'from-fuchsia-600 to-pink-700',
];

function SubFolderItem({ subFolder, index }: { subFolder: SubFolder; index: number }) {
    const router = useRouter();
    
    // Construct the correct href for the Link component
    const href = `/sub-folders/${subFolder.id}?paperId=${subFolder.paperId}&tabId=${subFolder.tabId}`;

     return (
        <Link href={href} passHref>
            <div
                className={cn(
                    "w-full rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer p-4 flex items-center justify-between text-white bg-gradient-to-r",
                    subFolderGradients[index % subFolderGradients.length]
                )}
            >
                <h3 className="font-headline text-lg font-bold">{subFolder.name}</h3>
                <ChevronRight className="w-6 h-6" />
            </div>
        </Link>
    );
}


function TopicDetailContent() {
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const topicId = params.topicId as string;
    const paperId = searchParams.get('paperId');
    
    const topicRef = useMemoFirebase(() => {
        if (!paperId || !topicId) return null;
        return doc(firestore, `papers/${paperId}/tabs`, topicId);
    }, [firestore, paperId, topicId]);

    const { data: topic, isLoading: isLoadingTopic } = useDoc<Tab>(topicRef);

    const subFoldersQuery = useMemoFirebase(() => {
        if (!topicId) return null;
        return query(collection(firestore, `tabs/${topicId}/subFolders`), orderBy('name'));
    }, [firestore, topicId]);

    const { data: subFolders, isLoading: isLoadingSubFolders } = useCollection<SubFolder>(subFoldersQuery);
    
    const isLoading = isLoadingTopic || isLoadingSubFolders;

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center">
                    <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (!topic) {
        return (
             <AppLayout>
                <div className="flex flex-col h-full items-center justify-center text-center p-4">
                    <Folder className="w-16 h-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold">टॉपिक नहीं मिला</h1>
                    <p className="text-muted-foreground">यह टॉपिक मौजूद नहीं है या हटा दिया गया है।</p>
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
                    <h1 className="font-headline text-2xl sm:text-3xl font-bold gradient-text">{topic.name}</h1>
                </div>
                
                {!subFolders || subFolders.length === 0 ? (
                     <p className="text-center text-muted-foreground p-8">इस टॉपिक में अभी कोई सब-फोल्डर नहीं है।</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {subFolders.map((subFolder, index) => (
                           <SubFolderItem 
                                key={subFolder.id} 
                                subFolder={subFolder} 
                                index={index} 
                           />
                       ))}
                    </div>
                )}
            </main>
        </AppLayout>
    );
}

export default function TopicDetailPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><LoaderCircle className="w-10 h-10 animate-spin text-primary" /></div>}>
            <TopicDetailContent />
        </Suspense>
    )
}
