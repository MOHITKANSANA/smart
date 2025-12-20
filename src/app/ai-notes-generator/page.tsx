'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateNotes, type NotesGeneratorInput } from '@/ai/flows/notes-generator';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, WandSparkles, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const notesFormSchema = z.object({
  topic: z.string().min(3, { message: 'कृपया कम से कम 3 अक्षरों का टॉपिक डालें।' }),
  language: z.enum(['Hindi', 'English']),
  description: z.string().optional(),
});

export default function AINotesGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<z.infer<typeof notesFormSchema>>({
    resolver: zodResolver(notesFormSchema),
    defaultValues: {
      topic: '',
      language: 'Hindi',
      description: '',
    },
  });

  async function onSubmit(values: z.infer<typeof notesFormSchema>) {
    setIsGenerating(true);
    try {
      const result = await generateNotes(values as NotesGeneratorInput);
      // Store result in sessionStorage to pass to the preview page
      sessionStorage.setItem('generatedNotes', result.notes);
      router.push('/ai-notes-generator/preview');
    } catch (error: any) {
      console.error('Error generating notes:', error);
      toast({
        variant: 'destructive',
        title: 'नोट्स बनाने में त्रुटि!',
        description: error.message || 'AI से संपर्क करने में कोई समस्या हुई। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <AppLayout>
      <main className="flex-1 p-4 sm:p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2 gradient-text">AI Notes जेनरेटर</h1>
        </div>

        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <WandSparkles className="w-8 h-8 text-primary" />
              <div>
                <CardTitle>अपने टॉपिक पर नोट्स बनाएं</CardTitle>
                <CardDescription>बस अपना चैप्टर या टॉपिक डालें और AI को अपना जादू करने दें।</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>चैप्टर / टॉपिक का नाम</FormLabel>
                      <FormControl>
                        <Input placeholder="जैसे: भारत का स्वतंत्रता संग्राम" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>भाषा</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Hindi">हिंदी</SelectItem>
                            <SelectItem value="English">English</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>विवरण (वैकल्पिक)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="यहाँ आप टॉपिक के बारे में कुछ और जानकारी दे सकते हैं, जैसे मुख्य बिंदु या फोकस क्षेत्र।"
                          {...field}
                        />
                      </FormControl>
                       <FormDescription>
                        AI को बेहतर नोट्स बनाने में मदद करने के लिए अधिक संदर्भ प्रदान करें।
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-lg" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <LoaderCircle className="animate-spin mr-2" />
                      जेनरेट हो रहा है...
                    </>
                  ) : (
                    'नोट्स जेनरेट करें'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
