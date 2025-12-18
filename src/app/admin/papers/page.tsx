
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
} from "firebase/firestore";
import {
  useFirestore,
  useCollection,
  useUser,
  useMemoFirebase,
} from "@/firebase";
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import { PlusCircle, LoaderCircle, Edit, Trash2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Paper } from "@/lib/types";
import { useRouter } from "next/navigation";

const paperSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "विषय का नाम आवश्यक है।"),
  paperNumber: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(1, "पेपर नंबर आवश्यक है।")
  ),
});

function PaperForm({ paper, onFinished }: { paper?: Paper | null, onFinished: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: papers } = useCollection<Paper>(query(collection(firestore, "papers")));

  const form = useForm<z.infer<typeof paperSchema>>({
    resolver: zodResolver(paperSchema),
    defaultValues: paper ? {
      id: paper.id,
      name: paper.name,
      paperNumber: paper.paperNumber,
    } : {
      name: "",
      paperNumber: (papers?.length || 0) + 1,
    },
  });
  
  async function onSubmit(values: z.infer<typeof paperSchema>) {
    setIsSubmitting(true);
    try {
      if (paper) { // Editing existing paper
        const paperRef = doc(firestore, "papers", paper.id);
        await setDocumentNonBlocking(paperRef, values, { merge: true });
        toast({ title: "सफलता!", description: `विषय "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });
      } else { // Adding new paper
        const newPaper = { ...values, createdAt: serverTimestamp() };
        await addDocumentNonBlocking(collection(firestore, "papers"), newPaper);
        toast({ title: "सफलता!", description: `विषय "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
      }
      onFinished();
    } catch (error) {
      toast({ variant: "destructive", title: "त्रुटि!", description: "कुछ गलत हुआ।" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>विषय का नाम</FormLabel><FormControl><Input placeholder="जैसे: Paper 1, इतिहास" {...field} /></FormControl><FormMessage /></FormItem>)}/>
        <FormField control={form.control} name="paperNumber" render={({ field }) => (<FormItem><FormLabel>पेपर नंबर (क्रम के लिए)</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>)}/>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFinished}>रद्द करें</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : paper ? "अपडेट करें" : "सेव करें"}</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export default function ManagePapersPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  const handleAddNew = () => {
    setSelectedPaper(null);
    setDialogOpen(true);
  };
  
  const handleEdit = (paper: Paper) => {
    setSelectedPaper(paper);
    setDialogOpen(true);
  };

  const handleDelete = async (paper: Paper) => {
    try {
        const batch = writeBatch(firestore);

        // Recursively find and delete all nested documents
        const tabsSnapshot = await getDocs(collection(firestore, `papers/${paper.id}/tabs`));
        for (const tabDoc of tabsSnapshot.docs) {
            const subFoldersSnapshot = await getDocs(collection(firestore, `tabs/${tabDoc.id}/subFolders`));
            for (const subFolderDoc of subFoldersSnapshot.docs) {
                const pdfsSnapshot = await getDocs(collection(firestore, `subFolders/${subFolderDoc.id}/pdfDocuments`));
                pdfsSnapshot.forEach(pdfDoc => batch.delete(pdfDoc.ref));
                batch.delete(subFolderDoc.ref);
            }
            batch.delete(tabDoc.ref);
        }

        const paperRef = doc(firestore, 'papers', paper.id);
        batch.delete(paperRef);
        
        await batch.commit();

        toast({ title: "सफलता!", description: `विषय "${paper.name}" और उसका सारा कंटेंट हटा दिया गया है।` });
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
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया विषय जोड़ें
              </Button>
            </div>
            <div className="space-y-2">
              {papersLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              papers?.map(p => (
                <Card key={p.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-semibold">{p.paperNumber}. {p.name}</p>
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedPaper ? 'विषय एडिट करें' : 'नया विषय जोड़ें'}</DialogTitle>
            </DialogHeader>
            <PaperForm paper={selectedPaper} onFinished={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>

      </main>
    </AppLayout>
  );
}
