

"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  deleteDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { PlusCircle, LoaderCircle, Edit, Trash2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Paper, Tab } from "@/lib/types";
import { useRouter } from "next/navigation";


export default function ManageTabsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allTabs, setAllTabs] = useState<Tab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers } = useCollection<Paper>(papersQuery);

  const fetchAllTabs = React.useCallback(async () => {
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
  }, [firestore, papers]);

  useEffect(() => {
    if (papers) {
      fetchAllTabs();
    }
  }, [papers, fetchAllTabs]);


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
               <Button onClick={() => router.push('/admin/tabs/new')}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया टॉपिक जोड़ें
              </Button>
            </div>
            <div className="space-y-2">
              {isLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              allTabs.map(t => (
                <Card key={t.id} className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold break-words">{t.name}</p>
                    <p className="text-sm text-muted-foreground break-words">विषय: {getPaperName(t.paperId)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/admin/tabs/edit/${t.id}`)}><Edit className="h-4 w-4"/></Button>
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
      </main>
    </AppLayout>
  );
}
