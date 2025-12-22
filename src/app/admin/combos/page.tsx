

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  deleteDoc,
  getDocs,
  updateDoc,
  arrayRemove
} from "firebase/firestore";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
} from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
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
import { PlusCircle, LoaderCircle, Edit, Trash2, ChevronLeft, FilePlus2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Combo, PdfDocument } from "@/lib/types";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";


const pdfInComboSchema = z.object({
    name: z.string().min(1, "PDF का नाम आवश्यक है।"),
    googleDriveLink: z.string().url("कृपया एक मान्य गूगल ड्राइव लिंक डालें।"),
});


function ManageComboPdfsDialog({ combo, isOpen, onOpenChange }: { combo: Combo, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [addingPdf, setAddingPdf] = useState(false);
    
    const [version, setVersion] = useState(0); 
    const comboRef = useMemoFirebase(() => doc(firestore, 'combos', combo.id), [firestore, combo.id, version]);
    const { data: currentCombo, isLoading } = useDoc<Combo>(comboRef);

    const pdfForm = useForm<z.infer<typeof pdfInComboSchema>>({
        resolver: zodResolver(pdfInComboSchema),
        defaultValues: { name: "", googleDriveLink: "" },
    });

    const handleAddPdf = async (values: z.infer<typeof pdfInComboSchema>) => {
        setIsSubmitting(true);
        try {
            const comboDocRef = doc(firestore, "combos", combo.id);
            const newPdfId = doc(collection(firestore, "pdfs_placeholder")).id; // Just to get a unique ID
            const newPdfData = {
                id: newPdfId,
                name: values.name,
                googleDriveLink: values.googleDriveLink,
                accessType: "Free",
            };
            
            await updateDoc(comboDocRef, {
                pdfDetails: arrayUnion(newPdfData)
            });

            toast({ title: "सफलता!", description: `PDF "${values.name}" कॉम्बो में जोड़ दिया गया है।` });
            pdfForm.reset();
            setAddingPdf(false);
            setVersion(v => v + 1); 
        } catch (error: any) {
            console.error("Error adding PDF to combo:", error);
            toast({ variant: "destructive", title: "त्रुटि!", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRemovePdf = async (pdfToRemove: any) => {
        try {
             const comboDocRef = doc(firestore, "combos", combo.id);
             await updateDoc(comboDocRef, {
                pdfDetails: arrayRemove(pdfToRemove)
            });
            toast({ title: "सफलता!", description: `PDF "${pdfToRemove.name}" हटा दिया गया है।` });
            setVersion(v => v + 1); 
        } catch(error: any) {
             console.error("Error removing PDF from combo:", error);
             toast({ variant: "destructive", title: "त्रुटि!", description: error.message });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>"{combo.name}" में PDFs मैनेज करें</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    {isLoading && <div className="flex justify-center"><LoaderCircle className="animate-spin" /></div>}
                    {!isLoading && currentCombo?.pdfDetails?.map((pdf: any) => (
                        <Card key={pdf.id} className="flex items-center justify-between p-3">
                            <p className="font-semibold text-sm break-all flex-1 min-w-0">{pdf.name}</p>
                            <Button size="sm" variant="destructive" onClick={() => handleRemovePdf(pdf)} className="flex-shrink-0 ml-4">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </Card>
                    ))}
                     {!isLoading && (!currentCombo?.pdfDetails || currentCombo.pdfDetails.length === 0) && (
                        <p className="text-center text-muted-foreground py-4">इस कॉम्बो में कोई PDF नहीं है।</p>
                    )}
                </div>

                {addingPdf ? (
                    <div className="mt-4 p-4 border-t">
                         <h3 className="text-lg font-semibold mb-2">नया PDF जोड़ें</h3>
                        <Form {...pdfForm}>
                            <form onSubmit={pdfForm.handleSubmit(handleAddPdf)} className="space-y-4">
                                <FormField control={pdfForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>PDF का नाम</FormLabel><FormControl><Input placeholder="जैसे: इतिहास के नोट्स" {...field}/></FormControl><FormMessage/></FormItem>)}/>
                                <FormField control={pdfForm.control} name="googleDriveLink" render={({ field }) => (<FormItem><FormLabel>Google Drive PDF Link</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." {...field}/></FormControl><FormMessage/></FormItem>)}/>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={() => setAddingPdf(false)}>रद्द करें</Button>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin"/> : "PDF सेव करें"}</Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                ) : (
                    <DialogFooter className="border-t pt-4">
                        <Button onClick={() => setAddingPdf(true)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> नया PDF जोड़ें
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function ManageCombosPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [managePdfsCombo, setManagePdfsCombo] = useState<Combo | null>(null);
  const [managePdfsDialogOpen, setManagePdfsDialogOpen] = useState(false);

  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc")), [firestore]);
  const { data: combos, isLoading: combosLoading, setData: setCombos } = useCollection<Combo>(combosQuery);
  

  const handleManagePdfs = (combo: Combo) => {
    setManagePdfsCombo(combo);
    setManagePdfsDialogOpen(true);
  }

  const handleDelete = async (comboToDelete: Combo) => {
    try {
      await deleteDoc(doc(firestore, "combos", comboToDelete.id));
      if (combos) {
        setCombos(combos.filter(c => c.id !== comboToDelete.id));
      }
      toast({ title: "सफलता!", description: `कॉम्बो "${comboToDelete.name}" हटा दिया गया है।` });
    } catch (e) {
      console.error("Error deleting combo:", e);
      toast({ variant: "destructive", title: "त्रुटि!", description: "कॉम्बो को हटाने में कुछ गलत हुआ।" });
    }
  };
  
  const comboGradients = [
        'from-blue-700 to-indigo-800',
        'from-green-600 to-teal-700',
        'from-yellow-600 to-orange-700',
        'from-red-600 to-pink-700',
        'from-purple-700 to-violet-800',
        'from-sky-600 to-cyan-700',
        'from-rose-600 to-fuchsia-700',
        'from-lime-600 to-emerald-700',
        'from-amber-600 to-red-700'
  ];


  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2">PDF कॉम्बो मैनेज करें</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>मौजूदा कॉम्बो</CardTitle>
            <CardDescription>यहां सभी मौजूदा कॉम्बो पैकेजों की सूची दी गई है।</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
              <Button onClick={() => router.push('/admin/combos/new')}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया कॉम्बो जोड़ें
              </Button>
            </div>
            <div className="space-y-4">
              {combosLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              combos?.map((c, index) => (
                <Card key={c.id} className="flex items-center justify-between p-4 relative overflow-hidden">
                    <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br", comboGradients[index % comboGradients.length])} />
                    <div className="flex items-center gap-4 z-10 flex-1 min-w-0">
                        {c.imageUrl && <Image src={c.imageUrl} alt={c.name} width={60} height={60} className="rounded-md object-cover h-16 w-16" />}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg break-all">{c.name}</p>
                            <p className="text-sm text-muted-foreground">{c.pdfDetails?.length || 0} PDFs शामिल हैं</p>
                        </div>
                    </div>
                  <div className="flex items-center gap-2 z-10 flex-shrink-0 ml-4">
                    <Button size="sm" variant="outline" onClick={() => handleManagePdfs(c)}><FilePlus2 className="h-4 w-4"/></Button>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/admin/combos/edit/${c.id}`)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4"/></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>क्या आप वाकई निश्चित हैं?</AlertDialogTitle>
                          <AlertDialogDescription>यह क्रिया स्थायी है। यह कॉम्बो हमेशा के लिए हटा दिया जाएगा।</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>रद्द करें</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c)}>हटाएं</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {managePdfsCombo && (
            <ManageComboPdfsDialog
                combo={managePdfsCombo}
                isOpen={managePdfsDialogOpen}
                onOpenChange={setManagePdfsDialogOpen}
            />
        )}


      </main>
    </AppLayout>
  );
}

    