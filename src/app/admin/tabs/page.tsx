

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
  writeBatch,
  setDoc,
  addDoc,
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
import type { Paper, Tab } from "@/lib/types";
import { useRouter } from "next/navigation";

const tabSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "टॉपिक का नाम आवश्यक है।"),
  paperId: z.string().min(1, "कृपया एक विषय चुनें।"),
});

function TabForm({ tab, onFinished }: { tab?: Tab | null, onFinished: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const form = useForm<z.infer<typeof tabSchema>>({
    resolver: zodResolver(tabSchema),
    defaultValues: tab ? {
      id: tab.id,
      name: tab.name,
      paperId: tab.paperId,
    } : {
      name: "",
      paperId: "",
    },
  });
  
  async function onSubmit(values: z.infer<typeof tabSchema>) {
    setIsSubmitting(true);
    try {
      const { paperId, ...tabData } = values;

      if (tab && tab.paperId !== paperId) {
        const batch = writeBatch(firestore);
        const oldTabRef = doc(firestore, `papers/${tab.paperId}/tabs`, tab.id);
        batch.delete(oldTabRef);
        const newTabRef = doc(firestore, `papers/${paperId}/tabs`, tab.id);
        batch.set(newTabRef, { ...tabData, paperId, createdAt: serverTimestamp() });
        await setDoc(doc(firestore, `papers/${tab.paperId}/tabs`, tab.id), values, { merge: true });
        toast({ title: "सफलता!", description: `टॉपिक "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });

      } else if (tab) { // Editing existing tab
        const tabRef = doc(firestore, "papers", values.paperId, "tabs", tab.id);
        await setDoc(tabRef, values, { merge: true });
        toast({ title: "सफलता!", description: `टॉपिक "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });
      } else { // Adding new tab
        const newTab = { ...tabData, paperId, createdAt: serverTimestamp() };
        await addDoc(collection(firestore, "papers", paperId, "tabs"), newTab);
        toast({ title: "सफलता!", description: `टॉपिक "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
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
        <FormField control={form.control} name="paperId" render={({ field }) => (<FormItem><FormLabel>विषय</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger disabled={papersLoading}><SelectValue placeholder="एक विषय चुनें" /></SelectTrigger></FormControl><SelectContent>{papers && papers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>टॉपिक का नाम</FormLabel><FormControl><Input placeholder="जैसे: अध्याय 1, प्राचीन इतिहास" {...field} /></FormControl><FormMessage /></FormItem>)}/>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFinished}>रद्द करें</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : tab ? "अपडेट करें" : "सेव करें"}</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export default function ManageTabsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allTabs, setAllTabs] = useState<Tab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null);

  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers } = useCollection<Paper>(papersQuery);

  const fetchAllTabs = async () => {
    if (!papers) return;
    setIsLoading(true);
    const tabs: Tab[] = [];
    for (const paper of papers) {
      const tabsQuery = query(collection(firestore, `papers/${paper.id}/tabs`), orderBy("name"));
      const tabsSnapshot = await getDocs(tabsQuery);
      tabsSnapshot.forEach(doc => {
        tabs.push({ ...doc.data(), id: doc.id } as Tab);
      });
    }
    setAllTabs(tabs);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllTabs();
  }, [firestore, papers]);

  const handleAddNew = () => {
    setSelectedTab(null);
    setDialogOpen(true);
  };
  
  const handleEdit = (tab: Tab) => {
    setSelectedTab(tab);
    setDialogOpen(true);
  };

  const handleDelete = async (tabToDelete: Tab) => {
    try {
      const batch = writeBatch(firestore);
      const tabRef = doc(firestore, `papers/${tabToDelete.paperId}/tabs`, tabToDelete.id);

      const subFoldersSnapshot = await getDocs(collection(firestore, `tabs/${tabToDelete.id}/subFolders`));
      for (const subFolderDoc of subFoldersSnapshot.docs) {
          const pdfsSnapshot = await getDocs(collection(firestore, `subFolders/${subFolderDoc.id}/pdfDocuments`));
          pdfsSnapshot.forEach(pdfDoc => batch.delete(pdfDoc.ref));
          batch.delete(subFolderDoc.ref);
      }
      batch.delete(tabRef);
      
      await batch.commit();
      setAllTabs(allTabs.filter(t => t.id !== tabToDelete.id));
      toast({ title: "सफलता!", description: `टॉपिक "${tabToDelete.name}" हटा दिया गया है।` });
    } catch (e) {
      console.error("Error deleting tab:", e);
      toast({ variant: "destructive", title: "त्रुटि!", description: "टॉपिक को हटाने में कुछ गलत हुआ।" });
    }
  };

  const getPaperName = (paperId: string) => {
    return papers?.find(p => p.id === paperId)?.name || "N/A";
  }

  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2">टॉपिक्स (Tabs) मैनेज करें</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>मौजूदा टॉपिक्स</CardTitle>
            <CardDescription>यहां सभी मौजूदा टॉपिक्स की सूची दी गई है।</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया टॉपिक जोड़ें
              </Button>
            </div>
            <div className="space-y-2">
              {isLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              allTabs.map(t => (
                <Card key={t.id} className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold break-words">{t.name}</p>
                    <p className="text-sm text-muted-foreground">विषय: {getPaperName(t.paperId)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(t)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4"/></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>क्या आप वाकई निश्चित हैं?</AlertDialogTitle>
                          <AlertDialogDescription>
                            यह क्रिया स्थायी है। यह टॉपिक और इसके अंदर के सभी सब-फोल्डर्स और PDFs को हमेशा के लिए हटा देगा।
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>रद्द करें</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(t)}>हटाएं</AlertDialogAction>
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
              <DialogTitle>{selectedTab ? 'टॉपिक एडिट करें' : 'नया टॉपिक जोड़ें'}</DialogTitle>
            </DialogHeader>
            <TabForm tab={selectedTab} onFinished={() => {
                setDialogOpen(false);
                fetchAllTabs();
            }} />
          </DialogContent>
        </Dialog>

      </main>
    </AppLayout>
  );
}

    
