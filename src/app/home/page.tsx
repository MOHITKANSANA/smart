

"use client";

import React, { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, ChevronRight, WandSparkles, DollarSign, Book, Users, Package, Library, History, MessageCircle, Settings, TrendingUp, UserCheck, BarChart2, FolderKanban } from "lucide-react";
import { collection, query, orderBy, limit, doc, getDoc, updateDoc, arrayUnion, writeBatch, where, getDocs } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import type { Paper, Combo, Tab, Payment, User as AppUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";


function PaymentStatusHandler() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const orderId = searchParams.get('order_id');
        const paymentCheck = searchParams.get('payment_check');

        if (orderId && paymentCheck === 'true' && user && !isVerifying) {
            setIsVerifying(true);
            toast({ title: 'आपका भुगतान सत्यापित किया जा रहा है...', description: 'कृपया प्रतीक्षा करें...' });

            const verifyPayment = async () => {
                try {
                    // Step 1: Check the payment status from your own server/API
                    const response = await fetch(`/api/get-payment-status?order_id=${orderId}`);
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'सर्वर से भुगतान की स्थिति प्राप्त करने में विफल।');
                    }
                    const data = await response.json();
                    
                    const paymentRef = doc(firestore, "payments", orderId);
                    const paymentDoc = await getDoc(paymentRef);

                    // If payment record doesn't exist or already processed, stop.
                    if (paymentDoc.exists() && paymentDoc.data()?.status === 'SUCCESS') {
                        toast({ title: 'भुगतान पहले ही सत्यापित हो चुका है।' });
                        router.replace('/home', { scroll: false });
                        return;
                    }
                    
                    const userRef = doc(firestore, "users", user.uid);
                    const batch = writeBatch(firestore);

                    if (data.order_status === 'PAID' || data.order_status === 'SUCCESS') {
                        batch.set(paymentRef, { status: 'SUCCESS', updatedAt: new Date() }, { merge: true });
                        if (data.order_tags?.itemId) {
                            batch.update(userRef, { purchasedItems: arrayUnion(data.order_tags.itemId) });
                        }
                        await batch.commit();
                        toast({ title: 'भुगतान सफल!', description: 'आपको कंटेंट का एक्सेस मिल गया है।' });
                    } else {
                        batch.set(paymentRef, { status: 'FAILED', updatedAt: new Date() }, { merge: true });
                        await batch.commit();
                        toast({ variant: 'destructive', title: 'भुगतान विफल', description: 'आपका भुगतान सफल नहीं हुआ या रद्द कर दिया गया।' });
                    }

                } catch (error: any) {
                    console.error("Payment verification error:", error);
                    toast({ variant: 'destructive', title: 'सत्यापन में त्रुटि', description: error.message });
                } finally {
                    // Clean up URL
                    router.replace('/home', { scroll: false });
                    setIsVerifying(false);
                }
            };

            verifyPayment();
        }
    }, [searchParams, firestore, user, toast, router, isVerifying]);

    return null;
}


const topicGradients = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-green-500 to-teal-600',
    'from-yellow-500 to-orange-600',
    'from-cyan-500 to-sky-600',
    'from-rose-500 to-red-600',
];

function TopicItem({ topic, index }: { topic: Tab, index: number }) {
    const gradientClass = topicGradients[index % topicGradients.length];

    return (
        <Link href={`/topics/${topic.id}?paperId=${topic.paperId}`} className="block w-full">
            <div
                className={cn(
                    "w-full text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 p-4 text-center bg-gradient-to-r",
                    gradientClass
                )}
            >
                <h3 className="font-semibold text-base truncate">{topic.name}</h3>
            </div>
        </Link>
    );
}

function TopicsForPaper({ paperId }: { paperId: string }) {
    const firestore = useFirestore();
    const topicsQuery = useMemoFirebase(() =>
        query(collection(firestore, `papers/${paperId}/tabs`), orderBy("name")),
        [firestore, paperId]
    );
    const { data: topics, isLoading } = useCollection<Tab>(topicsQuery);

    if (isLoading) {
        return <div className="flex justify-center p-4"><LoaderCircle className="w-6 h-6 animate-spin" /></div>;
    }

    if (!topics || topics.length === 0) {
        return <p className="p-4 text-center text-sm text-muted-foreground">इस विषय में कोई टॉपिक नहीं है।</p>;
    }

    return (
        <div className="p-4 bg-card">
            <div className={cn(
                "grid gap-4",
                topics.length > 1 ? "grid-cols-2" : "grid-cols-1"
            )}>
                {topics.map((topic, index) => (
                    <TopicItem key={topic.id} topic={topic} index={index} />
                ))}
            </div>
        </div>
    );
}

