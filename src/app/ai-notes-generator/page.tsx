'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoaderCircle, User, WandSparkles, ChevronLeft, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateOpenAINotes } from '@/ai/flows/openai-notes-generator';
import type { NotesGeneratorInput } from '@/ai/flows/notes-generator.types';
import { cn } from '@/lib/utils';
import '../ai-notes-generator/preview/notes-style.css';


interface Message {
  role: 'user' | 'model';
  content: string;
}

function ChatBubble({ message }: { message: Message }) {
    const isUser = message.role === 'user';
    const renderedHtml = isUser ? message.content : marked(message.content) as string;

    return (
        <div className={cn("flex items-start gap-4", isUser ? "justify-end" : "justify-start")}>
            {isUser && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex-shrink-0 mt-1"><User className="h-5 w-5"/></div>}
            {!isUser && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground flex-shrink-0 mt-1"><WandSparkles className="h-5 w-5"/></div>}
            
            <div className={cn("max-w-2xl p-4 rounded-2xl", isUser ? "bg-primary text-primary-foreground" : "bg-card")}>
                {isUser ? (
                    <p className="text-base">{renderedHtml}</p>
                ) : (
                    <div
                        className="prose prose-sm sm:prose-base max-w-none colorful-notes dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: renderedHtml }}
                    />
                )}
            </div>
        </div>
    );
}

export default function AINotesChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
        role: 'model',
        content: 'नमस्ते! मैं आपका AI स्टडी पार्टनर हूँ। आप किस टॉपिक पर विस्तृत नोट्स चाहते हैं? बस टॉपिक का नाम यहाँ लिखें।'
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const result = await generateOpenAINotes({ prompt: input, history });

      const modelMessage: Message = { role: 'model', content: result.notes };
      setMessages(prev => [...prev, modelMessage]);

    } catch (error: any) {
      console.error("Error generating notes:", error);
      toast({
        variant: 'destructive',
        title: 'नोट्स बनाने में त्रुटि!',
        description: error.message || 'AI से संपर्क करने में कोई समस्या हुई। कृपया पुनः प्रयास करें।',
      });
       const errorMessage: Message = { role: 'model', content: 'माफ़ करें, मुझे नोट्स बनाने में कोई समस्या आ रही है। कृपया कुछ देर बाद फिर से प्रयास करें।' };
       setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppLayout hideHeader={true}>
        <main className="flex-1 flex flex-col h-screen bg-background">
            <div className="p-4 border-b flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                <Button variant="ghost" size="icon" onClick={() => router.push('/home')}>
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="font-bold text-lg gradient-text">AI नोट्स जेनरेटर</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg, index) => (
                    <ChatBubble key={index} message={msg} />
                ))}
                 {isGenerating && (
                    <div className="flex items-start gap-4 justify-start">
                         <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground flex-shrink-0 mt-1"><WandSparkles className="h-5 w-5"/></div>
                        <div className="max-w-2xl p-4 rounded-2xl bg-card flex items-center gap-2">
                             <LoaderCircle className="animate-spin h-5 w-5" />
                             <p className="text-muted-foreground">नोट्स बना रहा हूँ...</p>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 border-t bg-background mt-auto sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-2xl mx-auto">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="अपना टॉपिक यहाँ लिखें..."
                        autoComplete="off"
                        disabled={isGenerating}
                        className="h-12"
                    />
                    <Button type="submit" size="icon" disabled={isGenerating || !input.trim()} className="h-12 w-12">
                        {isGenerating ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
            </div>
        </main>
    </AppLayout>
  );
}
