import { describe, expect, it } from 'vitest';
import {
  buildMedicoConsultaConfirmacaoPacienteCanalChatTexto,
  buildMedicoConsultaConfirmacaoPacienteTexto,
  buildMedicoConsultaLembretePacienteTexto,
} from '@/lib/metaadmin/agenda/consultaReminder';

describe('mensagens de consulta médica', () => {
  it('confirma o horário no WhatsApp do médico', () => {
    const texto = buildMedicoConsultaConfirmacaoPacienteTexto({
      pacienteNome: 'Maria Silva',
      medicoNome: 'Dr. Ricardo Mota',
      date: '2026-09-01',
      startTime: '14:00',
      endTime: '15:00',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto.toLowerCase()).toContain('confirmada');
    expect(texto).toContain('14:00 às 15:00');
    expect(texto).toContain('neste WhatsApp');
  });

  it('confirma pelo Canal Chat sem pedir para chamar neste WhatsApp', () => {
    const texto = buildMedicoConsultaConfirmacaoPacienteCanalChatTexto({
      pacienteNome: 'Maria Silva',
      medicoNome: 'Dr. Ricardo Mota',
      date: '2026-09-01',
      startTime: '14:00',
      endTime: '15:00',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto.toLowerCase()).toContain('confirmada');
    expect(texto).toContain('14:00 às 15:00');
    expect(texto).not.toContain('neste WhatsApp');
  });

  it('lembra 30 minutos antes sem falar como se fosse o médico', () => {
    const texto = buildMedicoConsultaLembretePacienteTexto({
      pacienteNome: 'Maria Silva',
      medicoNome: 'Dr. Ricardo Mota',
      date: '2026-09-01',
      startTime: '14:00',
    });
    expect(texto).toContain('30 minutos');
    expect(texto).toContain('14:00');
    expect(texto).not.toContain('neste WhatsApp');
  });
});
