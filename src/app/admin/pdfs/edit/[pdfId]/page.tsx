
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  setDoc,
  deleteDoc,
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

function PdfEditForm({ pdfId }: { pdfId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialPdf, setInitialPdf] = useState<PdfDocument | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);

  const papersQuery = useMemoFirebase(() => query(collection(firestore, 'papers'), orderBy('paperNumber')), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [tabsLoading, setTabsLoading] = useState(false);
  const [subFolders, setSubFolders] = useState<SubFolder[]>([]);
  const [subFoldersLoading, setSubFoldersLoading] = useState(false);

  const form = useForm<z.infer<typeof pdfSchema>>({
    resolver: zodResolver(pdfSchema),
  });

  const selectedPaperId = form.watch('paperId');
  const selectedTabId = form.watch('tabId');
  const selectedAccessType = form.watch('accessType');

  useEffect(() => {
    const fetchPdf = async () => {
      setIsLoadingPdf(true);
      // We need to search for the PDF since we don't know its full path
      const papersSnapshot = await getDocs(collection(firestore, "papers"));
      let foundPdf: PdfDocument | null = null;
      let found = false;
      for (const paperDoc of papersSnapshot.docs) {
          const tabsSnapshot = await getDocs(collection(paperDoc.ref, "tabs"));
          for (const tabDoc of tabsSnapshot.docs) {
              const subFoldersSnapshot = await getDocs(collection(tabDoc.ref, "subFolders"));
              for (const subFolderDoc of subFoldersSnapshot.docs) {
                   const pdfRef = doc(subFolderDoc.ref, "pdfDocuments", pdfId);
                   const pdfSnap = await getDoc(pdfRef);
                   if (pdfSnap.exists()) {
                       foundPdf = { ...pdfSnap.data(), id: pdfSnap.id } as PdfDocument;
                       found = true;
                       break;
                   }
              }
              if(found) break;
          }
          if(found) break;
      }
      
      if (foundPdf) {
          setInitialPdf(foundPdf);
          form.reset({
              ...foundPdf,
              price: foundPdf.price || undefined,
          });
      } else {
          toast({ variant: 'destructive', title: 'त्रुटि', description: 'PDF नहीं मिला।' });
          router.push('/admin/pdfs');
      }
      setIsLoadingPdf(false);
    };

    fetchPdf();
  }, [pdfId, firestore, toast, router, form]);


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
    if (selectedPaperId) {
        fetchTabs(selectedPaperId);
    }
  }, [selectedPaperId, firestore]);

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
    if (selectedTabId) {
        fetchSubFolders(selectedTabId);
    }
  }, [selectedTabId, firestore]);


  async function onSubmit(values: z.infer<typeof pdfSchema>) {
    setIsSubmitting(true);
    if (!initialPdf) {
      toast({ variant: 'destructive', title: 'त्रुटि', description: 'Original PDF data not found.' });
      setIsSubmitting(false);
      return;
    }
    try {
      const { subFolderId } = values;
      const finalValues = { ...values, price: values.accessType === 'Free' ? 0 : values.price };

      // If subFolder has changed, we need to move the document
      if (initialPdf.subFolderId !== subFolderId) {
        await deleteDoc(doc(firestore, `subFolders/${initialPdf.subFolderId}/pdfDocuments`, initialPdf.id));
        await setDoc(doc(firestore, `subFolders/${subFolderId}/pdfDocuments`, initialPdf.id), { ...finalValues, createdAt: initialPdf.createdAt || serverTimestamp() });
        toast({ title: 'सफलता!', description: `PDF "${values.name}" सफलतापूर्वक मूव और अपडेट हो गया है।` });
      } else {
        const pdfRef = doc(firestore, `subFolders/${subFolderId}/pdfDocuments`, initialPdf.id);
        await setDoc(pdfRef, finalValues, { merge: true });
        toast({ title: 'सफलता!', description: `PDF "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });
      }
      router.push('/admin/pdfs');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'त्रुटि!', description: 'कुछ गलत हुआ।' });
      setIsSubmitting(false);
    }
  }
  
  if (isLoadingPdf) {
      return <div className="flex h-full items-center justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>PDF एडिट करें</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="paperId" render={({ field }) => (<FormItem><FormLabel>विषय चुनें</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('tabId', ''); form.setValue('subFolderId', ''); }} value={field.value}><FormControl><SelectTrigger disabled={papersLoading}><SelectValue placeholder="एक विषय चुनें" /></SelectTrigger></FormControl><SelectContent>{papers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="tabId" render={({ field }) => (<FormItem><FormLabel>टॉपिक चुनें</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('subFolderId', ''); }} value={field.value} disabled={!selectedPaperId || tabsLoading}><FormControl><SelectTrigger><SelectValue placeholder={!selectedPaperId ? "पहले विषय चुनें" : "एक टॉपिक चुनें"} /></SelectTrigger></FormControl><SelectContent>{tabs.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="subFolderId" render={({ field }) => (<FormItem><FormLabel>सब-फोल्डर चुनें</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedTabId || subFoldersLoading}><FormControl><SelectTrigger><SelectValue placeholder={!selectedTabId ? "पहले टॉपिक चुनें" : "एक सब-फोल्डर चुनें"} /></SelectTrigger></FormControl><SelectContent>{subFolders.map(sf => <SelectItem key={sf.id} value={sf.id}>{sf.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>PDF का नाम</FormLabel><FormControl><Input placeholder="जैसे: इतिहास के महत्वपूर्ण नोट्स" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>PDF का विवरण</FormLabel><FormControl><Input placeholder="इसमें महत्वपूर्ण तिथियां हैं" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="googleDriveLink" render={({ field }) => (<FormItem><FormLabel>Google Drive PDF Link</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="accessType" render={({ field }) => (<FormItem><FormLabel>एक्सेस प्रकार चुनें</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                {selectedAccessType === 'Paid' && <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>कीमत (₹ में)</FormLabel><FormControl><Input type="number" placeholder="जैसे: 99" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
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
  );
}

export default function EditPdfPage() {
    const router = useRouter();
    const params = useParams();
    const pdfId = params.pdfId as string;

    return (
        <AppLayout>
            <main className="flex-1 p-6">
                <div className="flex items-center mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="font-headline text-2xl font-bold ml-2">PDF एडिट करें</h1>
                </div>
                 <Suspense fallback={<LoaderCircle className="animate-spin" />}>
                     <PdfEditForm pdfId={pdfId} />
                 </Suspense>
            </main>
        </AppLayout>
    )
}
