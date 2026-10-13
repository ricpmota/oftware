import { describe, expect, it } from 'vitest';
import {
  appendWebhookSecretToUrl,
  readWebhookSecret,
  webhookSecretsMatch,
} from '@/lib/whatsapp/webhookSecret';

describe('secret do webhook inbound', () => {
  it('aceita o secret na query string (WPPConnect não envia extraHeaders)', () => {
    const request = {
      headers: new Headers(),
      nextUrl: new URL('https://www.oftware.com.br/api/whatsapp/inbound?secret=abc123'),
    };
    expect(readWebhookSecret(request)).toBe('abc123');
    expect(webhookSecretsMatch('abc123', readWebhookSecret(request))).toBe(true);
  });

  it('também lê o secret de request.url', () => {
    const request = {
      headers: new Headers(),
      url: 'https://www.oftware.com.br/api/whatsapp/inbound?secret=abc123',
    };
    expect(readWebhookSecret(request)).toBe('abc123');
  });

  it('anexa secret na URL se ainda não existir', () => {
    expect(appendWebhookSecretToUrl('https://www.oftware.com.br/api/whatsapp/inbound', 'xyz')).toBe(
      'https://www.oftware.com.br/api/whatsapp/inbound?secret=xyz',
    );
  });
});
