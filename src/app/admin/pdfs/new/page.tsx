
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, doc, serverTimestamp, query, orderBy, getDocs, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Paper, Tab, SubFolder, PdfDocument } from '@/lib/types';

const pdfSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, 'PDF का नाम आवश्यक है।'),
    description: z.string().min(1, 'PDF का विवरण आवश्यक है।'),
    googleDriveLink: z.string().url('कृपया एक मान्य गूगल ड्राइव लिंक डालें।'),
    paperId: z.string().min(1, 'कृपया एक विषय चुनें।'),
    tabId: z.string().min(1, 'कृपया एक टॉपिक चुनें।'),
    subFolderId: z.string().min(1, 'कृपया एक सब-फोल्डर चुनें।'),
    accessType: z.enum(['Free', 'Paid']),
    price: z.preprocess(
      a => {
        if (!a || a === '') return undefined;
        const parsed = parseFloat(z.string().parse(a));
        return isNaN(parsed) ? undefined : parsed;
      },
      z.number().positive('कीमत 0 से ज़्यादा होनी चाहिए।').optional()
    ),
  })
  .refine(data => data.accessType === 'Free' || (data.price !== undefined && data.price > 0), {
    message: 'पेड PDF के लिए कीमत डालना आवश्यक है।',
    path: ['price'],
  });

export default function PdfFormPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const papersQuery = useMemoFirebase(() => query(collection(firestore, 'papers'), orderBy('paperNumber')), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [tabsLoading, setTabsLoading] = useState(false);
  const [subFolders, setSubFolders] = useState<SubFolder[]>([]);
  const [subFoldersLoading, setSubFoldersLoading] = useState(false);

  const form = useForm<z.infer<typeof pdfSchema>>({
    resolver: zodResolver(pdfSchema),
    defaultValues: {
      name: '',
      description: '',
      googleDriveLink: '',
      paperId: '',
      tabId: '',
      subFolderId: '',
      accessType: 'Free',
      price: undefined,
    },
  });

  const selectedPaperId = form.watch('paperId');
  const selectedTabId = form.watch('tabId');
  const selectedAccessType = form.watch('accessType');

  useEffect(() => {
    const fetchTabs = async (paperId: string) => {
      if (!paperId) {
        setTabs([]);
        return;
      }
      setTabsLoading(true);
      const tabsQuery = query(collection(firestore, `papers/${paperId}/tabs`));
      const snapshot = await getDocs(tabsQuery);
      setTabs(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Tab)));
      setTabsLoading(false);
    };
    fetchTabs(selectedPaperId);
    form.reset({ ...form.getValues(), tabId: '', subFolderId: '' });
  }, [selectedPaperId, firestore, form]);

  useEffect(() => {
    const fetchSubFolders = async (tabId: string) => {
      if (!tabId) {
        setSubFolders([]);
        return;
      }
      setSubFoldersLoading(true);
      const subFoldersQuery = query(collection(firestore, `tabs/${tabId}/subFolders`));
      const snapshot = await getDocs(subFoldersQuery);
      setSubFolders(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SubFolder)));
      setSubFoldersLoading(false);
    };
    fetchSubFolders(selectedTabId);
    form.reset({ ...form.getValues(), subFolderId: '' });
  }, [selectedTabId, firestore, form]);

  async function onSubmit(values: z.infer<typeof pdfSchema>) {
    setIsSubmitting(true);
    try {
      const { subFolderId } = values;
      const finalValues = { ...values, price: values.accessType === 'Free' ? 0 : values.price };

      await addDoc(collection(firestore, `subFolders/${subFolderId}/pdfDocuments`), {
        ...finalValues,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'सफलता!', description: `PDF "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
      router.push('/admin/pdfs');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'त्रुटि!', description: 'कुछ गलत हुआ।' });
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
          <h1 className="font-headline text-2xl font-bold ml-2">नया PDF जोड़ें</h1>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>PDF विवरण</CardTitle>
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
                  name="subFolderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>सब-फोल्डर चुनें</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedTabId || subFoldersLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedTabId ? 'पहले टॉपिक चुनें' : 'एक सब-फोल्डर चुनें'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subFolders.map(sf => (
                            <SelectItem key={sf.id} value={sf.id}>
                              {sf.name}
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
                      <FormLabel>PDF का नाम</FormLabel>
                      <FormControl>
                        <Input placeholder="जैसे: इतिहास के महत्वपूर्ण नोट्स" {...field} />
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
                      <FormLabel>PDF का विवरण</FormLabel>
                      <FormControl>
                        <Input placeholder="इसमें महत्वपूर्ण तिथियां हैं" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="googleDriveLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Drive PDF Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://drive.google.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>एक्सेस प्रकार चुनें</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Free">Free</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedAccessType === 'Paid' && (
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>कीमत (₹ में)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="जैसे: 99" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
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