const paperGradients = [
    'from-blue-700 to-indigo-800',
    'from-purple-700 to-pink-700',
    'from-green-700 to-teal-800',
    'from-orange-600 to-red-700',
    'from-cyan-600 to-sky-700',
    'from-rose-600 to-fuchsia-700',
];

function PaperItem({ paper, index }: { paper: Paper, index: number }) {
    const gradientClass = paperGradients[index % paperGradients.length];
    return (
        <AccordionItem value={paper.id} className="border-b-0">
             <Card className="overflow-hidden shadow-md border-0 transition-all duration-300 ease-in-out hover:shadow-xl">
                 <AccordionTrigger className={cn("p-4 text-white text-left hover:no-underline bg-gradient-to-r", gradientClass)}>
                    <div className="flex items-center gap-3 flex-1">
                        <Book className="w-6 h-6" />
                        <h3 className="font-headline text-lg font-bold">{paper.name}</h3>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-0 bg-card">
                    <TopicsForPaper paperId={paper.id} />
                </AccordionContent>
             </Card>
        </AccordionItem>
    );
}

function ComboItem({ combo, index }: { combo: Combo; index: number }) {
    const router = useRouter();

    const comboColors = [
        'bg-indigo-500',
        'bg-red-500',
        'bg-purple-500',
        'bg-green-500',
        'bg-amber-500',
        'bg-fuchsia-500',
        'bg-orange-500',
        'bg-cyan-500',
        'bg-red-600'
    ];
    const colorClass = comboColors[index % comboColors.length];

    return (
        <Link href={`/combos/${combo.id}`} className="block group">
            <Card className={cn(
                "text-white border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105 aspect-square flex flex-col justify-center items-center p-2 overflow-hidden relative text-center",
                colorClass
            )}>
                 <div className="z-10 p-2 flex items-center justify-center h-full">
                    <CardTitle className="text-sm font-bold drop-shadow-md">{combo.name}</CardTitle>
                 </div>
            </Card>
        </Link>
    );
}

