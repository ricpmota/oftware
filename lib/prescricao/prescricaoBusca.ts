import type { Prescricao } from '@/types/prescricao';

export type OrigemBuscaPrescricao = 'historico' | 'protocolo' | 'prescricao' | 'recibo';

function getTituloExibicao(nome: string): string {
  const n = (nome || '').trim();
  if (n.includes(' — ')) return n.split(' — ')[1]?.trim() || n;
  return n;
}

export function tituloBuscaPrescricao(p: Prescricao): string {
  return getTituloExibicao(p.nome) || 'Sem título';
}

export function origemBuscaPrescricao(p: Prescricao): OrigemBuscaPrescricao {
  if (p.pacienteId) return 'historico';
  if (p.tipoDocumento === 'recibo_medico') return 'recibo';
  if (p.catalogoAba === 'protocolo') return 'protocolo';
  return 'prescricao';
}

export function rotuloOrigemBuscaPrescricao(origem: OrigemBuscaPrescricao): string {
  switch (origem) {
    case 'historico':
      return 'Histórico';
    case 'protocolo':
      return 'Protocolo';
    case 'recibo':
      return 'Recibo';
    default:
      return 'Prescrição';
  }
}

export function normalizarTextoBusca(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

function textoIndexavelPrescricao(p: Prescricao): string {
  const partes = [
    p.nome,
    tituloBuscaPrescricao(p),
    p.descricao,
    p.pacienteNome,
    p.pastaNome,
    p.observacoes,
    ...(p.itens || []).flatMap((item) => [
      item.medicamento,
      item.dosagem,
      item.frequencia,
      item.instrucoes,
    ]),
  ];
  return normalizarTextoBusca(partes.filter(Boolean).join(' '));
}

/** Une templates globais + todas as prescrições do médico (inclui histórico de pacientes). */
export function montarFonteBuscaPrescricoes(
  templates: Prescricao[],
  prescricoesMedico: Prescricao[]
): Prescricao[] {
  const byId = new Map<string, Prescricao>();
  for (const p of [...templates, ...prescricoesMedico]) {
    if (!p?.id || p.id === 'temp-new') continue;
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  return [...byId.values()].sort(
    (a, b) => (b.atualizadoEm?.getTime?.() ?? 0) - (a.atualizadoEm?.getTime?.() ?? 0)
  );
}

export function filtrarPrescricoesPorBusca(
  itens: Prescricao[],
  query: string,
  limite = 40
): Prescricao[] {
  const q = normalizarTextoBusca(query);
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const encontrados: Prescricao[] = [];
  for (const p of itens) {
    const texto = textoIndexavelPrescricao(p);
    if (tokens.every((t) => texto.includes(t))) {
      encontrados.push(p);
      if (encontrados.length >= limite) break;
    }
  }
  return encontrados;
}
