import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isAmbiguousPostSendError,
  WhatsappProviderError,
} from '@/services/whatsappProviderClient';

const PROVIDER = readFileSync(
  resolve(__dirname, 'whatsappProviderClient.ts'),
  'utf8',
);

function err(message: string, code: string): WhatsappProviderError {
  return new WhatsappProviderError(message, code);
}

describe('isAmbiguousPostSendError — interpretação pós-envio', () => {
  it('1. SERVER_ERROR genérico é falha dura', () => {
    expect(isAmbiguousPostSendError(err('Erro ao enviar a mensagem.', 'SERVER_ERROR'))).toBe(
      false,
    );
  });

  it('2. findChat: new chat not found é falha dura', () => {
    expect(
      isAmbiguousPostSendError(
        err('findChat: new chat not found 14002012823690@lid', 'SERVER_ERROR'),
      ),
    ).toBe(false);
  });

  it('3. invalid wid é falha dura', () => {
    expect(isAmbiguousPostSendError(err('invalid wid', 'SERVER_ERROR'))).toBe(false);
  });

  it('4. TIMEOUT permanece ambíguo', () => {
    expect(
      isAmbiguousPostSendError(
        err('Tempo esgotado ao comunicar com o servidor WPPConnect.', 'TIMEOUT'),
      ),
    ).toBe(true);
  });

  it('5. crash pós-envio getMessageById permanece ambíguo', () => {
    expect(
      isAmbiguousPostSendError(
        err("Cannot read properties of undefined (reading 'get')", 'SERVER_ERROR'),
      ),
    ).toBe(true);
    expect(
      isAmbiguousPostSendError(err('getMessageById failed after ack', 'SERVER_ERROR')),
    ).toBe(true);
  });

  it('6. Error sending + findChat continua falha (não mascarar destino)', () => {
    expect(
      isAmbiguousPostSendError(
        err('Error sending message: findChat: new chat not found 3690@lid', 'SERVER_ERROR'),
      ),
    ).toBe(false);
  });
});

describe('sendTestMessage — caminhos de envio intactos', () => {
  it('sucesso, retry e JID não foram alterados nesta correção', () => {
    expect(PROVIDER).toContain("result: 'ok'");
    expect(PROVIDER).toContain("result: 'ok_retry'");
    expect(PROVIDER).toContain("result: 'ok_ambiguous'");
    expect(PROVIDER).toContain("result: 'retry_alt_format'");
    expect(PROVIDER).toContain('async function resolveWhatsappChatId');
    expect(PROVIDER).toContain('/contact/pn-lid/');
    expect(PROVIDER).toContain('/check-number-status/');
    expect(PROVIDER).toContain('isLid');
    expect(PROVIDER).toContain('createChat: true');
    expect(PROVIDER).toContain('waitForAck: true');
    expect(PROVIDER).not.toContain("if (error.code === 'TIMEOUT' || error.code === 'SERVER_ERROR') return true");
  });
});
