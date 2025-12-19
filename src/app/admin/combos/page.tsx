
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
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, LoaderCircle, Edit, Trash2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Combo, PdfDocument } from "@/lib/types";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

const comboSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "कॉम्बो का नाम आवश्यक है।"),
  description: z.string().min(1, "कॉम्बो का विवरण आवश्यक है।"),
  accessType: z.enum(["Free", "Paid"]),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("कीमत 0 से ज़्यादा होनी चाहिए।").optional()
  ),
  imageUrl: z.string().url("कृपया एक मान्य इमेज URL डालें।").optional().or(z.literal('')),
  pdfIds: z.array(z.string()).min(1, "कम से कम एक PDF चुनें।"),
}).refine(data => data.accessType === 'Free' || (data.price !== undefined && data.price > 0), {
  message: "पेड कॉम्बो के लिए कीमत डालना आवश्यक है।",
  path: ["price"],
});

function ComboForm({ combo, allPdfs, onFinished }: { combo?: Combo | null, allPdfs: PdfDocument[], onFinished: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof comboSchema>>({
    resolver: zodResolver(comboSchema),
    defaultValues: combo ? {
      ...combo,
      price: combo.price || 0,
      imageUrl: combo.imageUrl || '',
    } : {
      name: "",
      description: "",
      accessType: "Free",
      price: 0,
      imageUrl: "",
      pdfIds: [],
    },
  });

  const selectedAccessType = form.watch("accessType");

  async function onSubmit(values: z.infer<typeof comboSchema>) {
    setIsSubmitting(true);
    try {
      const finalValues = { 
        ...values, 
        price: values.accessType === 'Free' ? 0 : values.price 
      };

      if (combo) { // Editing
        const comboRef = doc(firestore, "combos", combo.id);
        // When editing, we should not overwrite the createdAt field.
        const { id, ...updateData } = finalValues;
        await setDoc(comboRef, updateData, { merge: true });
        toast({ title: "सफलता!", description: `कॉम्बो "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });
      } else { // Adding new
        await addDoc(collection(firestore, "combos"), { ...finalValues, createdAt: serverTimestamp() });
        toast({ title: "सफलता!", description: `कॉम्बो "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
      }
      onFinished();
    } catch (error: any) {
      console.error("Error saving combo:", error);
      toast({ variant: "destructive", title: "त्रुटि!", description: error.message || "कॉम्बो सेव करने में कुछ गलत हुआ।" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>कॉम्बो का नाम</FormLabel><FormControl><Input placeholder="जैसे: MPSE प्रीलिम्स क्रैश कोर्स" {...field}/></FormControl><FormMessage/></FormItem>)}/>
        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>कॉम्बो का विवरण</FormLabel><FormControl><Textarea placeholder="इस कॉम्बो में सभी महत्वपूर्ण विषयों के नोट्स हैं।" {...field}/></FormControl><FormMessage/></FormItem>)}/>
        <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>इमेज URL (वैकल्पिक)</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage/></FormItem>)} />
        <FormField control={form.control} name="accessType" render={({ field }) => (<FormItem><FormLabel>एक्सेस प्रकार</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/>
        {selectedAccessType === 'Paid' && <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>कीमत (₹ में)</FormLabel><FormControl><Input type="number" placeholder="जैसे: 499" {...field} /></FormControl><FormMessage/></FormItem>)} />}

        <FormItem>
            <FormLabel>इस कॉम्बो में PDFs चुनें</FormLabel>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto my-4 pr-4 border rounded-md p-2">
              {allPdfs.map(pdf => (
                  <FormField key={pdf.id} control={form.control} name="pdfIds" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl><Checkbox checked={field.value?.includes(pdf.id)} onCheckedChange={(checked) => {
                          return checked ? field.onChange([...(field.value || []), pdf.id]) : field.onChange(field.value?.filter(value => value !== pdf.id))
                      }}/></FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{pdf.name}</FormLabel>
                        <p className="text-sm text-muted-foreground">{pdf.description}</p>
                      </div>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormMessage />
        </FormItem>


        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFinished}>रद्द करें</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : combo ? "अपडेट करें" : "सेव करें"}</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export default function ManageCombosPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allPdfs, setAllPdfs] = useState<PdfDocument[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);

  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc")), [firestore]);
  const { data: combos, isLoading: combosLoading, setData: setCombos } = useCollection<Combo>(combosQuery);

  const fetchPdfs = async () => {
      let pdfs: PdfDocument[] = [];
      const subFoldersSnapshot = await getDocs(collection(firestore, 'subFolders'));
      for (const subFolderDoc of subFoldersSnapshot.docs) {
          const pdfsQuery = query(collection(firestore, `subFolders/${subFolderDoc.id}/pdfDocuments`));
          const pdfsSnapshot = await getDocs(pdfsQuery);
          pdfs = [...pdfs, ...pdfsSnapshot.docs.map(d => ({...d.data(), id: d.id } as PdfDocument))];
      }
      setAllPdfs(pdfs);
  }

  useEffect(() => {
    fetchPdfs();
  }, [firestore]);


  const handleAddNew = () => {
    setSelectedCombo(null);
    setDialogOpen(true);
  };
  
  const handleEdit = (combo: Combo) => {
    setSelectedCombo(combo);
    setDialogOpen(true);
  };

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
        'from-blue-400 to-purple-500', 'from-yellow-400 to-orange-500',
        'from-green-400 to-cyan-500', 'from-pink-400 to-red-500',
        'from-indigo-500 to-fuchsia-600', 'from-lime-400 to-emerald-500',
  ];

  const handleFinish = () => {
    setDialogOpen(false);
    // This is a simple way to refetch the data for the main collection view
    if (combosQuery) {
        getDocs(combosQuery).then(snapshot => {
            setCombos(snapshot.docs.map(d => ({...d.data(), id: d.id} as Combo)))
        });
    }
    fetchPdfs(); // also refetch pdfs in case they were changed
  }


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
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> नया कॉम्बो जोड़ें
              </Button>
            </div>
            <div className="space-y-4">
              {combosLoading ? <div className="flex justify-center"><LoaderCircle className="animate-spin"/></div> : 
              combos?.map((c, index) => (
                <Card key={c.id} className="flex items-center justify-between p-4 relative overflow-hidden">
                    <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br", comboGradients[index % comboGradients.length])} />
                    <div className="flex items-center gap-4 z-10">
                        {c.imageUrl && <Image src={c.imageUrl} alt={c.name} width={60} height={60} className="rounded-md object-cover h-16 w-16" />}
                        <div>
                            <p className="font-semibold text-lg">{c.name}</p>
                            <p className="text-sm text-muted-foreground">{c.pdfIds?.length || 0} PDFs शामिल हैं</p>
                        </div>
                    </div>
                  <div className="flex items-center gap-2 z-10">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(c)}><Edit className="h-4 w-4"/></Button>
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedCombo ? 'कॉम्बो एडिट करें' : 'नया कॉम्बो जोड़ें'}</DialogTitle>
            </DialogHeader>
            <ComboForm combo={selectedCombo} allPdfs={allPdfs} onFinished={handleFinish} />
          </DialogContent>
        </Dialog>

      </main>
    </AppLayout>
  );
}
