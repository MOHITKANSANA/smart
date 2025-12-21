
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { AppLayout } from '@/components/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Send, LoaderCircle, User, Shield, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, User as AppUser } from '@/lib/types';
import { format } from 'date-fns';

function ChatBubble({ message }: { message: ChatMessage }) {
    const { user } = useUser();
    const isMe = message.senderId === user?.uid;

    return (
        <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
             {!isMe && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground flex-shrink-0"><Shield className="h-5 w-5"/></div>}
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
             {isMe && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex-shrink-0"><User className="h-5 w-5"/></div>}
        </div>
    );
}


export default function LiveChatPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: appUser } = useDoc<AppUser>(userDocRef);

    const messagesQuery = useMemoFirebase(
        () => user ? query(collection(firestore, `live-chats/${user.uid}/messages`), orderBy('createdAt', 'asc')) : null,
        [firestore, user]
    );
    const { data: messages, isLoading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !appUser) return;
        
        setIsSending(true);

        const messageData = {
            text: newMessage,
            senderId: user.uid,
            createdAt: serverTimestamp(),
        };

        const sessionData = {
            id: user.uid,
            userName: appUser.fullName,
            userEmail: appUser.email,
            lastMessage: newMessage,
            lastMessageAt: serverTimestamp(),
            isReadByAdmin: false,
        };

        try {
            // Add message and update session in parallel
            await Promise.all([
                addDoc(collection(firestore, `live-chats/${user.uid}/messages`), messageData),
                setDoc(doc(firestore, `chat-sessions/${user.uid}`), sessionData, { merge: true })
            ]);
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };
    
    const isLoading = isUserLoading || messagesLoading;

    return (
        <AppLayout>
            <main className="flex-1 flex flex-col h-full">
                <div className="flex items-center p-2 border-b sticky top-16 bg-background/80 backdrop-blur-sm z-10">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="ml-2">
                        <h1 className="font-headline text-lg font-bold">लाइव सपोर्ट चैट</h1>
                        <p className="text-xs text-muted-foreground">हम आपकी सहायता के लिए यहां हैं।</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoading && <div className="flex justify-center pt-10"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
                    {!isLoading && messages?.map(msg => (
                        <ChatBubble key={msg.id} message={msg} />
                    ))}
                    {!isLoading && messages?.length === 0 && (
                        <div className="text-center text-muted-foreground p-10">
                            कोई संदेश नहीं। अपना प्रश्न पूछकर बातचीत शुरू करें।
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="p-4 border-t bg-background">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="अपना संदेश यहाँ लिखें..."
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
