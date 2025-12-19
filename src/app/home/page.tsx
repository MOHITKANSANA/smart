
"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, ChevronRight } from "lucide-react";
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
    const gradientClass = comboGradients[index % comboGradients.length];

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push(`/combos/${combo.id}`);
    };

    return (
        <a href={`/combos/${combo.id}`} onClick={handleClick} className="block group">
            <Card className="text-white border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105 aspect-square flex flex-col justify-center items-center p-2 overflow-hidden relative text-center">
                 <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-500 group-hover:saturate-150", gradientClass)} />
                 <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>
                 <div className="absolute inset-0 animate-pulse-slow bg-gradient-to-br from-white/10 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 <div className="z-10 p-2 flex items-center justify-center h-full">
                    <CardTitle className="text-sm font-bold line-clamp-3 drop-shadow-md">{combo.name}</CardTitle>
                 </div>
            </Card>
        </a>
    );
}

export default function HomePage() {
  const firestore = useFirestore();
  const router = useRouter();

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
                  <h2 className="text-xl font-headline font-bold gradient-text">Subjects</h2>
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
        </div>
      </main>
    </AppLayout>
  );
}

    