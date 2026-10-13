/**
 * Montagem pura do evento de consulta Psi na timeline transversal.
 * Persistência real: createProntuarioConsultaPsiquiatra.server (Admin SDK).
 */

import type { EventoTimelineDados } from '@/app/metaadmin/components/paciente-modal/prontuario/prontuarioTypes';
import {
  formatNomeMedicoAssinatura,
  formatRegistroProfissional,
} from '@/lib/pacienteMensagem/assinaturaMensagem';

export const TIPOS_REGISTRO_PRONTUARIO_PSI = [
  'consulta',
  'retorno',
  'teleconsulta',
  'intercorrencia',
  'ajuste_dose',
  'observacao',
] as const;

export type TipoRegistroProntuarioPsi = (typeof TIPOS_REGISTRO_PRONTUARIO_PSI)[number];

const TITULO_POR_TIPO: Record<TipoRegistroProntuarioPsi, string> = {
  consulta: 'Consulta registrada',
  retorno: 'Retorno registrado',
  teleconsulta: 'Teleconsulta registrada',
  intercorrencia: 'Intercorrência registrada',
  ajuste_dose: 'Ajuste de dose registrado',
  observacao: 'Observação registrada',
};

export type ProntuarioConsultaPsiquiatraInput = {
  tipoRegistro?: string;
  dataRegistro?: string;
  evolucao?: string;
  sintomas?: string;
  conduta?: string;
  peso?: string;
  cintura?: string;
  pressao?: string;
  doseAtual?: string;
  proximaDose?: string;
  meta?: string;
};

export type PsiquiatraAutorSnapshot = {
  id: string;
  nome?: string | null;
  genero?: 'M' | 'F' | '' | null;
  registroNumero?: string | null;
  crmUf?: string | null;
};

export type ProntuarioConsultaPsiquiatraPayload = {
  pacienteId: string;
  tipo: 'consulta';
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  origem: 'psiquiatra';
  destaque?: string;
  dados: EventoTimelineDados;
  psiquiatraId: string;
  psiquiatraNome: string;
};

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function isTipoRegistroProntuarioPsi(v: string): v is TipoRegistroProntuarioPsi {
  return (TIPOS_REGISTRO_PRONTUARIO_PSI as readonly string[]).includes(v);
}

export function formatPsiquiatraAutorNome(autor: PsiquiatraAutorSnapshot): string {
  const nomeFormatado = formatNomeMedicoAssinatura({
    nome: autor.nome,
    genero: autor.genero,
    fallback: 'Psiquiatra',
  });
  const registro = formatRegistroProfissional('psiquiatra', {
    numero: autor.registroNumero,
    uf: autor.crmUf,
  });
  return registro ? `${nomeFormatado} · ${registro}` : nomeFormatado;
}

function formatDataHoraFromRegistro(dataRegistro?: string): { data: string; hora: string } {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const hora = `${hh}:${min}`;

  const raw = trimStr(dataRegistro);
  if (raw) {
    const [y, m, d] = raw.split('-').map(Number);
    if (y && m && d) {
      return {
        data: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
        hora,
      };
    }
  }

  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return { data: `${dd}/${mm}/${yyyy}`, hora };
}

function montarDescricao(input: ProntuarioConsultaPsiquiatraInput): string {
  const partes: string[] = [];
  const evolucao = trimStr(input.evolucao);
  const sintomas = trimStr(input.sintomas);
  const conduta = trimStr(input.conduta);
  if (evolucao) partes.push(`Evolução: ${evolucao}`);
  if (sintomas) partes.push(`Sintomas/efeitos adversos: ${sintomas}`);
  if (conduta) partes.push(`Conduta/plano: ${conduta}`);
  return partes.join('\n');
}

function montarDados(input: ProntuarioConsultaPsiquiatraInput): EventoTimelineDados {
  const dados: EventoTimelineDados = { status: 'Registro manual' };
  const peso = trimStr(input.peso);
  const cintura = trimStr(input.cintura);
  const dose = trimStr(input.doseAtual);
  const pressao = trimStr(input.pressao);
  const proximaDose = trimStr(input.proximaDose);
  const meta = trimStr(input.meta);
  if (peso) dados.peso = peso;
  if (cintura) dados.cintura = cintura;
  if (dose) dados.dose = dose;
  if (pressao) dados.pressao = pressao;
  if (proximaDose) dados.proximaDose = proximaDose;
  if (meta) dados.meta = meta;
  return dados;
}

/**
 * Valida input clínico e monta payload Firestore (sem timestamps).
 * Não confia em authorId/role/nome vindos do client — autor vem de `autor`.
 */
export function buildProntuarioConsultaPsiquiatraPayload(params: {
  pacienteId: string;
  autor: PsiquiatraAutorSnapshot;
  input: ProntuarioConsultaPsiquiatraInput;
}): ProntuarioConsultaPsiquiatraPayload {
  const pacienteId = String(params.pacienteId || '').trim();
  const psiquiatraId = String(params.autor.id || '').trim();
  if (!pacienteId) throw new Error('pacienteId é obrigatório.');
  if (!psiquiatraId) throw new Error('psiquiatraId é obrigatório.');

  const evolucao = trimStr(params.input.evolucao);
  const sintomas = trimStr(params.input.sintomas);
  const conduta = trimStr(params.input.conduta);
  if (!evolucao && !sintomas && !conduta) {
    throw new Error('Preencha pelo menos uma informação clínica antes de salvar.');
  }

  const tipoRaw = trimStr(params.input.tipoRegistro) || 'consulta';
  const tipoRegistro = isTipoRegistroProntuarioPsi(tipoRaw) ? tipoRaw : 'consulta';
  const titulo = TITULO_POR_TIPO[tipoRegistro];
  const { data, hora } = formatDataHoraFromRegistro(params.input.dataRegistro);
  const doseAtual = trimStr(params.input.doseAtual);
  const proximaDose = trimStr(params.input.proximaDose);
  const temAjuste = Boolean(doseAtual || proximaDose);

  return {
    pacienteId,
    tipo: 'consulta',
    titulo,
    descricao: montarDescricao(params.input),
    data,
    hora,
    origem: 'psiquiatra',
    ...(temAjuste ? { destaque: 'Ajuste terapêutico registrado' } : {}),
    dados: montarDados(params.input),
    psiquiatraId,
    psiquiatraNome: formatPsiquiatraAutorNome(params.autor),
  };
}
