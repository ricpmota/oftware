'use client';

import { auth } from '@/lib/firebase';
import {
  buildNutriCheckInWhatsAppMessage,
  nutriCheckInWhatsAppHref,
  type NutriCheckInWhatsAppKind,
} from '@/lib/nutri/buildNutriCheckInWhatsAppMessage';
import type { InternationalPhoneFields } from '@/lib/phone/buildWhatsappUrl';

export async function openNutriCheckInWhatsApp(params: {
  patientId: string;
  weekKey: string;
  patientName: string;
  phoneDigits: string;
  phoneFields?: InternationalPhoneFields;
  kind?: NutriCheckInWhatsAppKind;
}): Promise<{ url: string; href: string }> {
  const fields = params.phoneFields ?? { telefone: params.phoneDigits };
  const hrefReady = nutriCheckInWhatsAppHref(fields, 'placeholder');
  if (!hrefReady) {
    throw new Error('Paciente sem telefone cadastrado.');
  }

  const user = auth.currentUser;
  if (!user) throw new Error('Faça login para enviar o WhatsApp.');
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
  const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !json?.url) {
    throw new Error(json?.error || 'Não foi possível gerar o link.');
  }

  const message = buildNutriCheckInWhatsAppMessage({
    pacienteNome: params.patientName,
    url: json.url,
    kind: params.kind,
  });
  const href = nutriCheckInWhatsAppHref(fields, message);
  if (!href) throw new Error('Paciente sem telefone cadastrado.');
  return { url: json.url, href };
}
