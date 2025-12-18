"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpenCheck } from 'lucide-react';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-purple-800 to-teal-600">
      <div className="text-center animate-fade-in-zoom">
        <div className="inline-block p-4 bg-white/10 rounded-2xl mb-6 shadow-lg">
          <BookOpenCheck className="w-20 h-20 text-white" />
        </div>
        <h1 className="font-headline text-4xl sm:text-5xl font-bold text-white tracking-tight">
          MPPSC & Civil Notes
        </h1>
        <p className="mt-4 text-lg text-white/80">
          आपकी सफलता का साथी
        </p>
      </div>
      <div className="absolute bottom-5 text-white/50 text-sm">
        Loading...
      </div>
    </div>
  );
}
