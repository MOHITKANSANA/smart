
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, serverTimestamp, addDoc, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Paper } from '@/lib/types';

const tabSchema = z.object({
  name: z.string().min(1, 'टॉपिक का नाम आवश्यक है।'),
  paperId: z.string().min(1, 'कृपया एक विषय चुनें।'),
});

export default function NewTabPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const papersQuery = useMemoFirebase(() => query(collection(firestore, 'papers'), orderBy('paperNumber')), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const form = useForm<z.infer<typeof tabSchema>>({
    resolver: zodResolver(tabSchema),
    defaultValues: {
      name: '',
      paperId: '',
    },
  });

  async function onSubmit(values: z.infer<typeof tabSchema>) {
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, `papers/${values.paperId}/tabs`), {
        name: values.name,
        paperId: values.paperId,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'सफलता!', description: `टॉपिक "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
      router.push('/admin/tabs');
    } catch (error: any) {
      console.error('Error saving tab:', error);
      toast({ variant: 'destructive', title: 'त्रुटि!', description: error.message || 'टॉपिक सेव करने में कुछ गलत हुआ।' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2">नया टॉपिक जोड़ें</h1>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>टॉपिक विवरण</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="paperId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>विषय चुनें</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger disabled={papersLoading}>
                            <SelectValue placeholder="एक विषय चुनें" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {papers?.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>टॉपिक का नाम</FormLabel>
                      <FormControl>
                        <Input placeholder="जैसे: इतिहास" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => router.push('/admin/tabs')} disabled={isSubmitting}>
                    रद्द करें
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <LoaderCircle className="animate-spin" /> : 'सेव करें'}
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
