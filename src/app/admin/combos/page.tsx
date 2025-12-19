
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
import type { Combo } from "@/lib/types";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

const comboSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "कॉम्बो का नाम आवश्यक है।"),
  accessType: z.enum(["Free", "Paid"]),
  price: z.preprocess(
    (a) => {
        if (!a || a === "") return undefined;
        return parseFloat(z.string().parse(a));
    },
    z.number().positive("कीमत 0 से ज़्यादा होनी चाहिए।").optional()
  ),
}).refine(data => data.accessType === 'Free' || (data.price !== undefined && data.price > 0), {
  message: "पेड कॉम्बो के लिए कीमत डालना आवश्यक है।",
  path: ["price"],
});

function ComboForm({ combo, onFinished }: { combo?: Combo | null, onFinished: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof comboSchema>>({
    resolver: zodResolver(comboSchema),
    defaultValues: combo ? {
      ...combo,
      price: combo.price || undefined,
    } : {
      name: "",
      accessType: "Free",
      price: undefined,
    },
  });

  const selectedAccessType = form.watch("accessType");

  async function onSubmit(values: z.infer<typeof comboSchema>) {
    setIsSubmitting(true);
    try {
      const finalValues: Omit<Combo, 'id' | 'createdAt' | 'description' | 'imageUrl' | 'pdfs'> & {createdAt?: any} = { 
        name: values.name,
        accessType: values.accessType,
        price: values.accessType === 'Free' ? 0 : values.price,
        pdfIds: combo?.pdfIds || [],
      };

      if (combo) { // Editing
        const comboRef = doc(firestore, "combos", combo.id);
        // Ensure we don't overwrite existing pdfIds or description by merging with existing combo data first
        const updateData = { ...combo, ...finalValues };
        await setDoc(comboRef, updateData, { merge: true });
        toast({ title: "सफलता!", description: `कॉम्बो "${values.name}" सफलतापूर्वक अपडेट हो गया है।` });
      } else { // Adding new
        await addDoc(collection(firestore, "combos"), {
          ...finalValues,
          description: "", // Add empty description for new combos
          createdAt: serverTimestamp()
        });
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
        <FormField control={form.control} name="accessType" render={({ field }) => (<FormItem><FormLabel>एक्सेस प्रकार</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/>
        {selectedAccessType === 'Paid' && <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>कीमत (₹ में)</FormLabel><FormControl><Input type="number" placeholder="जैसे: 499" {...field} value={field.value || ''} /></FormControl><FormMessage/></FormItem>)} />}

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
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);

  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc")), [firestore]);
  const { data: combos, isLoading: combosLoading, setData: setCombos } = useCollection<Combo>(combosQuery);
  
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

  const handleFinish = () => {
    setDialogOpen(false);
    // This is a simple way to refetch the data for the main collection view
    if (combosQuery) {
        getDocs(combosQuery).then(snapshot => {
            setCombos(snapshot.docs.map(d => ({...d.data(), id: d.id} as Combo)))
        });
    }
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
            <ComboForm combo={selectedCombo} onFinished={handleFinish} />
          </DialogContent>
        </Dialog>

      </main>
    </AppLayout>
  );
}

    