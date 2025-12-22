
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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


export default function NewComboPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof comboSchema>>({
    resolver: zodResolver(comboSchema),
    defaultValues: {
      name: "",
      accessType: "Free",
      price: undefined,
    },
  });

  const selectedAccessType = form.watch("accessType");

  async function onSubmit(values: z.infer<typeof comboSchema>) {
    setIsSubmitting(true);
    try {
        await addDoc(collection(firestore, "combos"), {
          name: values.name,
          accessType: values.accessType,
          price: values.accessType === 'Free' ? 0 : values.price,
          pdfIds: [],
          createdAt: serverTimestamp()
        });
        toast({ title: "सफलता!", description: `कॉम्बो "${values.name}" सफलतापूर्वक जोड़ दिया गया है।` });
        router.push('/admin/combos');
    } catch (error: any) {
      console.error("Error saving combo:", error);
      toast({ variant: "destructive", title: "त्रुटि!", description: error.message || "कॉम्बो सेव करने में कुछ गलत हुआ।" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <main className="flex-1 p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="font-headline text-2xl font-bold ml-2">नया कॉम्बो जोड़ें</h1>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>कॉम्बो विवरण</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>कॉम्बो का नाम</FormLabel><FormControl><Input placeholder="जैसे: MPSE प्रीलिम्स क्रैश कोर्स" {...field}/></FormControl><FormMessage/></FormItem>)}/>
                <FormField control={form.control} name="accessType" render={({ field }) => (<FormItem><FormLabel>एक्सेस प्रकार</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/>
                {selectedAccessType === 'Paid' && <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>कीमत (₹ में)</FormLabel><FormControl><Input type="number" placeholder="जैसे: 499" {...field} value={field.value || ''} /></FormControl><FormMessage/></FormItem>)} />}

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={() => router.push('/admin/combos')} disabled={isSubmitting}>रद्द करें</Button>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : "सेव करें"}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  )
}

    