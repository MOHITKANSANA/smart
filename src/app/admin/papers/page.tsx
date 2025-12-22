

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
  writeBatch,
  getDocs,
  setDoc,
  addDoc
} from "firebase/firestore";
import {
  useFirestore,
  useCollection,
  useUser,
  useMemoFirebase,
} from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Paper } from "@/lib/types";
import { useRouter } from "next/navigation";


export default function ManagePapersPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading, setData: setPapers } = useCollection<Paper>(papersQuery);

  const handleDelete = async (paperToDelete: Paper) => {
    try {
        const batch = writeBatch(firestore);

        const tabsSnapshot = await getDocs(collection(firestore, `papers/${paperToDelete.id}/tabs`));
        for (const tabDoc of tabsSnapshot.docs) {
            const subFoldersSnapshot = await getDocs(collection(firestore, `tabs/${tabDoc.id}/subFolders`));
            for (const subFolderDoc of subFoldersSnapshot.docs) {
                const pdfsSnapshot = await getDocs(collection(firestore, `subFolders/${subFolderDoc.id}/pdfDocuments`));
                pdfsSnapshot.forEach(pdfDoc => batch.delete(pdfDoc.ref));
                batch.delete(subFolderDoc.ref);
            }
            batch.delete(tabDoc.ref);
        }

        const paperRef = doc(firestore, 'papers', paperToDelete.id);
        batch.delete(paperRef);
        
        await batch.commit();

        if(papers) {
          setPapers(papers.filter(p => p.id !== paperToDelete.id));
        }

        toast({ title: "सफलता!", description: `विषय "${paperToDelete.name}" और उसका सारा कंटेंट हटा दिया गया है।` });
    } catch (e) {
        console.error("Error deleting paper:", e);
        toast({ variant: "destructive", title: "त्रुटि!", description: "विषय को हटाने में कुछ गलत हुआ।" });
    }
};

  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2">विषय (Papers) मैनेज करें</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>मौजूदा विषय</CardTitle>
            <CardDescription>यहां सभी मौजूदा विषयों की सूची दी गई है।</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
              <Button onClick={() => router.push('/admin/papers/new')}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया विषय जोड़ें
              </Button>
            </div>
            <div className="space-y-2">
              {papersLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              papers?.map(p => (
                <Card key={p.id} className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold break-all">{p.paperNumber}. {p.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/admin/papers/edit/${p.id}`)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4"/></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>क्या आप वाकई निश्चित हैं?</AlertDialogTitle>
                          <AlertDialogDescription>
                            यह क्रिया स्थायी है। यह विषय और इसके अंदर के सभी टॉपिक्स, सब-फोल्डर्स, और PDFs को हमेशा के लिए हटा देगा।
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
