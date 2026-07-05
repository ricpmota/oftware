import type { Prescricao } from '@/types/prescricao';
import type { PrescricaoCatalogoAba, PrescricaoPasta } from '@/types/prescricaoPasta';
import { inferirPastaNomeLegado, PASTAS_PADRAO_PRESCRICAO } from '@/lib/prescricao/prescricaoCatalogoDefaults';

function getTituloExibicao(nome: string): string {
  const n = (nome || '').trim();
  if (n.includes(' — ')) return n.split(' — ')[1]?.trim() || n;
  return n;
}

function chaveTituloRecibo(nome: string): string {
  return getTituloExibicao(nome)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function scorePrescricaoReciboPreferida(p: Prescricao): number {
  if (p.medicoId === 'SISTEMA' && p.isTemplate) return 3;
  if (p.isTemplate) return 2;
  return 1;
}

function dedupeRecibosMesmoTitulo(lista: Prescricao[]): Prescricao[] {
  const melhorReciboPorTitulo = new Map<string, Prescricao>();
  for (const p of lista) {
    if (p.tipoDocumento !== 'recibo_medico') continue;
    const chave = chaveTituloRecibo(p.nome);
    const atual = melhorReciboPorTitulo.get(chave);
    if (!atual || scorePrescricaoReciboPreferida(p) > scorePrescricaoReciboPreferida(atual)) {
      melhorReciboPorTitulo.set(chave, p);
    }
  }
  const idsDescartados = new Set<string>();
  for (const p of lista) {
    if (p.tipoDocumento !== 'recibo_medico') continue;
    const chave = chaveTituloRecibo(p.nome);
    if (melhorReciboPorTitulo.get(chave)?.id !== p.id) idsDescartados.add(p.id);
  }
  return lista.filter((p) => !idsDescartados.has(p.id));
}

/** Templates globais (SISTEMA) — gerenciados em /metaadmingeral. */
export function filtrarProtocolosSistema(templates: Prescricao[]): Prescricao[] {
  return templates.filter((p) => p.medicoId === 'SISTEMA' && p.isTemplate);
}

/** Prescrições gerais do médico (sem paciente, não SISTEMA). */
export function filtrarPrescricoesDoMedico(prescricoesMedico: Prescricao[], medicoId: string): Prescricao[] {
  return prescricoesMedico.filter((p) => !p.pacienteId && p.medicoId === medicoId && p.medicoId !== 'SISTEMA');
}

/** Templates SISTEMA filtrados por aba do catálogo. */
function filtrarSistemaPorAba(templates: Prescricao[], aba: PrescricaoCatalogoAba): Prescricao[] {
  return filtrarProtocolosSistema(templates).filter((p) =>
    aba === 'protocolo'
      ? p.catalogoAba === 'protocolo'
      : (p.catalogoAba || 'prescricao') !== 'protocolo'
  );
}

/** Lista da subaba Prescrições no /metaadmin: catálogo SISTEMA (prescrição) + prescrições gerais do médico. */
export function montarListaPrescricoesAba(templates: Prescricao[], prescricoesMedico: Prescricao[]): Prescricao[] {
  const sistema = filtrarSistemaPorAba(templates, 'prescricao');
  const medico = prescricoesMedico.filter(
    (p) => !p.pacienteId && p.medicoId !== 'SISTEMA' && p.catalogoAba !== 'protocolo'
  );
  return dedupeRecibosMesmoTitulo([...sistema, ...medico]);
}

/** Lista da subaba Protocolo no /metaadmin: catálogo SISTEMA (protocolo) + protocolos gerais do médico. */
export function montarListaProtocolosAba(templates: Prescricao[], prescricoesMedico: Prescricao[] = []): Prescricao[] {
  const sistema = filtrarSistemaPorAba(templates, 'protocolo');
  const medico = prescricoesMedico.filter(
    (p) => !p.pacienteId && p.medicoId !== 'SISTEMA' && p.catalogoAba === 'protocolo'
  );
  return dedupeRecibosMesmoTitulo([...sistema, ...medico]);
}

export interface PastaGrupo {
  pastaNome: string;
  pastaId?: string;
  items: Prescricao[];
}

/** Agrupa itens SISTEMA por pasta (usa pastaNome ou infere do nome legado). */
export function agruparPorPasta(items: Prescricao[]): PastaGrupo[] {
  const map = new Map<string, Prescricao[]>();
  for (const p of items) {
    const pasta = p.pastaNome || inferirPastaNomeLegado(p.nome, p.tipoDocumento);
    map.set(pasta, [...(map.get(pasta) || []), p]);
  }
  const ordemMap = new Map(PASTAS_PADRAO_PRESCRICAO.map((p) => [p.nome, p.ordem]));
  return [...map.entries()]
    .sort((a, b) => {
      const oa = ordemMap.get(a[0]) ?? 999;
      const ob = ordemMap.get(b[0]) ?? 999;
      if (oa !== ob) return oa - ob;
      return a[0].localeCompare(b[0], 'pt-BR');
    })
    .map(([pastaNome, grupoItems]) => ({
      pastaNome,
      pastaId: grupoItems[0]?.pastaId,
      items: grupoItems.sort((a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime()),
    }));
}

/**
 * Monta grupos do catálogo SISTEMA incluindo pastas vazias (Firestore `prescricao_pastas`).
 */
export function montarGruposCatalogoComPastas(
  pastas: PrescricaoPasta[],
  itens: Prescricao[],
  catalogoAba: PrescricaoCatalogoAba
): PastaGrupo[] {
  const pastasFiltradas = pastas
    .filter((p) => p.catalogoAba === catalogoAba)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));

  const itensAba = itens.filter((i) => (i.catalogoAba || 'prescricao') === catalogoAba);
  const itensPorPastaId = new Map<string, Prescricao[]>();
  const orphan: Prescricao[] = [];

  for (const item of itensAba) {
    let matched = false;
    if (item.pastaId) {
      const pasta = pastasFiltradas.find((p) => p.id === item.pastaId);
      if (pasta) {
        itensPorPastaId.set(pasta.id, [...(itensPorPastaId.get(pasta.id) || []), item]);
        matched = true;
      }
    }
    if (!matched && item.pastaNome) {
      const pasta = pastasFiltradas.find((p) => p.nome === item.pastaNome);
      if (pasta) {
        itensPorPastaId.set(pasta.id, [...(itensPorPastaId.get(pasta.id) || []), item]);
        matched = true;
      }
    }
    if (!matched) orphan.push(item);
  }

  const grupos: PastaGrupo[] = pastasFiltradas.map((p) => ({
    pastaNome: p.nome,
    pastaId: p.id,
    items: (itensPorPastaId.get(p.id) || []).sort(
      (a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime()
    ),
  }));

  if (orphan.length > 0) {
    for (const g of agruparPorPasta(orphan)) {
      const idx = grupos.findIndex((x) => x.pastaNome === g.pastaNome);
      if (idx >= 0) {
        grupos[idx] = {
          ...grupos[idx],
          items: [...grupos[idx].items, ...g.items].sort(
            (a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime()
          ),
        };
      } else {
        grupos.push(g);
      }
    }
  }

  return grupos;
}

export function isProtocoloSistema(p: Prescricao | null | undefined): boolean {
  return !!p && p.medicoId === 'SISTEMA' && p.isTemplate;
}
