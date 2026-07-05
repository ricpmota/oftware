import { Suspense } from 'react';
import AcessarPageClient from '@/components/landing/AcessarPageClient';

export default function AcessarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A1F44] text-[#E8EDED]">
          Carregando...
        </div>
      }
    >
      <AcessarPageClient />
    </Suspense>
  );
}
