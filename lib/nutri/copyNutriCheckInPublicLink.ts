'use client';

import { auth } from '@/lib/firebase';

export async function copyNutriCheckInPublicLink(params: {
  patientId: string;
  weekKey: string;
}): Promise<{ url: string; token: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login para copiar o link.');
  const idToken = await user.getIdToken();
  const res = await fetch('/api/checkin-nutri/link', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      patientId: params.patientId,
      weekKey: params.weekKey,
    }),
  });
  const json = (await res.json().catch(() => null)) as { url?: string; token?: string; error?: string } | null;
  if (!res.ok || !json?.url) {
    throw new Error(json?.error || 'Não foi possível gerar o link.');
  }
  try {
    await navigator.clipboard.writeText(json.url);
  } catch {
    throw new Error('Link gerado, mas não foi possível copiar. Copie manualmente: ' + json.url);
  }
  return { url: json.url, token: json.token || '' };
}
