'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { LoaderCircle, ChevronLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatSession } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export default function AdminLiveChatListPage() {
    const router = useRouter();
    const firestore = useFirestore();

    const sessionsQuery = useMemoFirebase(
        () => query(collection(firestore, 'chat-sessions'), orderBy('lastMessageAt', 'desc')),
        [firestore]
    );
    const { data: sessions, isLoading: sessionsLoading } = useCollection<ChatSession>(sessionsQuery);

    const handleSessionClick = (session: ChatSession) => {
        // Mark as read when admin clicks on it
        if (!session.isReadByAdmin) {
            const sessionRef = doc(firestore, `chat-sessions/${session.id}`);
            updateDoc(sessionRef, { isReadByAdmin: true });
        }
        router.push(`/admin/live-chat/${session.id}`);
    }
    
    return (
        <AppLayout>
            <main className="flex-1 flex flex-col h-screen">
                 <div className="p-4 border-b flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm">
                     <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Users className="h-6 w-6"/>
                    <h1 className="font-bold text-lg">चैट सेशन्स</h1>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {sessionsLoading && <div className="flex justify-center pt-10"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
                    {!sessionsLoading && sessions?.map(session => (
                        <div
                            key={session.id}
                            className="p-4 border-b cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSessionClick(session)}
                        >
                            <div className="flex justify-between items-start">
                                <p className={cn("font-semibold break-words", !session.isReadByAdmin && "text-primary font-bold")}>{session.userName}</p>
                                 {!session.isReadByAdmin && <div className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0 ml-2 mt-1.5"></div>}
                            </div>

                            {session.isReadByAdmin ? (
                                <p className="text-sm text-muted-foreground truncate break-all">{session.lastMessage}</p>
                            ): (
                                <p className="text-sm font-bold text-primary">नया संदेश</p>
                            )}

                            <p className="text-xs text-muted-foreground mt-1">
                                {session.lastMessageAt ? formatDistanceToNow(session.lastMessageAt.toDate(), { addSuffix: true }) : ''}
                            </p>
                        </div>
                    ))}
                     {!sessionsLoading && sessions?.length === 0 && (
                        <p className="text-center text-muted-foreground p-10">कोई चैट सेशन नहीं मिला।</p>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}
