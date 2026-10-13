'use client';

import { use, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { TrainingSessionExecutionWorkspace } from '@/components/trainingPlan/TrainingSessionExecutionWorkspace';
import { isTrainingSessionExecutionEnabled } from '@/components/trainingPlan/ActivePublishedTrainingPlanPanel';

export default function TreinoExecutionPage({
  params,
}: {
  params: Promise<{ executionId: string }>;
}) {
  const { executionId } = use(params);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserId(u?.uid ?? null);
      setReady(true);
    });
    return () => unsub();
  }, []);

  if (!isTrainingSessionExecutionEnabled()) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <p className="text-sm text-slate-600">Execução de treino indisponível no momento.</p>
      </div>
    );
  }

  if (!ready) {
    return <div className="min-h-dvh bg-[#0A1F44]" />;
  }

  if (!userId) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <p className="text-sm text-slate-600">Faça login para continuar o treino.</p>
      </div>
    );
  }

  return (
    <TrainingSessionExecutionWorkspace executionId={executionId} userId={userId} />
  );
}
