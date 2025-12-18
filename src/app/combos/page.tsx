
"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, LoaderCircle, Cloud } from "lucide-react";
import { collection, query, orderBy } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Combo } from "@/lib/types";
import Image from "next/image";

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
        <>
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
        </>
    );
}

export default function AllCombosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const firestore = useFirestore();
  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc")), [firestore]);
  const { data: allCombos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);

  const filteredCombos = useMemo(() => {
    if (!allCombos) return [];
    if (!searchTerm) return allCombos;
    const lowercasedFilter = searchTerm.toLowerCase();
    return allCombos.filter(combo => 
        combo.name.toLowerCase().includes(lowercasedFilter) ||
        combo.description.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, allCombos]);

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col bg-background">
        <div className="p-6">
            <h1 className="font-headline text-3xl font-bold gradient-text mb-4">सभी PDF कॉम्बोज़</h1>
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  placeholder="कोई कॉम्बो खोजें…"
                  className="w-full h-14 pl-12 pr-4 rounded-full bg-card border-2 focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 pt-0 overflow-y-auto">
           {combosLoading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
           
           {!combosLoading && (!filteredCombos || filteredCombos.length === 0) && (
             <p className="text-center text-muted-foreground p-8">
               {searchTerm ? `"${searchTerm}" के लिए कोई परिणाम नहीं मिला।` : "अभी कोई कॉम्बो उपलब्ध नहीं है।"}
             </p>
           )}

          {filteredCombos && filteredCombos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredCombos.map((combo, index) => (
                    <ComboItem key={combo.id} combo={combo} index={index} />
                ))}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
