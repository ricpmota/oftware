import { describe, expect, it } from 'vitest';
import { computeLembreteNotificarEm } from '@/lib/lembrete/lembreteWhatsappNotify';
import {
  buildNutriConsultaCancelamentoPacienteTexto,
  buildNutriConsultaConfirmacaoPacienteTexto,
  buildNutriConsultaLembretePacienteTexto,
  buildNutriConsultaReminderTexto,
  buildNutriConsultaRemarcacaoPacienteTexto,
  parseNutriConsultaReminderAviso,
} from '@/lib/nutri/agenda/consultaReminder';

describe('nutri consulta reminder', () => {
  it('aceita só as três opções de antecedência', () => {
    expect(parseNutriConsultaReminderAviso('no_horario')).toBe('no_horario');
    expect(parseNutriConsultaReminderAviso('30_min_antes')).toBe('30_min_antes');
    expect(parseNutriConsultaReminderAviso('1_hora_antes')).toBe('1_hora_antes');
    expect(parseNutriConsultaReminderAviso('disabled')).toBe('30_min_antes');
    expect(parseNutriConsultaReminderAviso(undefined)).toBe('30_min_antes');
  });

  it('calcula o disparo do Canal Chat no horário, 30 min e 1 h antes', () => {
    const data = '2026-08-26';
    const horario = '16:00';
    expect(computeLembreteNotificarEm(data, horario, 'no_horario')?.toISOString()).toBe(
      '2026-08-26T19:00:00.000Z'
    );
    expect(computeLembreteNotificarEm(data, horario, '30_min_antes')?.toISOString()).toBe(
      '2026-08-26T18:30:00.000Z'
    );
    expect(computeLembreteNotificarEm(data, horario, '1_hora_antes')?.toISOString()).toBe(
      '2026-08-26T18:00:00.000Z'
    );
  });

  it('monta o texto do alerta com paciente e horário', () => {
    const texto = buildNutriConsultaReminderTexto({
      pacienteNome: 'Maria Souza',
      date: '2026-08-26',
      startTime: '16:00',
      endTime: '17:00',
    });
    expect(texto).toContain('Maria Souza');
    expect(texto).toContain('16:00');
    expect(texto).toContain('17:00');
  });
});

describe('mensagens WhatsApp para o paciente', () => {
  it('confirma o horário agendado com data e nutricionista', () => {
    const texto = buildNutriConsultaConfirmacaoPacienteTexto({
      pacienteNome: 'Maria Souza',
      nutriNome: 'Ricardo Mota',
      date: '2026-08-26',
      startTime: '16:00',
      endTime: '17:00',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Ricardo Mota');
    expect(texto).toContain('16:00 às 17:00');
    expect(texto.toLowerCase()).toContain('confirmada');
  });

  it('lembra 30 minutos antes no dia da consulta', () => {
    const texto = buildNutriConsultaLembretePacienteTexto({
      pacienteNome: 'Maria Souza',
      nutriNome: 'Ricardo Mota',
      date: '2026-08-26',
      startTime: '16:00',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('30 minutos');
    expect(texto).toContain('16:00');
  });

  it('informa a remarcação com o horário antigo e o novo', () => {
    const texto = buildNutriConsultaRemarcacaoPacienteTexto({
      pacienteNome: 'Maria Souza',
      nutriNome: 'Ricardo Mota',
      oldDate: '2026-08-26',
      oldStartTime: '16:00',
      oldEndTime: '17:00',
      date: '2026-08-27',
      startTime: '14:00',
      endTime: '15:00',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Informo que');
    expect(texto.toLowerCase()).toContain('remarcada');
    expect(texto).toContain('16:00 às 17:00');
    expect(texto).toContain('14:00 às 15:00');
    expect(texto).toContain('Ricardo Mota');
  });

  it('informa o cancelamento com a data e o horário original', () => {
    const texto = buildNutriConsultaCancelamentoPacienteTexto({
      pacienteNome: 'Maria Souza',
      nutriNome: 'Ricardo Mota',
      date: '2026-08-26',
      startTime: '16:00',
      endTime: '17:00',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Informo que');
    expect(texto.toLowerCase()).toContain('cancelada');
    expect(texto).toContain('16:00 às 17:00');
    expect(texto).toContain('Ricardo Mota');
  });
});
