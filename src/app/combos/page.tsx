
"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, LoaderCircle, Cloud } from "lucide-react";
import { collection, query, orderBy } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Combo } from "@/lib/types";
import Image from "next/image";

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

export default function AllCombosPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const combosQuery = useMemoFirebase(() => query(collection(firestore, "combos"), orderBy("createdAt", "desc")), [firestore]);
  const { data: allCombos, isLoading: combosLoading } = useCollection<Combo>(combosQuery);

  const filteredCombos = useMemo(() => {
    if (!allCombos) return [];
    return allCombos.filter(combo =>
      combo.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allCombos, searchTerm]);

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col bg-background p-4 sm:p-6">
        <div className="mb-6">
            <h1 className="font-headline text-3xl font-bold gradient-text">सभी PDF कॉम्बोज़</h1>
            <p className="text-muted-foreground">सभी उपलब्ध कॉम्बो पैक यहां देखें।</p>
        </div>

        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="कॉम्बो खोजें..."
            className="w-full pl-10 h-12 bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
           {combosLoading && <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>}
           
           {!combosLoading && filteredCombos.length === 0 && (
             <p className="text-center text-muted-foreground p-8">
               {searchTerm ? `"${searchTerm}" से कोई कॉम्बो नहीं मिला।` : "अभी कोई कॉम्बो उपलब्ध नहीं है।"}
             </p>
           )}

          {filteredCombos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
