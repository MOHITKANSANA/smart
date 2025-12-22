

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  deleteDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { useFirestore } from "@/firebase";
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
import type { Paper, Tab, SubFolder } from "@/lib/types";
import { useRouter } from "next/navigation";


export default function ManageSubFoldersPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allSubFolders, setAllSubFolders] = useState<SubFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);

  const fetchData = useCallback(async () => {
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
    }, [firestore]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


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
               <Button onClick={() => router.push('/admin/sub-folders/new')}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया सब-फोल्डर जोड़ें
              </Button>
            </div>
            <div className="space-y-2">
              {isLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              allSubFolders.map(sf => (
                <Card key={sf.id} className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold break-all">{sf.name}</p>
                    <p className="text-sm text-muted-foreground break-words">टॉपिक: {getTabName(sf.tabId)} | विषय: {getPaperName(sf.paperId)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                     <Button size="sm" variant="outline" onClick={() => router.push(`/admin/sub-folders/edit/${sf.id}`)}><Edit className="h-4 w-4"/></Button>
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
      </main>
    </AppLayout>
  );
}

    
