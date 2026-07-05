import type { LeadMedico } from '@/types/leadMedico';
import type { Paciente360Summary } from '@/types/paciente360';

export function cleanPhoneBr(telefone?: string | null): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function primeiroNome(lead: LeadMedico, summary?: Paciente360Summary): string {
  const raw = lead.name || summary?.nome || '';
  const first = raw.trim().split(/\s+/)[0];
  return first || 'tudo bem';
}

export function buildPaciente360WhatsAppMessage(
  summary: Paciente360Summary | undefined,
  lead: LeadMedico
): string {
  const nome = primeiroNome(lead, summary);
  const tipo = summary?.proximaAcao?.tipo;

  if (tipo === 'cobrar_pagamento') {
    return `Olá, ${nome}. Tudo bem? Estou passando para te lembrar sobre a pendência do seu acompanhamento. Podemos regularizar para manter seu tratamento em dia?`;
  }

  if (tipo === 'avaliar_aplicacao') {
    return `Olá, ${nome}. Tudo bem? Vi aqui que precisamos revisar sua aplicação/seguimento. Pode me atualizar como você está?`;
  }

  if (
    summary?.statusComposto === 'pendente' ||
    summary?.statusComposto === 'aguardando_marco_zero' ||
    summary?.proximaAcao?.label === 'Iniciar acompanhamento'
  ) {
    return `Olá, ${nome}. Tudo bem? Vamos dar continuidade ao seu acompanhamento pela Oftware?`;
  }

  return `Olá, ${nome}. Tudo bem? Estou acompanhando sua evolução por aqui. Como você está se sentindo nessa semana?`;
}

export function buildPaciente360WhatsAppUrl(
  telefone: string | undefined | null,
  message: string
): string | null {
  const phone = cleanPhoneBr(telefone);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
