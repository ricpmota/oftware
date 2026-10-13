import { describe, expect, it } from 'vitest';
import { buildPaciente360LembreteDraft } from '@/lib/paciente360/paciente360LembreteDraft';
import { getPaciente360PrimaryAction } from '@/lib/paciente360/paciente360QuickActions';
import {
  buildPaciente360WhatsAppMessage,
  buildPaciente360WhatsAppUrl,
  cleanPhoneBr,
} from '@/lib/paciente360/paciente360WhatsAppMessages';
import {
  formatIndicacaoPhrase,
  mergeWhatsAppLeadPresets,
  renderWhatsAppLeadPresetBody,
  suggestWhatsAppLeadPresetDefaultKey,
} from '@/lib/paciente360/whatsappLeadPresetDefaults';
import type { Paciente360Summary } from '@/types/paciente360';
import type { LeadMedico } from '@/types/leadMedico';
import type { WhatsAppLeadPreset } from '@/types/whatsappLeadPreset';

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
      lead,
      { organizationName: 'Clínica Exemplo' }
    );
    expect(msg).toContain('Maria');
    expect(msg).not.toContain('Oftware');
    const url = buildPaciente360WhatsAppUrl(lead.telefone, msg);
    expect(url).toContain('https://wa.me/5511987654321?text=');
  });

  it('usa DDI do paciente e não prefixa 55 em número dos EUA', () => {
    const url = buildPaciente360WhatsAppUrl('(713) 732-6616', 'Olá João!', {
      telefone: '7137326616',
      telefoneDdi: '1',
    });
    expect(url).toBe(`https://wa.me/17137326616?text=${encodeURIComponent('Olá João!')}`);
  });

  it('usa bem-vindo com indicação e nunca Oftware', () => {
    const msg = buildPaciente360WhatsAppMessage(
      summary({
        statusComposto: 'pendente',
        proximaAcao: { tipo: 'iniciar', label: 'Iniciar acompanhamento', prioridade: 90 },
      }),
      {
        ...lead,
        status: 'nao_qualificado',
        referral: { type: 'paciente', sourceName: 'Adelia' },
      },
      { organizationName: 'Método Oft' }
    );
    expect(msg).toContain('por indicação de Adelia');
    expect(msg).toContain('Posso te ajudar?');
    expect(msg).not.toContain('Oftware');
  });

  it('bem-vindo sem trecho de indicação quando origem é Direto', () => {
    const msg = buildPaciente360WhatsAppMessage(
      summary({
        statusComposto: 'pendente',
        proximaAcao: { tipo: 'iniciar', label: 'Iniciar acompanhamento', prioridade: 90 },
      }),
      {
        ...lead,
        status: 'nao_qualificado',
        referral: { type: 'medico', sourceName: 'Dr. João' },
      }
    );
    expect(msg).not.toContain('indicação');
    expect(msg).toContain('emagrecimento. Posso te ajudar?');
  });
});

describe('whatsappLeadPresetDefaults', () => {
  it('renderiza placeholders', () => {
    expect(
      renderWhatsAppLeadPresetBody('Olá, {nome} — {organizacao}{indicacao}', {
        nome: 'Maria Silva',
        organizacao: 'Clínica X',
        referral: { type: 'nutricionista', sourceName: 'Adelia' },
      })
    ).toBe('Olá, Maria — Clínica X por indicação de Adelia');
  });

  it('formatIndicacaoPhrase omite Direto e desconhecido', () => {
    expect(formatIndicacaoPhrase({ type: 'medico', sourceName: 'Dr. X' })).toBe('');
    expect(formatIndicacaoPhrase({ type: 'dr_link', sourceName: 'Dr. X' })).toBe('');
    expect(formatIndicacaoPhrase({ type: 'desconhecido' })).toBe('');
    expect(formatIndicacaoPhrase({ type: 'paciente', sourceName: 'Adelia' })).toBe(
      ' por indicação de Adelia'
    );
  });

  it('sugere preset por contexto', () => {
    expect(
      suggestWhatsAppLeadPresetDefaultKey({ proximaAcaoTipo: 'cobrar_pagamento' })
    ).toBe('pagamento');
    expect(
      suggestWhatsAppLeadPresetDefaultKey({ statusComposto: 'pendente' })
    ).toBe('bem_vindo');
  });

  it('mescla override do médico sobre o padrão', () => {
    const stored: WhatsAppLeadPreset[] = [
      {
        id: 'continuidade',
        medicoId: 'm1',
        title: 'Continuidade custom',
        body: 'Oi {nome}, aqui é a {organizacao}.',
        isDefault: true,
        defaultKey: 'continuidade',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'c1',
        medicoId: 'm1',
        title: 'Boas-vindas',
        body: 'Bem-vinda, {nome}!',
        isDefault: false,
        order: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const merged = mergeWhatsAppLeadPresets('m1', stored);
    expect(merged).toHaveLength(6);
    expect(merged.find((p) => p.defaultKey === 'continuidade')?.title).toBe('Continuidade custom');
    expect(merged[merged.length - 1].title).toBe('Boas-vindas');
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
