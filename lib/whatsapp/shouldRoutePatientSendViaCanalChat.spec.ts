import { describe, expect, it } from 'vitest';
import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';
import { shouldRoutePatientSendViaCanalChat } from '@/lib/whatsapp/shouldRoutePatientSendViaCanalChat';

describe('shouldRoutePatientSendViaCanalChat', () => {
  it('roteia quando o telefone do paciente é o mesmo do WhatsApp do médico', () => {
    expect(
      shouldRoutePatientSendViaCanalChat({
        ownerId: 'medico-1',
        patientPhone: '11999998888',
        ownerPhones: ['11999998888'],
      }),
    ).toBe(true);
  });

  it('roteia com DDI e 9º dígito em formatos diferentes', () => {
    expect(
      shouldRoutePatientSendViaCanalChat({
        ownerId: 'medico-1',
        patientPhone: '11988887777',
        ownerPhones: ['5511988887777'],
      }),
    ).toBe(true);
  });

  it('não roteia quando os números são diferentes', () => {
    expect(
      shouldRoutePatientSendViaCanalChat({
        ownerId: 'medico-1',
        patientPhone: '11999998888',
        ownerPhones: ['11911112222'],
      }),
    ).toBe(false);
  });

  it('não roteia quando o remetente já é o Canal Chat', () => {
    expect(
      shouldRoutePatientSendViaCanalChat({
        ownerId: CANAL_CHAT_OWNER_ID,
        patientPhone: '11999998888',
        ownerPhones: ['11999998888'],
      }),
    ).toBe(false);
  });

  it('roteia pelo telefone de cadastro do médico mesmo com WhatsApp conectado diferente', () => {
    expect(
      shouldRoutePatientSendViaCanalChat({
        ownerId: 'medico-1',
        patientPhone: '11988887777',
        ownerPhones: ['1133334444', '11988887777'],
      }),
    ).toBe(true);
  });

  it('não roteia sem telefone do médico', () => {
    expect(
      shouldRoutePatientSendViaCanalChat({
        ownerId: 'medico-1',
        patientPhone: '11999998888',
        ownerPhones: [null, '', undefined],
      }),
    ).toBe(false);
  });
});
