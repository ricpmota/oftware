'use client';

import OftPayCursoScreen from '@/components/oftpay/OftPayCursoScreen';

export default function CarplayCursoPage() {
  return (
    <OftPayCursoScreen
      requireAuth={false}
      homeHref="/carplay"
      initialTab="planner"
      useCarplaySession
    />
  );
}
