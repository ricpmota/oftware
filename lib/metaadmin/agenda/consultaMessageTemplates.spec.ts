import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONSULTA_CONFIRMACAO_BODY,
  DEFAULT_CONSULTA_LEMBRETE_PACIENTE_BODY,
  buildConsultaTemplateVars,
  renderConsultaMessageTemplate,
} from '@/lib/metaadmin/agenda/consultaMessageTemplates';
import { MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER } from '@/types/medicoAgenda';
import { listAutomationCenterCatalog } from '@/lib/metaadmingeral/automationCenterCatalog';
import { listTemplatesByAutomationId } from '@/lib/metaadmingeral/automationCenterTemplates';
import { MEDICO_EVENT_AUTOMATION_IDS } from '@/lib/whatsapp/canalChatTemplates';

describe('consultaMessageTemplates', () => {
  const vars = buildConsultaTemplateVars({
    pacienteNome: 'Maria Silva',
    medicoNome: 'Dr. Ricardo',
    date: '2026-09-15',
    startTime: '14:00',
    endTime: '14:30',
  });

  it('substitui {nome} e {medico} no texto padrão de confirmação', () => {
    const texto = renderConsultaMessageTemplate(DEFAULT_CONSULTA_CONFIRMACAO_BODY, vars);
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Dr. Ricardo');
    expect(texto).toContain('14:00 às 14:30');
    expect(texto).not.toContain('{nome}');
  });

  it('aceita placeholders antigos {{nome_paciente}} junto com {nome}', () => {
    const texto = renderConsultaMessageTemplate(
      `Oi, ${MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER} e {nome}.`,
      vars,
    );
    expect(texto).toBe('Oi, Maria e Maria.');
  });

  it('preenche o lembrete do paciente', () => {
    const lembrete = renderConsultaMessageTemplate(DEFAULT_CONSULTA_LEMBRETE_PACIENTE_BODY, vars);
    expect(lembrete).toContain('30 minutos');
    expect(lembrete).toContain('14:00');
    expect(lembrete).not.toContain('{horario_inicio}');
  });
});

describe('automações de evento do médico', () => {
  it('estão no catálogo com ativação pelo médico e template publicado', () => {
    const catalog = listAutomationCenterCatalog();
    for (const id of MEDICO_EVENT_AUTOMATION_IDS) {
      const item = catalog.find((row) => row.id === id);
      expect(item, id).toBeDefined();
      expect(item?.allowDoctorActivation, id).toBe(true);
      expect(item?.status, id).toBe('active');
      expect(listTemplatesByAutomationId(id).some((tpl) => tpl.status === 'published'), id).toBe(
        true,
      );
    }
  });
});
