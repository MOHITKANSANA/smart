import React from 'react';
import AdGatewayClient from "./AdGatewayClient";

// This page must be fully client-rendered to avoid build errors on Netlify,
// as it uses hooks like useSearchParams that are not compatible with static generation.
export default function AdGatewayPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <AdGatewayClient />
    </React.Suspense>
  );
}
