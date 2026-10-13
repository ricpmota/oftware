/**
 * ETAPA 6.3.3 — paridade estrutural Médicos MetaPsi × MetaNutri.
 * Services de vínculo já cobertos em solicitacaoVinculoPsiquiatraMedicoService.spec;
 * aqui validamos chrome visual + ACL de pacientes sob médico.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const panelSrc = readFileSync(
  resolve(__dirname, '../../components/metapsi/MetaPsiMedicosVinculoPanel.tsx'),
  'utf8',
);

/** Agrupa pacientes visíveis por medicoId — só status ativo (espelha UI). */
export function groupPacientesAtivosByMedico(
  items: { medicoId: string; status: string; pacienteId: string }[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of items) {
    if (item.status !== 'ativo') continue;
    const mid = String(item.medicoId || '').trim();
    if (!mid) continue;
    const list = map.get(mid) || [];
    list.push(item.pacienteId);
    map.set(mid, list);
  }
  return map;
}

describe('MetaPsiMedicosVinculoPanel — ETAPA 6.3.3', () => {
  it('A/B — lista vinculados via medicoVinculadoIds + load (estrutura)', () => {
    expect(panelSrc).toContain('medicoVinculadoIds');
    expect(panelSrc).toContain("setAba('vinculados')");
    expect(panelSrc).toContain('data-metapsi-medicos-vinculados');
  });

  it('C/D — solicitações recebidas e enviadas', () => {
    expect(panelSrc).toContain('Solicitações Recebidas');
    expect(panelSrc).toContain('Solicitações Enviadas');
    expect(panelSrc).toContain('listPendingVinculoRequestsByPsiquiatra');
    expect(panelSrc).toContain('listSentVinculoRequestsByPsiquiatra');
  });

  it('E/F/G — aceitar / rejeitar / cancelar usam service', () => {
    expect(panelSrc).toContain('approveVinculoRequest');
    expect(panelSrc).toContain('rejectVinculoRequest');
    expect(panelSrc).toContain('cancelVinculoRequest');
  });

  it('H — duplicidade bloqueada via jaPendente / createVinculoRequest', () => {
    expect(panelSrc).toContain('jaPendente');
    expect(panelSrc).toContain('createVinculoRequest');
  });

  it('I — remoção usa removeVinculoCompleto (bloqueio com pacientes no service)', () => {
    expect(panelSrc).toContain('removeVinculoCompleto');
    expect(panelSrc).toMatch(/pacientes ativos compartilhados/i);
  });

  it('J — busca por cidade preservada', () => {
    expect(panelSrc).toContain('getMedicosByCidade');
    expect(panelSrc).toContain('Buscar Médicos');
  });

  it('K/L — pacientes sob médico só ACL ativa', () => {
    const grouped = groupPacientesAtivosByMedico([
      { medicoId: 'm1', status: 'ativo', pacienteId: 'p1' },
      { medicoId: 'm1', status: 'inativo', pacienteId: 'p2' },
      { medicoId: 'm2', status: 'ativo', pacienteId: 'p3' },
      { medicoId: 'm1', status: 'removido', pacienteId: 'p4' },
    ]);
    expect(grouped.get('m1')).toEqual(['p1']);
    expect(grouped.get('m2')).toEqual(['p3']);
    expect(panelSrc).toContain("p.status !== 'ativo'");
    expect(panelSrc).toContain('listPacientesVisiveisByPsiquiatra');
    expect(panelSrc).toContain('MetaPsiPacienteWorkspaceModal');
  });

  it('M — ícones Lucide / padrão Nutri', () => {
    expect(panelSrc).toContain("from 'lucide-react'");
    expect(panelSrc).toContain('Stethoscope');
    expect(panelSrc).toContain('UserPlus');
    expect(panelSrc).toContain('Search');
  });

  it('N — tabs chrome Nutri', () => {
    expect(panelSrc).toContain('data-metapsi-medicos-tabs');
    expect(panelSrc).toContain('Médicos Vinculados');
    expect(panelSrc).toContain('border-green-600 text-green-600');
    expect(panelSrc).toContain('overflow-x-auto border-b border-gray-200');
  });

  it('O — cards radius/border Nutri', () => {
    expect(panelSrc).toContain('rounded-xl border border-gray-200');
    expect(panelSrc).toContain('VinculoFotoAvatar');
  });

  it('P — loading estruturado', () => {
    expect(panelSrc).toContain('data-metapsi-medicos-skeleton');
    expect(panelSrc).toContain('animate-spin');
    expect(panelSrc).not.toMatch(/>\s*Carregando…\s*</);
  });

  it('Q — empty states padrão Nutri', () => {
    expect(panelSrc).toContain('Nenhum médico vinculado ainda');
    expect(panelSrc).toContain('Nenhum médico encontrado');
    expect(panelSrc).toContain('Nenhuma solicitação de vínculo pendente');
  });

  it('R — mobile / overflow estrutural', () => {
    expect(panelSrc).toContain('min-w-0');
    expect(panelSrc).toContain('overflow-x-auto');
    expect(panelSrc).toContain('min-w-max');
  });

  it('abre workspace Psi (não MetaAdmin)', () => {
    expect(panelSrc).toContain('MetaPsiPacienteWorkspaceModal');
    expect(panelSrc).not.toContain('MetaAdminPaciente');
  });
});
