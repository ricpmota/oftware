import { describe, expect, it } from 'vitest';
import { buildContatoChatMetadata, CANAL_CHAT_LINK_TITLE } from './contatoChatMetadata';

describe('buildContatoChatMetadata', () => {
  it('usa o título do serviço Canal Chat no link compartilhado', () => {
    const meta = buildContatoChatMetadata();
    expect(meta.title).toBe(CANAL_CHAT_LINK_TITLE);
    expect(meta.openGraph?.title).toBe(CANAL_CHAT_LINK_TITLE);
    expect(meta.openGraph?.siteName).toBe('Canal Chat');
    expect(String(meta.description)).toMatch(/Canal Chat/);
  });

  it('inclui o profissional no título quando o canal está disponível', () => {
    const meta = buildContatoChatMetadata({ displayName: 'Dr. Ricardo Mota' });
    expect(meta.title).toBe('Canal Chat · Dr. Ricardo Mota');
    expect(meta.openGraph?.title).toBe('Canal Chat · Dr. Ricardo Mota');
  });

  it('mantém o serviço no título quando o contato está indisponível', () => {
    const meta = buildContatoChatMetadata({ available: false });
    expect(meta.title).toBe('Canal Chat — contato indisponível');
  });
});
