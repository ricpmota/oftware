/**
 * ETAPA 6.3.1 — paridade do shell MetaPsi × MetaNutri (nav, ícones, branding endpoint).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  METAPSI_BOTTOM_NAV,
  METAPSI_SHELL_BRANDING_ENDPOINT,
  METAPSI_SHELL_FORBIDDEN_ICON_NAMES,
  METAPSI_SIDEBAR_NAV,
} from './metaPsiShellChrome';

const pageSrc = readFileSync(resolve(__dirname, '../../app/metapsi/page.v2.tsx'), 'utf8');

describe('metaPsiShellChrome — ETAPA 6.3.1', () => {
  it('A — branding usa endpoint da organização (não hardcode oftware-site-novo2)', () => {
    expect(METAPSI_SHELL_BRANDING_ENDPOINT).toBe('/api/metapsi/organization-branding');
    expect(pageSrc).toContain('METAPSI_SHELL_BRANDING_ENDPOINT');
    expect(pageSrc).toContain('resolveOrganizationShellLogoUrl');
    expect(pageSrc).not.toContain('/oftware-site-novo2.png');
    expect(pageSrc).not.toMatch(/const LOGO_SRC\s*=/);
  });

  it('B — Início não usa Home', () => {
    const home = METAPSI_SIDEBAR_NAV.find((i) => i.id === 'home');
    expect(home?.iconName).toBe('LayoutDashboard');
    expect(pageSrc).not.toMatch(/from 'lucide-react'[\s\S]*?\bHome\b/);
    expect(METAPSI_SHELL_FORBIDDEN_ICON_NAMES).toContain('Home');
  });

  it('C — Comunicação não usa MessageSquare', () => {
    const com = METAPSI_SIDEBAR_NAV.find((i) => i.id === 'comunicacao');
    expect(com?.iconName).toBe('Mail');
    expect(pageSrc).not.toMatch(/\bMessageSquare\b/);
    expect(METAPSI_SHELL_FORBIDDEN_ICON_NAMES).toContain('MessageSquare');
  });

  it('D — Perfil não está no grupo principal do sidebar', () => {
    expect(METAPSI_SIDEBAR_NAV.some((i) => i.id === ('meu-perfil' as never))).toBe(false);
    expect(METAPSI_SIDEBAR_NAV.map((i) => i.id)).toEqual([
      'home',
      'leads',
      'medicos',
      'pacientes',
      'financeiro',
      'calendario',
      'comunicacao',
    ]);
    expect(pageSrc).toContain('data-metapsi-sidebar-nav');
    expect(pageSrc).toContain('title="Perfil"');
  });

  it('E — Header mobile possui estrutura equivalente ao Nutri', () => {
    expect(pageSrc).toContain('data-metapsi-mobile-header');
    expect(pageSrc).toContain('<Brain className="h-6 w-6 shrink-0 text-green-600" />');
    expect(pageSrc).toContain('Psiquiatra');
    expect(pageSrc).toContain('ShieldCheck');
    expect(pageSrc).not.toMatch(/hamburger \+ MetaPsi \+ Brain/);
    // Sem hamburger mobile abrindo drawer (Nutri: sidebar hidden no mobile)
    expect(pageSrc).toMatch(/mn-sidebar hidden md:block/);
  });

  it('F — Bottom nav existe no Psi mobile', () => {
    expect(pageSrc).toContain('data-metapsi-bottom-nav');
    expect(pageSrc).toContain('fixed bottom-0 left-0 right-0');
    expect(pageSrc).toContain('pb-20');
    expect(pageSrc).toContain('env(safe-area-inset-bottom)');
  });

  it('G — Bottom nav utiliza ícones corretos', () => {
    expect(METAPSI_BOTTOM_NAV.map((i) => i.iconName)).toEqual([
      'LayoutDashboard',
      'Kanban',
      'Users',
      'Mail',
    ]);
    expect(METAPSI_BOTTOM_NAV.map((i) => i.id)).toEqual([
      'home',
      'leads',
      'pacientes',
      'comunicacao',
    ]);
  });

  it('H — Comunicação mobile continua abrindo (modal + Mensagens)', () => {
    expect(pageSrc).toContain('showMensagensComunicacaoModal');
    expect(pageSrc).toContain('data-metapsi-mensagens-mobile');
    expect(pageSrc).toContain('setShowMensagensComunicacaoModal(true)');
    expect(pageSrc).toMatch(/menu === 'comunicacao'/);
  });

  it('I — Sidebar collapsed continua funcionando', () => {
    expect(pageSrc).toContain('sidebarCollapsed');
    expect(pageSrc).toContain("sidebarCollapsed ? 'xl:w-16' : 'xl:w-64'");
    expect(pageSrc).toContain('setSidebarCollapsed');
    expect(pageSrc).toContain('data-mn-nav-open');
  });

  it('J — Logout continua no dropdown', () => {
    expect(pageSrc).toContain('data-metapsi-logout');
    expect(pageSrc).toContain('handleLogout');
    expect(pageSrc).toContain('signOut(auth)');
  });
});