function UserHomePage() {
  const firestore = useFirestore();
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc"), limit(9)), [firestore]);
  const { data: recentCombos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);

  const isLoading = papersLoading || combosLoading;

  return (
      <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
        {isLoading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}

        {!isLoading && (!papers || papers.length === 0) && (!recentCombos || recentCombos.length === 0) && (
            <p className="text-center text-muted-foreground p-8">
               अभी कोई कंटेंट उपलब्ध नहीं है। कृपया बाद में जांचें।
            </p>
        )}

        <div className="space-y-8">
            
            {papers && papers.length > 0 && (
              <div className="space-y-4">
                  <h2 className="text-xl font-headline font-bold gradient-text">विषय (Papers)</h2>
                  <Accordion type="single" collapsible className="w-full space-y-4">
                      {(papers || []).map((paper, index) => (
                          <PaperItem key={paper.id} paper={paper} index={index} />
                      ))}
                  </Accordion>
              </div>
            )}

            {recentCombos && recentCombos.length > 0 && (
              <div>
                   <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-headline font-bold gradient-text">महत्वपूर्ण नोट्स और ट्रिक्स</h2>
                       <Button variant="link" asChild>
                         <Link href="/combos">
                           सभी देखें <ChevronRight className="ml-1 h-4 w-4" />
                         </Link>
                      </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      {recentCombos.map((combo, index) => (
                          <ComboItem key={combo.id} combo={combo} index={index} />
                      ))}
                  </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-4">
                <Link href="/ai-notes-generator" className="block group">
                  <Card className="p-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl transition-shadow h-full">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-headline">AI Notes जेनरेटर</CardTitle>
                            <CardDescription className="text-white/80">रंगीन और आकर्षक नोट्स बनाएं</CardDescription>
                        </div>
                        <WandSparkles className="w-10 h-10 group-hover:animate-pulse" />
                    </div>
                  </Card>
                </Link>
            </div>

        </div>
      </main>
  );
}

function AdminHomePage() {
  const router = useRouter();
  const firestore = useFirestore();
  
  const [users, setUsers] = useState<AppUser[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        setIsLoading(true);
        const usersQuery = query(collection(firestore, "users"));
        const paymentsQuery = query(collection(firestore, "payments"), where("status", "==", "SUCCESS"));
        
        const [usersSnapshot, paymentsSnapshot] = await Promise.all([
            getDocs(usersQuery),
            getDocs(paymentsQuery)
        ]);

        setUsers(usersSnapshot.docs.map(d => ({...d.data(), id: d.id } as AppUser)));
        setPayments(paymentsSnapshot.docs.map(d => ({...d.data(), id: d.id } as Payment)));
        setIsLoading(false);
    }
    fetchData();
  }, [firestore]);
  
  const managementSections = [
    { title: "विषय (Papers)", icon: Book, link: "/admin/papers" },
    { title: "टॉपिक्स (Tabs)", icon: FolderKanban, link: "/admin/tabs" },
    { title: "सब-फोल्डर्स", icon: FolderKanban, link: "/admin/sub-folders" },
    { title: "PDF ডকুমেন্টস", icon: FileText, link: "/admin/pdfs" },
    { title: "PDF कॉम्बो", icon: Package, link: "/admin/combos" },
    { title: "लाइव चैट", icon: MessageCircle, link: "/admin/live-chat" },
    { title: "ट्रांजेक्शन हिस्ट्री", icon: History, link: "/admin/transactions" },
  ];

  const { totalRevenue, monthlyRevenueData } = useMemo(() => {
    if (!payments) return { totalRevenue: 0, monthlyRevenueData: [] };
    
    let total = 0;
    const monthlyData: {[key: string]: number} = {};

    payments.forEach(p => {
        total += p.amount;
        if (p.createdAt?.toDate) {
            const date = p.createdAt.toDate();
            const month = date.toLocaleString('default', { month: 'short' });
            monthlyData[month] = (monthlyData[month] || 0) + p.amount;
        }
    });

    const chartData = Object.keys(monthlyData).map(month => ({ month, revenue: monthlyData[month]}));

    return { totalRevenue: total, monthlyRevenueData: chartData };
  }, [payments]);
  
  const chartConfig = {
    revenue: {
        label: "कमाई",
        color: "hsl(var(--primary))",
    },
    users: {
        label: "नए उपयोगकर्ता",
        color: "hsl(var(--accent))",
    }
  } satisfies React.ComponentProps<typeof ChartContainer>["config"];

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6 bg-muted/20">
      <h1 className="font-headline text-3xl font-bold text-foreground">एडमिन डैशबोर्ड</h1>
      
      <div className="grid grid-cols-1 gap-6">
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>मासिक कमाई</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart accessibilityLayer data={monthlyRevenueData} margin={{ top: 20, right: 20, left: -10, bottom: 0}}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => `₹${Number(value) / 1000}k`}/>
                  <ChartTooltip cursor={{fill: 'hsl(var(--muted))', radius: 4}} content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="text-white bg-gradient-to-tr from-green-500 to-teal-400 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">कुल यूज़र</CardTitle><Users className="h-5 w-5 opacity-80" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{isLoading ? <LoaderCircle className="h-8 w-8 animate-spin"/> : users?.length ?? 0}</div></CardContent>
        </Card>
        <Card className="text-white bg-gradient-to-tr from-blue-500 to-cyan-400 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">सफल ट्रांजेक्शन</CardTitle><UserCheck className="h-5 w-5 opacity-80" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{isLoading ? <LoaderCircle className="h-8 w-8 animate-spin"/> : payments?.length ?? 0}</div></CardContent>
        </Card>
        <Card className="text-white bg-gradient-to-tr from-red-500 to-pink-500 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">कुल कमाई</CardTitle><DollarSign className="h-5 w-5 opacity-80" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{isLoading ? <LoaderCircle className="h-8 w-8 animate-spin"/> : `₹${totalRevenue.toFixed(2)}`}</div></CardContent>
        </Card>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>कंटेंट मैनेजमेंट</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {managementSections.map(section => (
            <Card key={section.title} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => router.push(section.link)}>
                <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-lg group-hover:text-primary">{section.title}</CardTitle>
                </div>
                <section.icon className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                </CardHeader>
            </Card>
            ))}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => router.push('/admin')}>
                <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-lg group-hover:text-primary">सभी सेटिंग्स</CardTitle>
                </div>
                <Settings className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                </CardHeader>
            </Card>
        </CardContent>
      </Card>
    </main>
  );
}


export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (user) {
        try {
            const adminDocRef = doc(firestore, 'roles_admin', user.uid);
            const adminDoc = await getDoc(adminDocRef);
            setIsAdmin(adminDoc.exists());
        } catch (error) {
            console.error("Error checking admin role:", error);
            setIsAdmin(false);
        }
      }
      setIsRoleLoading(false);
    }
    checkAdminRole();
  }, [user, firestore]);

  const isLoading = isUserLoading || isRoleLoading;
  
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-full items-center justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}>
         <PaymentStatusHandler />
      </Suspense>
      {isLoading ? (
          <div className="flex h-full items-center justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>
      ) : isAdmin ? (
          <AdminHomePage />
      ) : (
          <UserHomePage />
      )}
    </AppLayout>
  );
}
