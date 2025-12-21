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
    // If the SDK is already loaded (e.g., from a previous page navigation), we're done.
    if (typeof window.cashfree !== 'undefined') {
      setIsReady(true);
      return;
    }

    // Check if the script tag already exists in the document.
    let script = document.querySelector(`script[src="${CASHFREE_SDK_URL}"]`);

    const handleLoad = () => {
      setIsReady(true);
    };

    if (!script) {
      // If not, create and append it to the document body.
      script = document.createElement('script');
      script.src = CASHFREE_SDK_URL;
      script.async = true;
      script.addEventListener('load', handleLoad);
      document.body.appendChild(script);
    } else {
        // if script already exists, it might be loading, or it might have failed.
        // if window.cashfree is not there yet, we add a listener.
        script.addEventListener('load', handleLoad);
    }
    
    // Cleanup function to remove event listeners when the component unmounts.
    return () => {
      script?.removeEventListener('load', handleLoad);
    };
  }, []);

  return { isReady, error };
}
