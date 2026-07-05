import { describe, expect, it } from 'vitest';
import { buildPaciente360LembreteDraft } from '@/lib/paciente360/paciente360LembreteDraft';
import { getPaciente360PrimaryAction } from '@/lib/paciente360/paciente360QuickActions';
import {
  buildPaciente360WhatsAppMessage,
  buildPaciente360WhatsAppUrl,
  cleanPhoneBr,
} from '@/lib/paciente360/paciente360WhatsAppMessages';
import type { Paciente360Summary } from '@/types/paciente360';
import type { LeadMedico } from '@/types/leadMedico';

const lead: LeadMedico = {
  id: 'l1',
  uid: 'u1',
  email: 'maria@test.com',
  name: 'Maria Silva',
  telefone: '(11) 98765-4321',
  status: 'em_tratamento',
  dataStatus: new Date(),
  medicoId: 'm1',
};

function summary(overrides: Partial<Paciente360Summary> = {}): Paciente360Summary {
  return {
    pacienteId: 'p1',
    nome: 'Maria Silva',
    statusComposto: 'em_tratamento',
    alertas: [],
    risco: { nivel: 'baixo', motivos: [] },
    tagsAutomaticas: [],
    proximaAcao: { tipo: 'acompanhar', label: 'Acompanhar evolução', prioridade: 10 },
    ...overrides,
  };
}

describe('paciente360WhatsAppMessages', () => {
  it('monta URL com telefone BR e mensagem codificada', () => {
    expect(cleanPhoneBr('(11) 98765-4321')).toBe('5511987654321');
    const msg = buildPaciente360WhatsAppMessage(
      summary({ proximaAcao: { tipo: 'cobrar_pagamento', label: 'Cobrar', prioridade: 90 } }),
      lead
    );
    expect(msg).toContain('Maria');
    const url = buildPaciente360WhatsAppUrl(lead.telefone, msg);
    expect(url).toContain('https://wa.me/5511987654321?text=');
  });
});

describe('getPaciente360PrimaryAction', () => {
  it('prioriza cobrança com whatsapp', () => {
    const action = getPaciente360PrimaryAction(
      summary({ proximaAcao: { tipo: 'cobrar_pagamento', label: 'Cobrar pagamento', prioridade: 90 } })
    );
    expect(action.kind).toBe('whatsapp');
    expect(action.label).toBe('Cobrar pagamento');
  });

  it('usa prontuário para avaliar aplicação', () => {
    const action = getPaciente360PrimaryAction(
      summary({ proximaAcao: { tipo: 'avaliar_aplicacao', label: 'Avaliar aplicação', prioridade: 80 } })
    );
    expect(action.kind).toBe('prontuario');
  });
});

describe('buildPaciente360LembreteDraft', () => {
  it('mapeia tag de cobrança', () => {
    const draft = buildPaciente360LembreteDraft(
      summary({ proximaAcao: { tipo: 'cobrar_pagamento', label: 'Cobrar pagamento', prioridade: 90 } })
    );
    expect(draft?.tag).toBe('Cobrança');
    expect(draft?.texto).toBe('Cobrar pagamento');
  });
});
