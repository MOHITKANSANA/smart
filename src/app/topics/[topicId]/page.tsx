
"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { LoaderCircle, Folder, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tab, SubFolder } from '@/lib/types';
import { Button } from '@/components/ui/button';

const subFolderGradients = [
    'from-pink-500 to-rose-500',
    'from-amber-500 to-orange-500',
    'from-lime-500 to-green-500',
    'from-cyan-500 to-sky-500',
    'from-violet-500 to-purple-500',
    'from-red-500 to-yellow-500',
];

function SubFolderItem({ subFolder, index }: { subFolder: SubFolder; index: number }) {
    const router = useRouter();
    const handleClick = () => {
        router.push(`/sub-folders/${subFolder.id}`);
    }

     return (
        <button
            className={cn(
                "w-full rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer p-4 flex items-center justify-between text-white",
                subFolderGradients[index % subFolderGradients.length]
            )}
            onClick={handleClick}
        >
            <h3 className="font-headline text-lg font-bold">{subFolder.name}</h3>
            <ChevronRight className="w-6 h-6" />
        </button>
    );
}


export default function TopicDetailPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const topicId = params.topicId as string;
    
    const [topic, setTopic] = React.useState<Tab | null>(null);
    const [isLoadingTopic, setIsLoadingTopic] = React.useState(true);

    React.useEffect(() => {
        const fetchTopic = async () => {
            if (!topicId) {
                setIsLoadingTopic(false);
                return;
            }
            setIsLoadingTopic(true);
            // This is inefficient, but necessary with the current data structure.
            // A root-level 'tabs' collection would be better.
            const papersSnapshot = await getDoc(doc(firestore, 'tabs', topicId));
             if (papersSnapshot.exists()) {
                 setTopic({ ...papersSnapshot.data(), id: papersSnapshot.id } as Tab);
             } else {
                 setTopic(null);
             }
            setIsLoadingTopic(false);
        }
        fetchTopic();
    }, [firestore, topicId]);

    const subFoldersQuery = useMemoFirebase(() => 
        query(collection(firestore, `tabs/${topicId}/subFolders`), orderBy('name')), 
        [firestore, topicId]
    );
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
