import { describe, expect, it } from 'vitest';
import { CANAL_CHAT_SESSION_ID } from '@/lib/whatsapp/canalChatOwner';
import {
  extractWhatsappSenderPhone,
  isCanalChatOkText,
  isCanalChatSessionId,
  isInboundTextMessage,
  parseCanalChatInboundPayload,
  phoneLookupVariants,
  summarizeCanalChatInbound,
} from '@/lib/whatsapp/canalChatInboundMessage';
import { ensureCanalChatOkConfirmation } from '@/lib/whatsapp/boasVindasTratamentoMessage';

describe('confirmação OK do Canal Chat', () => {
  it('aceita apenas OK após trim e caixa', () => {
    expect(isCanalChatOkText('OK')).toBe(true);
    expect(isCanalChatOkText('ok')).toBe(true);
    expect(isCanalChatOkText('Ok')).toBe(true);
    expect(isCanalChatOkText('  ok  ')).toBe(true);
    expect(isCanalChatOkText('OK ✅')).toBe(true);
    expect(isCanalChatOkText('Ok.')).toBe(true);
    expect(isCanalChatOkText('ok!')).toBe(true);
    expect(isCanalChatOkText('*Ok*')).toBe(true);
  });

  it('rejeita frases que só contém ok', () => {
    expect(isCanalChatOkText('ok obrigado')).toBe(false);
    expect(isCanalChatOkText('está ok')).toBe(false);
    expect(isCanalChatOkText('ok doutor')).toBe(false);
    expect(isCanalChatOkText('O K')).toBe(false);
  });

  it('reconhece a sessão institucional', () => {
    expect(isCanalChatSessionId(CANAL_CHAT_SESSION_ID)).toBe(true);
    expect(isCanalChatSessionId('canal_chat')).toBe(true);
    expect(isCanalChatSessionId('org_x_doctor_y')).toBe(false);
    expect(isCanalChatSessionId('custom', 'custom')).toBe(true);
  });

  it('extrai telefone de JID individual e ignora grupo/lid', () => {
    expect(extractWhatsappSenderPhone('5583999999999@c.us')).toBe('5583999999999');
    expect(extractWhatsappSenderPhone('120363@g.us')).toBeNull();
    expect(extractWhatsappSenderPhone('1234567890@lid')).toBeNull();
  });

  it('só trata mensagem de texto', () => {
    expect(isInboundTextMessage('chat')).toBe(true);
    expect(isInboundTextMessage('')).toBe(true);
    expect(isInboundTextMessage('ptt')).toBe(false);
    expect(isInboundTextMessage('image')).toBe(false);
  });

  it('parseia payload WPPConnect onmessage', () => {
    const parsed = parseCanalChatInboundPayload({
      event: 'onmessage',
      session: CANAL_CHAT_SESSION_ID,
      from: '5583999999999@c.us',
      body: 'OK',
      type: 'chat',
      isGroupMsg: false,
      fromMe: false,
      id: 'true_5583999999999@c.us_ABC',
    });
    expect(parsed?.phone).toBe('5583999999999');
    expect(parsed?.text).toBe('OK');
    expect(parsed?.isGroup).toBe(false);
    expect(parsed?.sessionId).toBe(CANAL_CHAT_SESSION_ID);
  });

  it('aceita payload WPPConnect com wook e type onmessage', () => {
    const parsed = parseCanalChatInboundPayload({
      wook: 'onmessage',
      session: CANAL_CHAT_SESSION_ID,
      from: '5583999999999@c.us',
      body: 'Ok',
      type: 'onmessage',
    });
    expect(parsed?.phone).toBe('5583999999999');
    expect(parsed?.text).toBe('Ok');
    expect(isInboundTextMessage(parsed?.type || '', parsed?.text || '')).toBe(true);
  });

  it('lê Ok com from @lid usando senderPn', () => {
    const parsed = parseCanalChatInboundPayload({
      event: 'onmessage',
      session: CANAL_CHAT_SESSION_ID,
      from: '123456789012345@lid',
      senderPn: '5583999999999@c.us',
      body: 'Ok',
      type: 'chat',
      fromMe: false,
    });
    expect(parsed?.phone).toBe('5583999999999');
    expect(parsed?.text).toBe('Ok');
  });

  it('se Ok for digitado no aparelho do Canal Chat, usa o telefone de destino', () => {
    const parsed = parseCanalChatInboundPayload({
      event: 'onmessage',
      session: CANAL_CHAT_SESSION_ID,
      from: '5583111111111@c.us',
      to: '5583999999999@c.us',
      body: 'Ok',
      type: 'chat',
      fromMe: true,
    });
    expect(parsed?.fromMe).toBe(true);
    expect(parsed?.phone).toBe('5583999999999');
  });

  it('ignora eventos que não são mensagem', () => {
    expect(
      parseCanalChatInboundPayload({
        event: 'onack',
        session: CANAL_CHAT_SESSION_ID,
        from: '5583999999999@c.us',
        body: 'OK',
      }),
    ).toBeNull();
  });

  it('não duplica o bloco OK em template que já pede confirmação', () => {
    const once = ensureCanalChatOkConfirmation(
      'Olá!\n\nPara confirmar que este canal está funcionando corretamente, responda apenas:\n\nOK',
    );
    const twice = ensureCanalChatOkConfirmation(once);
    expect(twice).toBe(once);
  });

  it('gera variantes de telefone para lookup', () => {
    const variants = phoneLookupVariants('5583999999999');
    expect(variants).toContain('5583999999999');
    expect(variants).toContain('83999999999');
  });

  it('Teste A/B: Ok e OK ✅ normalizam como OK', () => {
    expect(isCanalChatOkText('Ok')).toBe(true);
    expect(isCanalChatOkText('OK ✅')).toBe(true);
  });

  it('Teste C: ok obrigado não confirma', () => {
    expect(isCanalChatOkText('ok obrigado')).toBe(false);
  });

  it('Teste D: from @lid sem senderPn ainda devolve chatId', () => {
    const parsed = parseCanalChatInboundPayload({
      event: 'onmessage',
      session: CANAL_CHAT_SESSION_ID,
      from: '123456789012345@lid',
      body: 'Ok',
      type: 'chat',
      fromMe: false,
    });
    expect(parsed?.phone).toBeNull();
    expect(parsed?.chatIds).toContain('123456789012345@lid');
    expect(parsed?.hasSenderPn).toBe(false);
    expect(isCanalChatOkText(parsed?.text || '')).toBe(true);
  });

  it('Teste D: @lid com senderPn extrai telefone e chatId', () => {
    const parsed = parseCanalChatInboundPayload({
      event: 'onmessage',
      session: CANAL_CHAT_SESSION_ID,
      from: '123456789012345@lid',
      senderPn: '5583999999999@c.us',
      chatId: '123456789012345@lid',
      body: 'Ok',
      type: 'chat',
      fromMe: false,
    });
    expect(parsed?.phone).toBe('5583999999999');
    expect(parsed?.chatIds).toContain('123456789012345@lid');
    expect(parsed?.hasSenderPn).toBe(true);
  });

  it('diagnóstico não inclui texto nem secret', () => {
    const diagnostic = summarizeCanalChatInbound({
      event: 'onmessage',
      session: CANAL_CHAT_SESSION_ID,
      from: '5583999999999@c.us',
      body: 'Ok secreto clínico',
      type: 'chat',
      senderPn: '5583999999999@c.us',
    });
    expect(diagnostic.hasBody).toBe(true);
    expect(diagnostic.normalizedAsOk).toBe(false);
    expect(diagnostic.hasSenderPn).toBe(true);
    expect(JSON.stringify(diagnostic)).not.toContain('secreto');
    expect(JSON.stringify(diagnostic)).not.toContain('5583999999999');
  });
});
