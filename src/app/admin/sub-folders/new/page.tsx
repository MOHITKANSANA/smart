
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, serverTimestamp, addDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Paper, Tab } from '@/lib/types';

const subFolderSchema = z.object({
  name: z.string().min(1, 'सब-फोल्डर का नाम आवश्यक है।'),
  paperId: z.string().min(1, 'कृपया एक विषय चुनें।'),
  tabId: z.string().min(1, 'कृपया एक टॉपिक चुनें।'),
});

export default function NewSubFolderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const papersQuery = useMemoFirebase(() => query(collection(firestore, 'papers'), orderBy('paperNumber')), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [tabsLoading, setTabsLoading] = useState(false);

  const form = useForm<z.infer<typeof subFolderSchema>>({
    resolver: zodResolver(subFolderSchema),
    defaultValues: {
      name: '',
      paperId: '',
      tabId: '',
    },
  });

  const selectedPaperId = form.watch('paperId');

  useEffect(() => {
    const fetchTabs = async (paperId: string) => {
      if (!paperId) {
        setTabs([]);
        return;
      }
      setTabsLoading(true);
      const tabsQuery = query(collection(firestore, `papers/${paperId}/tabs`), orderBy('name'));
      const snapshot = await getDocs(tabsQuery);
      setTabs(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Tab)));
      setTabsLoading(false);
    };
    fetchTabs(selectedPaperId);
    form.reset({ ...form.getValues(), tabId: '' });
  }, [selectedPaperId, firestore, form]);

  async function onSubmit(values: z.infer<typeof subFolderSchema>) {
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, `tabs/${values.tabId}/subFolders`), {
        name: values.name,
        paperId: values.paperId,
        tabId: values.tabId,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'सफलता!', description: `सब-फोल्डर "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
      router.push('/admin/sub-folders');
    } catch (error: any) {
      console.error('Error saving sub-folder:', error);
      toast({ variant: 'destructive', title: 'त्रुटि!', description: error.message || 'सब-फोल्डर सेव करने में कुछ गलत हुआ।' });
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
          <h1 className="font-headline text-2xl font-bold ml-2">नया सब-फोल्डर जोड़ें</h1>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>सब-फोल्डर विवरण</CardTitle>
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
                  name="tabId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>टॉपिक चुनें</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPaperId || tabsLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedPaperId ? 'पहले विषय चुनें' : 'एक टॉपिक चुनें'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tabs.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
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
                      <FormLabel>सब-फोल्डर का नाम</FormLabel>
                      <FormControl>
                        <Input placeholder="जैसे: प्राचीन इतिहास" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => router.push('/admin/sub-folders')} disabled={isSubmitting}>
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
