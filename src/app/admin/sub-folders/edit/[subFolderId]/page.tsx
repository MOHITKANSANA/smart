
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  doc,
  query,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Paper, Tab, SubFolder } from '@/lib/types';

const subFolderSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'सब-फोल्डर का नाम आवश्यक है।'),
  paperId: z.string().min(1, 'कृपया एक विषय चुनें।'),
  tabId: z.string().min(1, 'कृपया एक टॉपिक चुनें।'),
});

export default function EditSubFolderPage() {
  const router = useRouter();
  const params = useParams();
  const subFolderId = params.subFolderId as string;
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialSubFolder, setInitialSubFolder] = useState<SubFolder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    }
  });

  const selectedPaperId = form.watch('paperId');

  useEffect(() => {
    const fetchSubFolder = async () => {
      setIsLoading(true);
      const papersSnapshot = await getDocs(collection(firestore, 'papers'));
      let found = false;
      for (const paperDoc of papersSnapshot.docs) {
        const tabsSnapshot = await getDocs(collection(paperDoc.ref, 'tabs'));
        for (const tabDoc of tabsSnapshot.docs) {
          const subFolderRef = doc(firestore, `tabs/${tabDoc.id}/subFolders`, subFolderId);
          const docSnap = await getDoc(subFolderRef);
          if (docSnap.exists()) {
            const data = { ...docSnap.data(), id: docSnap.id } as SubFolder;
            setInitialSubFolder(data);
            form.reset(data);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      setIsLoading(false);
      if (!found) {
        toast({ variant: 'destructive', title: 'त्रुटि', description: 'सब-फोल्डर नहीं मिला।' });
        router.push('/admin/sub-folders');
      }
    };
    fetchSubFolder();
  }, [subFolderId, firestore, toast, router, form]);

  useEffect(() => {
    const fetchTabs = async (paperId: string) => {
      if (!paperId) return;
      setTabsLoading(true);
      const tabsQuery = query(collection(firestore, `papers/${paperId}/tabs`), orderBy('name'));
      const snapshot = await getDocs(tabsQuery);
      setTabs(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Tab)));
      setTabsLoading(false);
    };
    if (selectedPaperId) {
      fetchTabs(selectedPaperId);
    }
  }, [selectedPaperId, firestore]);

  async function onSubmit(values: z.infer<typeof subFolderSchema>) {
    setIsSubmitting(true);
    if (!initialSubFolder) {
      toast({ variant: 'destructive', title: 'त्रुटि!', description: 'Original sub-folder data missing.' });
      setIsSubmitting(false);
      return;
    }
    try {
      const finalValues = {
        name: values.name,
        paperId: values.paperId,
        tabId: values.tabId,
      };

      if (initialSubFolder.tabId !== values.tabId) {
        // Move the document
        const oldRef = doc(firestore, `tabs/${initialSubFolder.tabId}/subFolders`, subFolderId);
        const newRef = doc(firestore, `tabs/${values.tabId}/subFolders`, subFolderId);
        await setDoc(newRef, finalValues);
        await deleteDoc(oldRef);
        toast({ title: 'सफलता!', description: `सब-फोल्डर "${values.name}" सफलतापूर्वक मूव और अपडेट हो गया है।` });
      } else {
        // Update in place
        const subFolderRef = doc(firestore, `tabs/${values.tabId}/subFolders`, subFolderId);
        await updateDoc(subFolderRef, finalValues);
        toast({ title: 'सफलता!', description: `सब-फोल्डर "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });
      }

      router.push('/admin/sub-folders');
    } catch (error: any) {
      console.error('Error saving sub-folder:', error);
      toast({ variant: 'destructive', title: 'त्रुटि!', description: error.message });
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
          <h1 className="font-headline text-2xl font-bold ml-2">सब-फोल्डर एडिट करें</h1>
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
                      <Select
                        onValueChange={value => {
                          field.onChange(value);
                          form.setValue('tabId', '');
                        }}
                        value={field.value}
                      >
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
