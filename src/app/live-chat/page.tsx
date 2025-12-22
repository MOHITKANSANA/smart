

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { AppLayout } from '@/components/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, LoaderCircle, User, Shield, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, User as AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function ChatBubble({ message }: { message: ChatMessage }) {
    const { user } = useUser();
    const isMe = message.senderId === user?.uid;

    return (
        <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
             {!isMe && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground flex-shrink-0"><Shield className="h-5 w-5"/></div>}
            <div
                className={cn(
                    "max-w-xs md:max-w-md p-3 rounded-2xl break-words break-all",
                    isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                )}
            >
                <p className="text-sm">{message.text}</p>
                {message.createdAt && (
                    <p className="text-xs opacity-70 mt-1 text-right">
                        {message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
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
    const { toast } = useToast();

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
        if (!newMessage.trim() || !user) {
             toast({
                variant: 'destructive',
                title: 'त्रुटि',
                description: 'संदेश भेजने के लिए आपका लॉगिन होना आवश्यक है।',
            });
            return;
        }
        
        setIsSending(true);

        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            const userData = userDocSnap.exists() ? userDocSnap.data() : null;

            const messageData = {
                text: newMessage,
                senderId: user.uid,
                createdAt: serverTimestamp(),
            };

            const sessionData = {
                id: user.uid,
                userName: userData?.fullName || userData?.email || "अज्ञात उपयोगकर्ता",
                userEmail: userData?.email || "कोई ईमेल नहीं",
                lastMessage: newMessage,
                lastMessageAt: serverTimestamp(),
                isReadByAdmin: false,
            };

            await Promise.all([
                addDoc(collection(firestore, `live-chats/${user.uid}/messages`), messageData),
                setDoc(doc(firestore, `chat-sessions/${user.uid}`), sessionData, { merge: true })
            ]);
            
            setNewMessage('');

        } catch (error: any) {
            console.error("Error sending message:", error);
            toast({
                variant: 'destructive',
                title: 'संदेश भेजने में विफल',
                description: error.message || 'Firestore में डेटा सहेजते समय कोई समस्या हुई।'
            });
        } finally {
            setIsSending(false);
        }
    };
    
    const isLoading = isUserLoading || messagesLoading;

    return (
        <AppLayout hideHeader={true}>
            <main className="flex-1 flex flex-col h-screen bg-background">
                 <div className="p-4 border-b flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/home')}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="font-bold text-lg">लाइव चैट</h1>
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
                
                <div className="p-4 border-t bg-background mt-auto sticky bottom-0">
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
