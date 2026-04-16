'use client';

// Wrapper para ativar v2 com segurança
// Este arquivo escolhe entre a versão v2 (nova) e legacy (antiga)

import { Suspense } from 'react';
import MetaPersonalPageV2 from './page.v2';

// Flag para controlar qual versão usar
// Pode ser alterada via env: NEXT_PUBLIC_METAPERSONAL_V2=1
const USE_METAPERSONAL_V2 = process.env.NEXT_PUBLIC_METAPERSONAL_V2 === '1' || true; // Por padrão, usar v2

export default function MetaPersonalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">Carregando...</div>}>
      <MetaPersonalPageV2 />
    </Suspense>
  );
}
