
"use client";

import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  collection,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  useFirestore,
  useCollection,
  useUser,
  useMemoFirebase,
} from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FileText, Book, Users, DollarSign, Package, LoaderCircle, Send, Library, FolderKanban, ShieldCheck, KeyRound, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Paper, User as AppUser, Combo } from "@/lib/types";
import { useRouter } from "next/navigation";

const securityCodeSchema = z.object({
  code: z.string().min(1, "कृपया सिक्योरिटी कोड डालें।"),
});

const notificationSchema = z.object({
    title: z.string().min(1, "सूचना का शीर्षक आवश्यक है।"),
    message: z.string().min(1, "सूचना का संदेश आवश्यक है।"),
    imageUrl: z.string().url("कृपया एक मान्य इमेज URL डालें।").optional().or(z.literal('')),
});


function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const [isSecurityVerified, setSecurityVerified] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  
  const securityCodeForm = useForm<z.infer<typeof securityCodeSchema>>({
    resolver: zodResolver(securityCodeSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    const sessionVerified = localStorage.getItem('admin_security_verified');
    if (sessionVerified === 'true') {
      setSecurityVerified(true);
    }
    setIsCheckingSession(false);
  }, []);

  async function onSecurityCodeSubmit(values: z.infer<typeof securityCodeSchema>) {
    setIsVerifyingCode(true);
    securityCodeForm.clearErrors("code");
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (values.code !== "Learnx") {
        securityCodeForm.setError("code", { type: "manual", message: "गलत सिक्योरिटी कोड। कृपया पुनः प्रयास करें।" });
        setIsVerifyingCode(false);
        return;
    }
    localStorage.setItem('admin_security_verified', 'true');
    setSecurityVerified(true);
    setIsVerifyingCode(false);
  }

  if (isUserLoading || isCheckingSession) {
    return (
      <div className="flex h-full min-h-[calc(100vh-4rem)] items-center justify-center">
        <LoaderCircle className="w-8 h-8 animate-spin mr-2" />
        <span>लोड हो रहा है...</span>
      </div>
    );
  }

  if (!isSecurityVerified) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-muted/20 p-4">
        <Card className="w-full max-w-md shadow-2xl bg-gradient-to-br from-blue-900 via-purple-900 to-teal-900 text-white border-white/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4"><ShieldCheck className="w-12 h-12" /></div>
            <CardTitle className="text-2xl">एडमिन सिक्योरिटी चेक</CardTitle>
            <CardDescription className="text-white/80">
              यह क्षेत्र सुरक्षित है। आगे बढ़ने के लिए कृपया सीक्रेट कोड डालें।
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...securityCodeForm}>
              <form onSubmit={securityCodeForm.handleSubmit(onSecurityCodeSubmit)} className="space-y-6">
                <FormField
                  control={securityCodeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>सीक्रेट कोड</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                           <Input type="password" placeholder="••••••••" {...field} className="bg-black/30 border-white/30 text-white pl-10 h-12"/>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-lg font-bold bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600" disabled={isVerifyingCode}>
                  {isVerifyingCode ? <><LoaderCircle className="animate-spin mr-2" /> वेरिफाई हो रहा है...</> : 'एक्सेस करें'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}


function AdminDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);
  
  const usersQuery = useMemoFirebase(() => query(collection(firestore, "users")), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);
  
  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos")), [firestore]);
  const { data: combos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);
  
  const notificationForm = useForm<z.infer<typeof notificationSchema>>({ resolver: zodResolver(notificationSchema), defaultValues: { title: "", message: "", imageUrl: "" } });

  async function onSendNotification(values: z.infer<typeof notificationSchema>) {
    setIsSubmitting(true);
    const newNotification = {
      ...values,
      readBy: [],
      createdAt: serverTimestamp(),
    };
    await addDocumentNonBlocking(collection(firestore, "notifications"), newNotification);
    toast({ title: "सफलता!", description: `सूचना "${values.title}" भेज दी गई है।` });
    notificationForm.reset();
    setIsSubmitting(false);
  }

  const managementSections = [
    { title: "विषय (Papers)", icon: Book, link: "/admin/papers" },
    { title: "टॉपिक्स (Tabs)", icon: FolderKanban, link: "/admin/tabs" },
    { title: "सब-फोल्डर्स", icon: FolderKanban, link: "/admin/sub-folders" },
    { title: "PDF ডকুমেন্টস", icon: FileText, link: "/admin/pdfs" },
    { title: "PDF कॉम्बो", icon: Package, link: "/admin/combos" },
  ];
  
  const analytics = [
    { title: "कुल विषय", value: papersLoading ? <LoaderCircle className="h-5 w-5 animate-spin"/> : papers?.length ?? 0, icon: Library, gradient: "from-blue-500 to-cyan-400" },
    { title: "कुल कॉम्बो", value: combosLoading ? <LoaderCircle className="h-5 w-5 animate-spin"/> : combos?.length ?? 0, icon: Package, gradient: "from-purple-500 to-pink-500" },
    { title: "कुल यूज़र", value: usersLoading ? <LoaderCircle className="h-5 w-5 animate-spin"/> : users?.length ?? 0, icon: Users, gradient: "from-green-500 to-teal-400" },
    { title: "आज की कमाई", value: "₹ 0", icon: DollarSign, gradient: "from-yellow-500 to-orange-500" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-muted/20">
      <h1 className="font-headline text-3xl font-bold text-foreground">Admin Dashboard – MPPSC & Civil Notes</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {analytics.map(item => <Card key={item.title} className={cn("text-white border-0 shadow-lg", item.gradient)}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{item.title}</CardTitle><item.icon className="h-5 w-5 opacity-80" /></CardHeader><CardContent><div className="text-3xl font-bold">{item.value}</div></CardContent></Card>)}
      </div>

      <Card>
        <CardHeader><CardTitle>कंटेंट मैनेजमेंट</CardTitle><CardDescription>यहां से विषय, टॉपिक, सब-फोल्डर, PDF और कॉम्बो मैनेज करें।</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managementSections.map(section => (
            <Card key={section.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
                <section.icon className="w-8 h-8 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => router.push(section.link)}>
                  <Settings className="mr-2 h-4 w-4" /> मैनेज करें
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
      
      <Card id="send-notification" className="shadow-lg"><CardHeader><CardTitle className="flex items-center gap-2"><Send /> मैन्युअल नोटिफिकेशन भेजें</CardTitle><CardDescription>सभी यूज़र्स को एक कस्टम नोटिफिकेशन भेजें।</CardDescription></CardHeader><CardContent><Form {...notificationForm}><form onSubmit={notificationForm.handleSubmit(onSendNotification)} className="space-y-4"><FormField control={notificationForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>नोटिफिकेशन का शीर्षक</FormLabel><FormControl><Input placeholder="नया स्टडी मटेरियल उपलब्ध है!" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={notificationForm.control} name="message" render={({ field }) => (<FormItem><FormLabel>नोटिफिकेशन का संदेश</FormLabel><FormControl><Textarea placeholder="आज हमने इतिहास के नए नोट्स अपलोड किए हैं, अभी देखें।" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={notificationForm.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>इमेज URL (वैकल्पिक)</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : "अभी भेजें"}</Button></form></Form></CardContent></Card>
    </div>
  );
}

export default function AdminPage() {
    return (
        <AppLayout>
          <main className="flex-1 overflow-y-auto">
            <AdminGate>
              <AdminDashboard />
            </AdminGate>
          </main>
        </AppLayout>
    );
}
