

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useFirestore, useMemoFirebase } from "@/firebase";
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
} from "@/components/ui/alert-dialog";
import { PlusCircle, LoaderCircle, Edit, Trash2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Paper, Tab, SubFolder, PdfDocument } from "@/lib/types";
import { deleteDoc, doc } from 'firebase/firestore';


export default function ManagePdfsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allPdfs, setAllPdfs] = useState<PdfDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subFolders, setSubFolders] = useState<SubFolder[]>([]);
  
  const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const papersSnapshot = await getDocs(query(collection(firestore, "papers"), orderBy("paperNumber")));
        const papersData = papersSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Paper));
        
        const allTabs: Tab[] = [];
        const allSubFoldersData: SubFolder[] = [];
        const allPdfsData: PdfDocument[] = [];

        for (const paper of papersData) {
          const tabsSnapshot = await getDocs(query(collection(firestore, `papers/${paper.id}/tabs`), orderBy("name")));
          const tabsData = tabsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Tab));
          allTabs.push(...tabsData);
          for (const tab of tabsData) {
              const subFoldersSnapshot = await getDocs(query(collection(firestore, `tabs/${tab.id}/subFolders`), orderBy("name")));
              const subFoldersData = subFoldersSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as SubFolder));
              allSubFoldersData.push(...subFoldersData);
              for (const subFolder of subFoldersData) {
                  const pdfsSnapshot = await getDocs(query(collection(firestore, `subFolders/${subFolder.id}/pdfDocuments`), orderBy("createdAt", "desc")));
                  const pdfsData = pdfsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as PdfDocument));
                  allPdfsData.push(...pdfsData);
              }
          }
        }
        setSubFolders(allSubFoldersData);
        setAllPdfs(allPdfsData);
      } catch (error) {
        console.error("Error fetching all data:", error);
        toast({ variant: "destructive", title: "त्रुटि!", description: "डेटा लोड करने में विफल।" });
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchAllData();
  }, [firestore, toast]);


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
              <Button onClick={() => router.push('/admin/pdfs/new')}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया PDF जोड़ें
              </Button>
            </div>
            <div className="space-y-2">
              {isLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              allPdfs.map(p => (
                <Card key={p.id} className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold break-all">{p.name}</p>
                    <p className="text-sm text-muted-foreground break-words">फोल्डर: {getSubFolderName(p.subFolderId)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/admin/pdfs/edit/${p.id}`)}><Edit className="h-4 w-4"/></Button>
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
      </main>
    </AppLayout>
  );
}
