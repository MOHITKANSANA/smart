

"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  writeBatch,
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
import type { Paper, Tab, SubFolder } from "@/lib/types";
import { useRouter } from "next/navigation";

const subFolderSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "सब-फोल्डर का नाम आवश्यक है।"),
    paperId: z.string().min(1, "कृपया एक विषय चुनें।"),
    tabId: z.string().min(1, "कृपया एक टॉपिक चुनें।"),
});

function SubFolderForm({ subFolder, onFinished }: { subFolder?: SubFolder | null, onFinished: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [tabsLoading, setTabsLoading] = useState(false);

  const form = useForm<z.infer<typeof subFolderSchema>>({
    resolver: zodResolver(subFolderSchema),
    defaultValues: subFolder ? {
      id: subFolder.id,
      name: subFolder.name,
      paperId: subFolder.paperId,
      tabId: subFolder.tabId
    } : {
      name: "",
      paperId: "",
      tabId: ""
    },
  });

  const selectedPaperId = form.watch("paperId");

  useEffect(() => {
    const fetchTabs = async (paperId: string) => {
        if (!paperId) {
            setTabs([]);
            return;
        };
        setTabsLoading(true);
        const tabsQuery = query(collection(firestore, `papers/${paperId}/tabs`));
        const snapshot = await getDocs(tabsQuery);
        const tabsData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Tab));
        setTabs(tabsData);
        setTabsLoading(false);
    }
    fetchTabs(selectedPaperId);
  }, [selectedPaperId, firestore]);

  
  async function onSubmit(values: z.infer<typeof subFolderSchema>) {
    setIsSubmitting(true);
    try {
      const { tabId, paperId, ...subFolderData } = values;
      
      if (subFolder && subFolder.tabId !== tabId) {
        await setDoc(doc(firestore, `tabs/${subFolder.tabId}/subFolders`, subFolder.id), values, { merge: true });
        toast({ title: "सफलता!", description: `सब-फोल्डर "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });

      } else if (subFolder) { // Editing existing
        const subFolderRef = doc(firestore, `tabs/${tabId}/subFolders`, subFolder.id);
        await setDoc(subFolderRef, values, { merge: true });
        toast({ title: "सफलता!", description: `सब-फोल्डर "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });
      } else { // Adding new
        const newSubFolder = { ...subFolderData, paperId, tabId, createdAt: serverTimestamp() };
        await addDoc(collection(firestore, `tabs/${tabId}/subFolders`), newSubFolder);
        toast({ title: "सफलता!", description: `सब-फोल्डर "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
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
        <FormField control={form.control} name="paperId" render={({ field }) => (<FormItem><FormLabel>विषय चुनें</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('tabId', '') }} defaultValue={field.value}><FormControl><SelectTrigger disabled={papersLoading}><SelectValue placeholder="पहले एक विषय चुनें" /></SelectTrigger></FormControl><SelectContent>{papers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        <FormField control={form.control} name="tabId" render={({ field }) => (<FormItem><FormLabel>टॉपिक चुनें</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedPaperId || tabsLoading}><FormControl><SelectTrigger><SelectValue placeholder={!selectedPaperId ? "पहले विषय चुनें" : "एक टॉपिक चुनें"} /></SelectTrigger></FormControl><SelectContent>{tabs.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>सब-फोल्डर का नाम</FormLabel><FormControl><Input placeholder="जैसे: हड़प्पा सभ्यता" {...field} /></FormControl><FormMessage /></FormItem>)}/>

        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFinished}>रद्द करें</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : subFolder ? "अपडेट करें" : "सेव करें"}</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export default function ManageSubFoldersPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allSubFolders, setAllSubFolders] = useState<SubFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSubFolder, setSelectedSubFolder] = useState<SubFolder | null>(null);

  const [papers, setPapers] = useState<Paper[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);

  const fetchData = async () => {
      setIsLoading(true);
      const papersSnapshot = await getDocs(query(collection(firestore, "papers"), orderBy("paperNumber")));
      const papersData = papersSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Paper));
      setPapers(papersData);

      const allTabs: Tab[] = [];
      const allSubFoldersData: SubFolder[] = [];

      for (const paper of papersData) {
        const tabsSnapshot = await getDocs(query(collection(firestore, `papers/${paper.id}/tabs`), orderBy("name")));
        const tabsData = tabsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Tab));
        allTabs.push(...tabsData);
        for (const tab of tabsData) {
            const subFoldersSnapshot = await getDocs(query(collection(firestore, `tabs/${tab.id}/subFolders`), orderBy("name")));
            const subFoldersData = subFoldersSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as SubFolder));
            allSubFoldersData.push(...subFoldersData);
        }
      }
      setTabs(allTabs);
      setAllSubFolders(allSubFoldersData);
      setIsLoading(false);
    };

  useEffect(() => {
    fetchData();
  }, [firestore]);


  const handleAddNew = () => {
    setSelectedSubFolder(null);
    setDialogOpen(true);
  };
  
  const handleEdit = (subFolder: SubFolder) => {
    setSelectedSubFolder(subFolder);
    setDialogOpen(true);
  };

  const handleDelete = async (subFolderToDelete: SubFolder) => {
    try {
        const batch = writeBatch(firestore);
        const subFolderRef = doc(firestore, `tabs/${subFolderToDelete.tabId}/subFolders`, subFolderToDelete.id);

        const pdfsSnapshot = await getDocs(collection(firestore, `subFolders/${subFolderToDelete.id}/pdfDocuments`));
        pdfsSnapshot.forEach(pdfDoc => batch.delete(pdfDoc.ref));
        
        batch.delete(subFolderRef);
        
        await batch.commit();
        setAllSubFolders(allSubFolders.filter(sf => sf.id !== subFolderToDelete.id));
        toast({ title: "सफलता!", description: `सब-फोल्डर "${subFolderToDelete.name}" हटा दिया गया है।` });
    } catch (e) {
        console.error("Error deleting sub-folder:", e);
        toast({ variant: "destructive", title: "त्रुटि!", description: "सब-फोल्डर को हटाने में कुछ गलत हुआ।" });
    }
  };

  const getPaperName = (paperId: string) => papers.find(p => p.id === paperId)?.name || "N/A";
  const getTabName = (tabId: string) => tabs.find(t => t.id === tabId)?.name || "N/A";

  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2">सब-फोल्डर्स मैनेज करें</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>मौजूदा सब-फोल्डर्स</CardTitle>
            <CardDescription>यहां सभी मौजूदा सब-फोल्डर्स की सूची दी गई है।</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया सब-फोल्डर जोड़ें
              </Button>
            </div>
            <div className="space-y-2">
              {isLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              allSubFolders.map(sf => (
                <Card key={sf.id} className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold break-words">{sf.name}</p>
                    <p className="text-sm text-muted-foreground">टॉपिक: {getTabName(sf.tabId)} | विषय: {getPaperName(sf.paperId)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(sf)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4"/></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>क्या आप वाकई निश्चित हैं?</AlertDialogTitle>
                          <AlertDialogDescription>
                            यह क्रिया स्थायी है। यह सब-फोल्डर और इसके अंदर के सभी PDFs को हमेशा के लिए हटा देगा।
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>रद्द करें</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(sf)}>हटाएं</AlertDialogAction>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedSubFolder ? 'सब-फोल्डर एडिट करें' : 'नया सब-फोल्डर जोड़ें'}</DialogTitle>
            </DialogHeader>
            <SubFolderForm subFolder={selectedSubFolder} onFinished={() => {
                setDialogOpen(false);
                fetchData();
            }} />
          </DialogContent>
        </Dialog>

      </main>
    </AppLayout>
  );
}

    
