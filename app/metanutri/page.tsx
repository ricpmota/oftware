'use client';

// ETAPA A2 - Wrapper para ativar v2 com segurança
// Este arquivo escolhe entre a versão v2 (nova) e legacy (antiga)

import MetaNutriPageV2 from './page.v2';

// Flag para controlar qual versão usar
// Pode ser alterada via env: NEXT_PUBLIC_METANUTRI_V2=1
const USE_METANUTRI_V2 = process.env.NEXT_PUBLIC_METANUTRI_V2 === '1' || true; // Por padrão, usar v2

export default function MetaNutriPage() {
  if (USE_METANUTRI_V2) {
    return <MetaNutriPageV2 />;
  }
  
  // Fallback para legacy (se necessário no futuro)
  // Por enquanto, sempre usar v2
  return <MetaNutriPageV2 />;
}
