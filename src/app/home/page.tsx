
"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon, LoaderCircle, Cloud, ChevronRight } from "lucide-react";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { Paper, Combo, Tab } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const topicGradients = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-green-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-light-blue-600',
  'from-rose-500 to-fuchsia-600',
];

function TopicItem({ topic, index }: { topic: Tab; index: number }) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/topics/${topic.id}`);
    };

    return (
        <div 
            className={cn(
                "w-full rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer p-4 flex items-center justify-between text-white",
                topicGradients[index % topicGradients.length]
            )}
            onClick={handleClick}
        >
            <div>
                <h3 className="font-headline text-lg font-bold">{topic.name}</h3>
            </div>
            <ChevronRight className="w-6 h-6" />
        </div>
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
        return <p className="p-4 text-center text-muted-foreground">इस विषय में कोई टॉपिक नहीं है।</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
            {topics.map((topic, index) => (
                <TopicItem key={topic.id} topic={topic} index={index} />
            ))}
        </div>
    );
}


function PaperItem({ paper, index }: { paper: Paper; index: number }) {
    const paperGradients = [
        "bg-gradient-to-r from-blue-500 to-cyan-500",
        "bg-gradient-to-r from-purple-500 to-fuchsia-500",
        "bg-gradient-to-r from-green-500 to-emerald-500",
        "bg-gradient-to-r from-orange-500 to-amber-500",
        "bg-gradient-to-r from-red-500 to-rose-500",
        "bg-gradient-to-r from-indigo-500 to-violet-500",
    ];

    return (
        <AccordionItem value={paper.id} className="border-none">
            <div className={cn("overflow-hidden shadow-md border-0 transition-all duration-300 ease-in-out hover:shadow-xl rounded-lg", paperGradients[index % paperGradients.length])}>
                 <AccordionTrigger className={cn("p-4 text-left hover:no-underline text-white")}>
                    <div className="flex-1">
                        <h3 className="font-headline text-xl font-bold">{paper.name}</h3>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="bg-card/80 backdrop-blur-sm rounded-b-lg">
                    <TopicsForPaper paperId={paper.id} />
                </AccordionContent>
             </div>
        </AccordionItem>
    );
}

function ComboItem({ combo, index }: { combo: Combo; index: number }) {
    const router = useRouter();

    const comboGradients = [
        'from-blue-400 to-indigo-500',
        'from-yellow-400 to-amber-500',
        'from-green-400 to-teal-500',
        'from-pink-400 to-rose-500',
    ];
    const gradientClass = comboGradients[index % comboGradients.length];

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push(`/combos/${combo.id}`);
    };

    return (
        <a href="#" onClick={handleClick} className="block group">
            <Card className="text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105 aspect-square flex flex-col justify-between p-4 overflow-hidden relative">
                 {combo.imageUrl ? (
                    <Image src={combo.imageUrl} alt={combo.name} fill={true} objectFit="cover" className="opacity-80 group-hover:opacity-100 transition-opacity" />
                 ) : (
                    <div className={cn("absolute inset-0", gradientClass)} />
                 )}
                 <div className="absolute inset-0 bg-black/40"></div>

                <CardHeader className="p-0 z-10">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-bold flex items-center gap-2"><Cloud className="w-5 h-5"/>{combo.name}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0 z-10 flex flex-col justify-end h-full">
                    <CardDescription className="text-white/80 text-xs line-clamp-2">{combo.description}</CardDescription>
                </CardContent>
            </Card>
        </a>
    );
}

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const firestore = useFirestore();
  
  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc"), limit(4)), [firestore]);
  const { data: recentCombos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);

  const filteredItems = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    if (!papers && !recentCombos) return { papers: [], combos: [] };

    const filteredPapers = papers?.filter(paper => 
        paper.name.toLowerCase().includes(lowercasedFilter)
    ) || [];

    const filteredCombos = recentCombos?.filter(combo => 
        combo.name.toLowerCase().includes(lowercasedFilter) ||
        combo.description.toLowerCase().includes(lowercasedFilter)
    ) || [];

    if (!searchTerm) {
        return { papers: papers || [], combos: recentCombos || [] };
    }

    return { papers: filteredPapers, combos: filteredCombos };

  }, [searchTerm, papers, recentCombos]);
  
  const isLoading = papersLoading || combosLoading;

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col bg-background">
        <div className="p-6">
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  placeholder="विषय या PDF कॉम्बो खोजें…"
                  className="w-full h-14 pl-12 pr-4 rounded-full bg-card border-2 focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 pt-0 overflow-y-auto">
           {isLoading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
           
           {!isLoading && (filteredItems.papers || []).length === 0 && (filteredItems.combos || []).length === 0 && (
             <p className="text-center text-muted-foreground p-8">
               {searchTerm ? `"${searchTerm}" के लिए कोई परिणाम नहीं मिला।` : "अभी कोई कंटेंट उपलब्ध नहीं है। कृपया बाद में जांचें।"}
             </p>
           )}

           {/* Papers Grid */}
            <Accordion type="single" collapsible className="w-full space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(filteredItems.papers || []).map((paper, index) => (
                      <div key={paper.id} className={cn({ 'md:col-span-2': filteredItems.papers.length % 2 !== 0 && index === filteredItems.papers.length - 1 })}>
                           <PaperItem paper={paper} index={index} />
                      </div>
                  ))}
              </div>
            </Accordion>


          {/* Combos Section */}
          {filteredItems.combos && filteredItems.combos.length > 0 && (
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-headline font-bold gradient-text">Important PDF Combos</h2>
                    <Link href="/combos">
                        <Button className="gradient-button text-white font-bold">सभी कॉम्बो देखें</Button>
                    </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {filteredItems.combos.map((combo, index) => (
                        <ComboItem key={combo.id} combo={combo} index={index} />
                    ))}
                </div>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
