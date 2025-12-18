
"use client";

import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  collection,
  doc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  getDocs,
  setDoc,
  addDoc
} from "firebase/firestore";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, LoaderCircle, Edit, Trash2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Paper, Tab, SubFolder, PdfDocument } from "@/lib/types";
import { useRouter } from "next/navigation";

const pdfSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "PDF का नाम आवश्यक है।"),
  description: z.string().min(1, "PDF का विवरण आवश्यक है।"),
  googleDriveLink: z.string().url("कृपया एक मान्य गूगल ड्राइव लिंक डालें।"),
  paperId: z.string().min(1, "कृपया एक विषय चुनें।"),
  tabId: z.string().min(1, "कृपया एक टॉपिक चुनें।"),
  subFolderId: z.string().min(1, "कृपया एक सब-फोल्डर चुनें।"),
  accessType: z.enum(["Free", "Paid"]),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("कीमत 0 से ज़्यादा होनी चाहिए।").optional()
  ),
}).refine(data => data.accessType === 'Free' || (data.price !== undefined && data.price > 0), {
  message: "पेड PDF के लिए कीमत डालना आवश्यक है।",
  path: ["price"],
});


function PdfForm({ pdf, onFinished }: { pdf?: PdfDocument | null, onFinished: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [tabsLoading, setTabsLoading] = useState(false);
  const [subFolders, setSubFolders] = useState<SubFolder[]>([]);
  const [subFoldersLoading, setSubFoldersLoading] = useState(false);

  const form = useForm<z.infer<typeof pdfSchema>>({
    resolver: zodResolver(pdfSchema),
    defaultValues: pdf ? { ...pdf } : {
      name: "",
      description: "",
      googleDriveLink: "",
      paperId: "",
      tabId: "",
      subFolderId: "",
      accessType: "Free",
      price: 0,
    },
  });

  const selectedPaperId = form.watch("paperId");
  const selectedTabId = form.watch("tabId");
  const selectedAccessType = form.watch("accessType");

  useEffect(() => {
    const fetchTabs = async (paperId: string) => {
        if (!paperId) { setTabs([]); return; };
        setTabsLoading(true);
        const tabsQuery = query(collection(firestore, `papers/${paperId}/tabs`));
        const snapshot = await getDocs(tabsQuery);
        setTabs(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Tab)));
        setTabsLoading(false);
    }
    fetchTabs(selectedPaperId);
  }, [selectedPaperId, firestore]);

  useEffect(() => {
    const fetchSubFolders = async (tabId: string) => {
        if (!tabId) { setSubFolders([]); return; };
        setSubFoldersLoading(true);
        const subFoldersQuery = query(collection(firestore, `tabs/${tabId}/subFolders`));
        const snapshot = await getDocs(subFoldersQuery);
        setSubFolders(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SubFolder)));
        setSubFoldersLoading(false);
    }
    fetchSubFolders(selectedTabId);
  }, [selectedTabId, firestore]);

  
  async function onSubmit(values: z.infer<typeof pdfSchema>) {
    setIsSubmitting(true);
    try {
      const { subFolderId, ...pdfData } = values;
      const finalValues = { ...values, price: values.accessType === 'Free' ? 0 : values.price };

      if (pdf && pdf.subFolderId !== subFolderId) {
        // Moving document
        await deleteDoc(doc(firestore, `subFolders/${pdf.subFolderId}/pdfDocuments`, pdf.id));
        await setDoc(doc(firestore, `subFolders/${subFolderId}/pdfDocuments`, pdf.id), { ...finalValues, createdAt: serverTimestamp() });
        toast({ title: "सफलता!", description: `PDF "${values.name}" सफलतापूर्वक मूव और अपडेट हो गया है।` });
      } else if (pdf) { // Editing
        const pdfRef = doc(firestore, `subFolders/${subFolderId}/pdfDocuments`, pdf.id);
        await setDoc(pdfRef, finalValues, { merge: true });
        toast({ title: "सफलता!", description: `PDF "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });
      } else { // Adding new
        await addDoc(collection(firestore, `subFolders/${subFolderId}/pdfDocuments`), { ...finalValues, createdAt: serverTimestamp() });
        toast({ title: "सफलता!", description: `PDF "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
      }
      onFinished();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "त्रुटि!", description: "कुछ गलत हुआ।" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="paperId" render={({ field }) => (<FormItem><FormLabel>विषय चुनें</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('tabId', ''); form.setValue('subFolderId', ''); }} defaultValue={field.value}><FormControl><SelectTrigger disabled={papersLoading}><SelectValue placeholder="एक विषय चुनें" /></SelectTrigger></FormControl><SelectContent>{papers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        <FormField control={form.control} name="tabId" render={({ field }) => (<FormItem><FormLabel>टॉपिक चुनें</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('subFolderId', ''); }} defaultValue={field.value} disabled={!selectedPaperId || tabsLoading}><FormControl><SelectTrigger><SelectValue placeholder={!selectedPaperId ? "पहले विषय चुनें" : "एक टॉपिक चुनें"} /></SelectTrigger></FormControl><SelectContent>{tabs.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        <FormField control={form.control} name="subFolderId" render={({ field }) => (<FormItem><FormLabel>सब-फोल्डर चुनें</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedTabId || subFoldersLoading}><FormControl><SelectTrigger><SelectValue placeholder={!selectedTabId ? "पहले टॉपिक चुनें" : "एक सब-फोल्डर चुनें"} /></SelectTrigger></FormControl><SelectContent>{subFolders.map(sf => <SelectItem key={sf.id} value={sf.id}>{sf.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>PDF का नाम</FormLabel><FormControl><Input placeholder="जैसे: इतिहास के महत्वपूर्ण नोट्स" {...field} /></FormControl><FormMessage /></FormItem>)}/>
        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>PDF का विवरण</FormLabel><FormControl><Input placeholder="इसमें महत्वपूर्ण तिथियां हैं" {...field} /></FormControl><FormMessage /></FormItem>)}/>
        <FormField control={form.control} name="googleDriveLink" render={({ field }) => (<FormItem><FormLabel>Google Drive PDF Link</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
        
        <FormField control={form.control} name="accessType" render={({ field }) => (<FormItem><FormLabel>एक्सेस प्रकार चुनें</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
        {selectedAccessType === 'Paid' && <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>कीमत (₹ में)</FormLabel><FormControl><Input type="number" placeholder="जैसे: 99" {...field} /></FormControl><FormMessage /></FormItem>)} />}

        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFinished}>रद्द करें</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : pdf ? "अपडेट करें" : "सेव करें"}</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export default function ManagePdfsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allPdfs, setAllPdfs] = useState<PdfDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfDocument | null>(null);

  const [papers, setPapers] = useState<Paper[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [subFolders, setSubFolders] = useState<SubFolder[]>([]);
  
  const fetchAllData = async () => {
      setIsLoading(true);
      const papersSnapshot = await getDocs(query(collection(firestore, "papers"), orderBy("paperNumber")));
      const papersData = papersSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Paper));
      setPapers(papersData);

      const allTabs: Tab[] = [];
      const allSubFolders: SubFolder[] = [];
      const allPdfsData: PdfDocument[] = [];

      for (const paper of papersData) {
        const tabsSnapshot = await getDocs(query(collection(firestore, `papers/${paper.id}/tabs`), orderBy("name")));
        const tabsData = tabsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Tab));
        allTabs.push(...tabsData);
        for (const tab of tabsData) {
            const subFoldersSnapshot = await getDocs(query(collection(firestore, `tabs/${tab.id}/subFolders`), orderBy("name")));
            const subFoldersData = subFoldersSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as SubFolder));
            allSubFolders.push(...subFoldersData);
            for (const subFolder of subFoldersData) {
                const pdfsSnapshot = await getDocs(query(collection(firestore, `subFolders/${subFolder.id}/pdfDocuments`), orderBy("name")));
                const pdfsData = pdfsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as PdfDocument));
                allPdfsData.push(...pdfsData);
            }
        }
      }
      setTabs(allTabs);
      setSubFolders(allSubFolders);
      setAllPdfs(allPdfsData);
      setIsLoading(false);
    };

  useEffect(() => {
    fetchAllData();
  }, [firestore]);


  const handleAddNew = () => {
    setSelectedPdf(null);
    setDialogOpen(true);
  };
  
  const handleEdit = (pdf: PdfDocument) => {
    setSelectedPdf(pdf);
    setDialogOpen(true);
  };

  const handleDelete = async (pdfToDelete: PdfDocument) => {
    try {
      await deleteDoc(doc(firestore, `subFolders/${pdfToDelete.subFolderId}/pdfDocuments`, pdfToDelete.id));
      setAllPdfs(allPdfs.filter(p => p.id !== pdfToDelete.id));
      toast({ title: "सफलता!", description: `PDF "${pdfToDelete.name}" हटा दिया गया है।` });
    } catch (e) {
      console.error("Error deleting pdf:", e);
      toast({ variant: "destructive", title: "त्रुटि!", description: "PDF को हटाने में कुछ गलत हुआ।" });
    }
  };

  const getSubFolderName = (subFolderId: string) => subFolders.find(sf => sf.id === subFolderId)?.name || "N/A";

  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2">PDFs मैनेज करें</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>मौजूदा PDFs</CardTitle>
            <CardDescription>यहां सभी मौजूदा PDFs की सूची दी गई है।</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया PDF जोड़ें
              </Button>
            </div>
            <div className="space-y-2">
              {isLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              allPdfs.map(p => (
                <Card key={p.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">फोल्डर: {getSubFolderName(p.subFolderId)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(p)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4"/></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>क्या आप वाकई निश्चित हैं?</AlertDialogTitle>
                          <AlertDialogDescription>
                            यह क्रिया स्थायी है। यह PDF हमेशा के लिए हटा दिया जाएगा।
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>रद्द करें</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(p)}>हटाएं</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedPdf ? 'PDF एडिट करें' : 'नया PDF जोड़ें'}</DialogTitle>
            </DialogHeader>
            <PdfForm pdf={selectedPdf} onFinished={() => {
                setDialogOpen(false);
                fetchAllData();
            }} />
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
}

    