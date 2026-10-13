/**
 * ETAPA 6.3.6 — paridade residual Comunicação /metapsi × /metanutri.
 * Não reescreve o painel; garante mesmo componente + chrome + branding.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const psiPage = readFileSync(resolve(__dirname, '../../app/metapsi/page.v2.tsx'), 'utf8');
const nutriPage = readFileSync(resolve(__dirname, '../../app/metanutri/page.v2.tsx'), 'utf8');

describe('MetaPsi Comunicação — paridade 6.3.6', () => {
  it('I — desktop usa OrganizacaoComunicacaoGmailPanel', () => {
    expect(psiPage).toContain("from '@/components/comunicacao/OrganizacaoComunicacaoGmailPanel'");
    expect(psiPage).toContain('<OrganizacaoComunicacaoGmailPanel');
    expect(nutriPage).toContain('<OrganizacaoComunicacaoGmailPanel');
  });

  it('J — mobile modal usa o mesmo painel (hideHeaderTitle + h-full)', () => {
    expect(psiPage).toContain('showMensagensComunicacaoModal');
    expect(psiPage).toContain('hideHeaderTitle: true');
    expect(psiPage).toContain("className: 'h-full min-h-0 rounded-lg'");
    expect(psiPage).toContain('z-[70]');
    expect(psiPage).toContain('pt-[max(0.75rem,env(safe-area-inset-top))]');
  });

  it('K — menu Comunicação usa Mail (não MessageSquare)', () => {
    expect(psiPage).toMatch(/\bMail\b/);
    expect(psiPage).not.toMatch(/\bMessageSquare\b/);
  });

  it('L — sem logo hardcoded MetaPsi / oftware-site-novo2 na Comunicação', () => {
    expect(psiPage).not.toContain('/oftware-site-novo2.png');
    expect(psiPage).toContain('resolveAssinaturaLogoUrl');
    expect(psiPage).toContain('organizationShellBranding?.logoMainUrl');
    expect(psiPage).toContain('shellLogoUrl: sidebarOrganizationLogoSrc');
  });

  it('M — nome/papel Psi passados corretamente', () => {
    expect(psiPage).toContain("role: 'psiquiatra'");
    expect(psiPage).toContain("'Psiquiatra'");
    expect(psiPage).toContain('psiquiatra.nome || user.displayName || \'Psiquiatra\'');
  });

  it('N — CRM/UF via formatRegistroProfissional', () => {
    expect(psiPage).toContain("formatRegistroProfissional('psiquiatra'");
    expect(psiPage).toContain('psiquiatra.crmUf');
    expect(psiPage).toContain('registro: crmLabel || null');
    expect(psiPage).toContain('subtitle: crmLabel || null');
  });

  it('O — modal mobile preservado (estrutura Nutri)', () => {
    expect(psiPage).toContain('fixed inset-0 z-[70]');
    expect(psiPage).toContain('Mensagens');
    expect(psiPage).toContain('Médicos e pacientes com compartilhamento ativo');
    expect(nutriPage).toContain('fixed inset-0 z-[70]');
  });

  it('P — não cria painel paralelo MetaPsiCommunication*', () => {
    expect(psiPage).not.toMatch(/MetaPsiCommunication/);
    expect(psiPage).toContain('loadDestinatariosMetapsi');
    expect(psiPage).toContain('hidden min-w-0 w-full md:block');
  });

  it('desktop sem card dashed / EmptyPanel próprio em torno da Comunicação', () => {
    const comIdx = psiPage.indexOf("case 'comunicacao'");
    const nextCase = psiPage.indexOf("case 'meu-perfil'", comIdx);
    const block = psiPage.slice(comIdx, nextCase);
    expect(block).not.toContain('EmptyPanel');
    expect(block).not.toContain('border-dashed');
    expect(block).not.toContain('Abrir mensagens');
  });

  it('onNotify segue padrão Nutri (alert)', () => {
    expect(psiPage).toContain('onNotify={(msg) => alert(msg)}');
    expect(nutriPage).toContain('onNotify={(msg) => alert(msg)}');
  });
});
