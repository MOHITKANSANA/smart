
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoaderCircle, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Paper } from '@/lib/types';

const paperSchema = z.object({
  name: z.string().min(1, 'विषय का नाम आवश्यक है।'),
  description: z.string().min(1, 'विषय का विवरण आवश्यक है।'),
  paperNumber: z.preprocess(
    a => parseInt(z.string().parse(a), 10),
    z.number().min(1, 'पेपर नंबर कम से कम 1 होना चाहिए।')
  ),
});

export default function EditPaperPage() {
  const router = useRouter();
  const params = useParams();
  const paperId = params.paperId as string;
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paperRef = useMemoFirebase(() => doc(firestore, 'papers', paperId), [firestore, paperId]);
  const { data: paper, isLoading } = useDoc<Paper>(paperRef);

  const form = useForm<z.infer<typeof paperSchema>>({
    resolver: zodResolver(paperSchema),
  });

  useEffect(() => {
    if (paper) {
      form.reset({
        name: paper.name,
        // @ts-ignore
        description: paper.description || '', // Handle legacy papers without description
        paperNumber: paper.paperNumber,
      });
    }
  }, [paper, form]);

  async function onSubmit(values: z.infer<typeof paperSchema>) {
    setIsSubmitting(true);
    try {
      await updateDoc(paperRef, values);
      toast({ title: 'सफलता!', description: `विषय "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });
      router.push('/admin/papers');
    } catch (error: any) {
      console.error('Error saving paper:', error);
      toast({ variant: 'destructive', title: 'त्रुटि!', description: error.message || 'विषय सेव करने में कुछ गलत हुआ।' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center p-8">
          <LoaderCircle className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2">विषय एडिट करें</h1>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>विषय विवरण</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>विषय का नाम</FormLabel>
                      <FormControl>
                        <Input placeholder="जैसे: Paper I" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>विवरण</FormLabel>
                      <FormControl>
                        <Textarea placeholder="विषय का संक्षिप्त विवरण..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paperNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>पेपर नंबर</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="जैसे: 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => router.push('/admin/papers')} disabled={isSubmitting}>
                    रद्द करें
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <LoaderCircle className="animate-spin" /> : 'अपडेट करें'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
