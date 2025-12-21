"use client";

import { useState, useEffect } from 'react';

const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree-checkout.js";

/**
 * A custom hook to reliably load the Cashfree SDK and track its status.
 * @returns An object with `isReady` (boolean) and `error` (string | null).
 */
export function useCashfree() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the SDK is already available on the window object, we're ready.
    if (typeof window.cashfree !== 'undefined') {
      setIsReady(true);
      return;
    }

    // Find the script if it already exists in the DOM
    let script = document.querySelector(`script[src="${CASHFREE_SDK_URL}"]`);

    const handleLoad = () => {
        // Double-check if the cashfree object is available on window
        if (typeof window.cashfree !== 'undefined') {
            setIsReady(true);
        }
    };

    if (script) {
      // If the script exists, it might be loaded or still loading.
      // We check the window object again. If it's there, we're ready.
      if (typeof window.cashfree !== 'undefined') {
          setIsReady(true);
      } else {
        // If not, it's likely still loading, so we add an event listener.
        script.addEventListener('load', handleLoad);
      }
    } else {
      // If the script doesn't exist at all, create it.
      script = document.createElement('script');
      script.src = CASHFREE_SDK_URL;
      script.async = true;
      script.addEventListener('load', handleLoad);
      document.body.appendChild(script);
    }
    
    // Cleanup function to remove event listeners when the component unmounts.
    return () => {
      script?.removeEventListener('load', handleLoad);
    };
  }, []);

  return { isReady, error };
}
