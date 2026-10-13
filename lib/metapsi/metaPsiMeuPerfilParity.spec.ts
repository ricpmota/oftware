/**
 * ETAPA 6.3.7 — paridade Meu Perfil /metapsi × /metanutri (chrome; domínio Psi preservado).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const psiPage = readFileSync(resolve(__dirname, '../../app/metapsi/page.v2.tsx'), 'utf8');
const nutriPage = readFileSync(resolve(__dirname, '../../app/metanutri/page.v2.tsx'), 'utf8');
const psiService = readFileSync(resolve(__dirname, '../../services/psiquiatraService.ts'), 'utf8');

const perfilBlock = (() => {
  const start = psiPage.indexOf("case 'meu-perfil'");
  const end = psiPage.indexOf('default:', start);
  return psiPage.slice(start, end > start ? end : start + 8000);
})();

describe('MetaPsi Meu Perfil — paridade 6.3.7', () => {
  it('A — carrega documento via PsiquiatraService (psiquiatras/{authUid})', () => {
    expect(psiPage).toContain('PsiquiatraService.getPsiquiatraByUserId');
    expect(psiPage).toContain('PsiquiatraService.updatePerfil');
  });

  it('B/C/D — nome, CRM/UF e RQE no formulário', () => {
    expect(perfilBlock).toContain('perfilNome');
    expect(perfilBlock).toContain('registroNumero');
    expect(perfilBlock).toContain('crmUf');
    expect(perfilBlock).toContain('UF do CRM');
    expect(perfilBlock).toContain('RQE (opcional)');
    expect(perfilBlock).toContain('setRqe');
  });

  it('E — foto via MedicoFotoPerfilEditor + fallback UserCircle', () => {
    expect(perfilBlock).toContain('MedicoFotoPerfilEditor');
    expect(perfilBlock).toContain('UserCircle');
    expect(perfilBlock).toContain('profissao="psiquiatra"');
  });

  it('F/G — save explícito; email/especialidade read-only', () => {
    expect(perfilBlock).toContain('handleSalvarPerfil');
    expect(perfilBlock).toContain('readOnly');
    expect(perfilBlock).toContain('disabled');
    expect(perfilBlock).toContain('PSIQUIATRA_ESPECIALIDADE');
  });

  it('H/I — updatePerfil do page não seta isVerificado/status', () => {
    expect(perfilBlock).not.toMatch(/isVerificado\s*:/);
    expect(perfilBlock).not.toMatch(/status\s*:\s*['"]ativo['"]/);
    const updateStart = psiService.indexOf('static async updatePerfil');
    const updateEnd = psiService.indexOf('static async updateFotoPerfil');
    const updateBody = psiService.slice(updateStart, updateEnd);
    expect(updateBody).not.toContain('isVerificado');
    expect(updateBody).not.toMatch(/\bstatus\b/);
  });

  it('K/L — dropdown e footer abrem meu-perfil', () => {
    expect(psiPage).toContain("navegarMenu('meu-perfil')");
    expect(psiPage).toContain('setMeuPerfilAba(\'dados\')');
    expect(psiPage).toContain('title="Perfil"');
    expect(psiPage).toContain('Meu Perfil');
  });

  it('M — header chrome Nutri (gradient green-teal)', () => {
    expect(perfilBlock).toContain('bg-gradient-to-r from-green-600 to-teal-600');
    expect(perfilBlock).toContain('rounded-t-2xl');
    expect(nutriPage).toContain('bg-gradient-to-r from-green-600 to-teal-600');
  });

  it('N — avatar dimensões Nutri', () => {
    expect(perfilBlock).toContain('h-12 w-12');
    expect(perfilBlock).toContain('sm:h-14 sm:w-14');
    expect(perfilBlock).toContain('rounded-2xl');
    expect(perfilBlock).toContain('ring-2 ring-white/30');
  });

  it('O — tabs chrome Nutri (Dados Iniciais / Endereço / Cidades)', () => {
    expect(perfilBlock).toContain('Dados Iniciais');
    expect(perfilBlock).toContain('Endereço de Atendimento');
    expect(perfilBlock).toContain('Cidade de Atendimento');
    expect(perfilBlock).not.toMatch(/id:\s*'assinatura'/);
    expect(perfilBlock).not.toMatch(/id:\s*'link'/);
    expect(perfilBlock).not.toMatch(/id:\s*'whatsapp'/);
    expect(perfilBlock).not.toContain('WhatsappConnectionSection');
  });

  it('P — card radius/shadow Nutri', () => {
    expect(perfilBlock).toContain('rounded-2xl');
    expect(perfilBlock).toContain('shadow-xl');
    expect(perfilBlock).toContain('border-gray-100');
  });

  it('Q — inputs focus ring Nutri', () => {
    expect(perfilBlock).toContain('focus:ring-green-500/25');
    expect(perfilBlock).toContain('focus:border-green-500');
    expect(perfilBlock).toContain('rounded-xl');
  });

  it('R — CTA Salvar Perfil Nutri (Save + Loader2)', () => {
    expect(perfilBlock).toContain('Salvar Perfil');
    expect(perfilBlock).toContain('<Save');
    expect(perfilBlock).toContain('Loader2');
    expect(perfilBlock).toContain('bg-green-600');
  });

  it('S — sem indigo no perfil', () => {
    expect(perfilBlock).not.toMatch(/indigo/);
  });

  it('T/U — shell pb-20 + footer save no card', () => {
    expect(psiPage).toContain('pb-20');
    expect(perfilBlock).toContain('border-t border-gray-100 bg-gray-50/80');
  });

  it('V — sem logo MetaPsi hardcoded', () => {
    expect(psiPage).not.toContain('/oftware-site-novo2.png');
    expect(perfilBlock).not.toMatch(/MetaPsi/);
  });

  it('papel exibido como Psiquiatra (não MetaPsi)', () => {
    expect(perfilBlock).toContain('>Psiquiatra<');
  });

  it('CEP Buscar alinhado ao Nutri', () => {
    expect(psiPage).toContain('buscarEnderecoPorCepPsi');
    expect(psiPage).toContain('viacep.com.br');
    expect(perfilBlock).toContain('Buscar');
  });
});
