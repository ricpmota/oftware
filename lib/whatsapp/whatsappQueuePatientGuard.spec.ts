import { describe, expect, it } from 'vitest';
import {
  isWhatsappQueueSkipForMissingPatient,
  shouldHideWhatsappAgendaItemForRoster,
  WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO,
  WHATSAPP_QUEUE_SKIP_PACIENTE_NAO_ENCONTRADO,
} from '@/lib/whatsapp/whatsappQueuePatientGuard';

describe('whatsappQueuePatientGuard', () => {
  it('reconhece erros de paciente ausente ou fora do quadro', () => {
    expect(isWhatsappQueueSkipForMissingPatient(WHATSAPP_QUEUE_SKIP_PACIENTE_NAO_ENCONTRADO)).toBe(
      true,
    );
    expect(isWhatsappQueueSkipForMissingPatient('Paciente não encontrado (double-check data).')).toBe(
      true,
    );
    expect(isWhatsappQueueSkipForMissingPatient(WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO)).toBe(
      true,
    );
    expect(isWhatsappQueueSkipForMissingPatient('WhatsApp não está conectado.')).toBe(false);
  });

  it('esconde da agenda quem não está no quadro do médico', () => {
    const rosterIds = new Set(['p1']);
    expect(shouldHideWhatsappAgendaItemForRoster({ patientId: 'p2', rosterIds })).toBe(true);
    expect(shouldHideWhatsappAgendaItemForRoster({ patientId: 'p1', rosterIds })).toBe(false);
    expect(shouldHideWhatsappAgendaItemForRoster({ patientId: '', rosterIds })).toBe(false);
  });
});
