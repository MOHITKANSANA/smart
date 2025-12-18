
"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, Cloud, ChevronRight } from "lucide-react";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Paper, Combo, Tab } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const topicGradients = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-green-500 to-teal-600',
    'from-yellow-500 to-orange-600',
    'from-cyan-500 to-sky-600',
    'from-rose-500 to-red-600',
];

function TopicItem({ topic, index }: { topic: Tab, index: number }) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/topics/${topic.id}`);
    };

    const gradientClass = topicGradients[index % topicGradients.length];

    return (
        <button
            className={cn(
                "w-full text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 p-4 text-center bg-gradient-to-r",
                gradientClass
            )}
            onClick={handleClick}
        >
            <h3 className="font-semibold text-base truncate">{topic.name}</h3>
        </button>
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
    'from-blue-600 to-indigo-700',
    'from-purple-600 to-pink-700',
    'from-green-600 to-teal-700',
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
                    <div className="flex-1">
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

    const comboGradients = [
        'from-blue-400 to-purple-500',
        'from-yellow-400 to-orange-500',
        'from-green-400 to-cyan-500',
        'from-pink-400 to-red-500',
        'from-indigo-500 to-fuchsia-600',
        'from-lime-400 to-emerald-500',
        'from-rose-500 to-violet-600',
        'from-amber-500 to-red-600',
        'from-teal-400 to-sky-500',
    ];
    const gradientClass = comboGradients[index % comboGradients.length];

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push(`/combos/${combo.id}`);
    };

    return (
        <a href="#" onClick={handleClick} className="block group">
            <Card className="text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105 aspect-square flex flex-col justify-center items-center p-2 overflow-hidden relative text-center">
                 {combo.imageUrl ? (
                    <Image src={combo.imageUrl} alt={combo.name} fill={true} objectFit="cover" className="opacity-80 group-hover:opacity-100 transition-opacity" />
                 ) : (
                    <div className={cn("absolute inset-0 bg-gradient-to-br", gradientClass)} />
                 )}
                 <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>

                 <div className="z-10">
                    <Cloud className="w-8 h-8 mx-auto mb-2"/>
                    <CardTitle className="text-sm font-bold line-clamp-2">{combo.name}</CardTitle>
                 </div>
            </Card>
        </a>
    );
}

export default function HomePage() {
  const firestore = useFirestore();

  const papersQuery = useMemoFirebase(() => query(collection(firestore, "papers"), orderBy("paperNumber")), [firestore]);
  const { data: papers, isLoading: papersLoading } = useCollection<Paper>(papersQuery);

  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc"), limit(9)), [firestore]);
  const { data: recentCombos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);

  const isLoading = papersLoading || combosLoading;

  return (
    <AppLayout>
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
                      <h2 className="text-xl font-headline font-bold gradient-text">Important Notes & Tricks</h2>
                       <Link href="/combos">
                          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">सभी देखें <ChevronRight className="w-4 h-4 ml-1"/></Button>
                      </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      {recentCombos.map((combo, index) => (
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
