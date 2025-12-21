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

    if (!script) {
      // If not, create and append it to the document body.
      script = document.createElement('script');
      script.src = CASHFREE_SDK_URL;
      script.async = true;
      document.body.appendChild(script);
    }
    
    const handleLoad = () => {
      setIsReady(true);
    };

    const handleError = () => {
      setError("कैशफ्री पेमेंट SDK लोड करने में विफल। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।");
    };

    // Add event listeners to the script tag.
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    // Cleanup function to remove event listeners when the component unmounts.
    return () => {
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
    };
  }, []);

  return { isReady, error };
}
