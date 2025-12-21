
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { AppLayout } from '@/components/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, LoaderCircle, User, Shield, ChevronLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatSession } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { useUser } from '@/firebase/provider';

function ChatBubble({ message }: { message: ChatMessage }) {
    const { user } = useUser();
    // In admin chat, senderId is the user's ID, not 'admin'
    const isMe = message.senderId !== user?.uid; 

    return (
        <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
             {!isMe && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex-shrink-0"><User className="h-5 w-5"/></div>}
            <div
                className={cn(
                    "max-w-xs md:max-w-md p-3 rounded-2xl",
                    isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                )}
            >
                <p className="text-sm break-words">{message.text}</p>
                <p className="text-xs opacity-70 mt-1 text-right">
                    {message.createdAt ? format(message.createdAt.toDate(), 'p') : ''}
                </p>
            </div>
             {isMe && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/20 text-primary flex-shrink-0"><Shield className="h-5 w-5"/></div>}
        </div>
    );
}

function ChatWindow({ activeSession }: { activeSession: ChatSession }) {
    const firestore = useFirestore();
    const { user } = useUser(); // Admin user
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemoFirebase(
        () => query(collection(firestore, `live-chats/${activeSession.id}/messages`), orderBy('createdAt', 'asc')),
        [firestore, activeSession.id]
    );
    const { data: messages, isLoading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    // Mark as read when opening chat
    useEffect(() => {
        if(activeSession && !activeSession.isReadByAdmin) {
            const sessionRef = doc(firestore, `chat-sessions/${activeSession.id}`);
            updateDoc(sessionRef, { isReadByAdmin: true });
        }
    }, [activeSession, firestore]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        
        setIsSending(true);

        const messageData = {
            text: newMessage,
            senderId: 'admin', // Special ID for admin replies
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, `live-chats/${activeSession.id}/messages`), messageData);
            setNewMessage('');
        } catch (error) {
            console.error("Error sending admin message:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b">
                <h2 className="font-bold">{activeSession.userName}</h2>
                <p className="text-sm text-muted-foreground">{activeSession.userEmail}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading && <div className="flex justify-center pt-10"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
                {!messagesLoading && messages?.map(msg => (
                    <ChatBubble key={msg.id} message={msg} />
                ))}
                 {!messagesLoading && messages?.length === 0 && (
                    <div className="text-center text-muted-foreground p-10">
                       इस यूज़र ने अभी तक कोई संदेश नहीं भेजा है।
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="जवाब यहाँ लिखें..."
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                        {isSending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
            </div>
        </div>
    )
}

export default function AdminLiveChatPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);

    const sessionsQuery = useMemoFirebase(
        () => query(collection(firestore, 'chat-sessions'), orderBy('lastMessageAt', 'desc')),
        [firestore]
    );
    const { data: sessions, isLoading: sessionsLoading } = useCollection<ChatSession>(sessionsQuery);

    return (
        <AppLayout>
            <main className="flex-1 flex h-[calc(100vh-4rem)]">
                {/* Left Pane: Chat Sessions List */}
                <div className="w-full md:w-1/3 lg:w-1/4 border-r flex flex-col">
                     <div className="p-4 border-b flex items-center gap-2">
                         <Button variant="ghost" size="icon" onClick={() => router.push('/admin')} className="md:hidden">
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
                                className={cn(
                                    "p-4 border-b cursor-pointer hover:bg-muted/50",
                                    activeSession?.id === session.id && "bg-muted",
                                    !session.isReadByAdmin && "bg-primary/10 font-bold"
                                )}
                                onClick={() => setActiveSession(session)}
                            >
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold break-all">{session.userName}</p>
                                     {!session.isReadByAdmin && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 ml-2 mt-1.5"></div>}
                                </div>

                                <p className="text-sm text-muted-foreground truncate">{session.lastMessage}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {session.lastMessageAt ? formatDistanceToNow(session.lastMessageAt.toDate(), { addSuffix: true }) : ''}
                                </p>
                            </div>
                        ))}
                         {!sessionsLoading && sessions?.length === 0 && (
                            <p className="text-center text-muted-foreground p-10">कोई चैट सेशन नहीं मिला।</p>
                        )}
                    </div>
                </div>

                {/* Right Pane: Active Chat Window */}
                <div className={cn("flex-1 flex-col", activeSession ? "flex" : "hidden md:flex")}>
                    {activeSession ? (
                        <ChatWindow activeSession={activeSession} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                           <p>बातचीत देखने और जवाब देने के लिए बाईं ओर से एक सेशन चुनें।</p>
                        </div>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}

