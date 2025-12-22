'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { AppLayout } from '@/components/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, LoaderCircle, User, Shield, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatSession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function ChatBubble({ message }: { message: ChatMessage }) {
    const isAdminReply = message.senderId === 'admin';

    return (
        <div className={cn("flex items-end gap-2", isAdminReply ? "justify-end" : "justify-start")}>
             {!isAdminReply && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex-shrink-0"><User className="h-5 w-5"/></div>}
            <div
                className={cn(
                    "max-w-xs md:max-w-md p-3 rounded-2xl break-all",
                    isAdminReply ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                )}
            >
                <p className="text-sm">{message.text}</p>
                {message.createdAt && (
                    <p className="text-xs opacity-70 mt-1 text-right">
                        {message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>
             {isAdminReply && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/20 text-primary flex-shrink-0"><Shield className="h-5 w-5"/></div>}
        </div>
    );
}

export default function AdminChatWindowPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const sessionId = params.sessionId as string;
    const firestore = useFirestore();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const sessionRef = useMemoFirebase(() => doc(firestore, `chat-sessions/${sessionId}`), [firestore, sessionId]);
    const { data: activeSession, isLoading: sessionLoading } = useDoc<ChatSession>(sessionRef);

    const messagesQuery = useMemoFirebase(
        () => query(collection(firestore, `live-chats/${sessionId}/messages`), orderBy('createdAt', 'asc')),
        [firestore, sessionId]
    );
    const { data: messages, isLoading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeSession) return;
        
        setIsSending(true);

        const messageData = {
            text: newMessage,
            senderId: 'admin',
            createdAt: serverTimestamp(),
        };
        
        const currentSessionRef = doc(firestore, `chat-sessions/${activeSession.id}`);

        try {
            await Promise.all([
                addDoc(collection(firestore, `live-chats/${activeSession.id}/messages`), messageData),
                setDoc(currentSessionRef, { 
                    lastMessage: `आप: ${newMessage}`,
                    lastMessageAt: serverTimestamp(),
                    isReadByAdmin: true
                 }, { merge: true })
            ]);
            setNewMessage('');
        } catch (error: any) {
            console.error("Error sending admin message:", error);
            toast({
                variant: 'destructive',
                title: 'संदेश भेजने में विफल',
                description: error.message || 'Firestore में डेटा सहेजते समय कोई समस्या हुई।'
            });
        } finally {
            setIsSending(false);
        }
    };
    
    const isLoading = sessionLoading || messagesLoading;

    return (
        <AppLayout hideHeader={true}>
             <main className="flex-1 flex flex-col h-screen bg-background">
                 <div className="p-4 border-b flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/live-chat')}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    {activeSession && (
                        <div>
                           <h1 className="font-bold text-lg">{activeSession.userName}</h1>
                           <p className="text-xs text-muted-foreground">{activeSession.userEmail}</p>
                        </div>
                    )}
                 </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoading && <div className="flex justify-center pt-10"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
                    {!isLoading && messages?.map(msg => (
                        <ChatBubble key={msg.id} message={msg} />
                    ))}
                    {!isLoading && messages?.length === 0 && (
                        <div className="text-center text-muted-foreground p-10">
                        इस यूज़र ने अभी तक कोई संदेश नहीं भेजा है।
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="p-4 border-t bg-background mt-auto sticky bottom-0">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="जवाब यहाँ लिखें..."
                            autoComplete="off"
                            disabled={isLoading}
                        />
                        <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                            {isSending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </form>
                </div>
            </main>
        </AppLayout>
    );
}
