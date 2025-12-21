"use client";

import { useState, useEffect } from 'react';

// This hook is no longer used, but kept for reference.
// A direct script tag in layout.tsx is now used for more reliability.
export function useCashfree() {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (typeof window.cashfree !== 'undefined') {
      setIsReady(true);
    }
  }, []);

  return { isReady, error: null };
}
