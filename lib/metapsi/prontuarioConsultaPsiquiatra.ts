/**
 * Helpers puros — consulta Psi no Prontuário transversal (ETAPA 6.4.1).
 * Não cria catálogo clínico psiquiátrico; reutiliza tipos genéricos do formulário médico.
 */

import type { EventoTimelineDados } from '@/app/metaadmin/components/paciente-modal/prontuario/prontuarioTypes';
import {
  formatNomeMedicoAssinatura,
  formatRegistroProfissional,
} from '@/lib/pacienteMensagem/assinaturaMensagem';

/** Tipos de registro genéricos aceitos (iguais ao ProntuarioForm médico). */
export const TIPOS_REGISTRO_CONSULTA_PSI = [
  'consulta',
  'retorno',
  'teleconsulta',
  'intercorrencia',
  'ajuste_dose',
  'observacao',
] as const;

export type TipoRegistroConsultaPsi = (typeof TIPOS_REGISTRO_CONSULTA_PSI)[number];

export type ProntuarioConsultaPsiPayload = {
  tipoRegistro: string;
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

const TITULO_POR_TIPO: Record<string, string> = {
  consulta: 'Consulta registrada',
  retorno: 'Retorno registrado',
  teleconsulta: 'Teleconsulta registrada',
  intercorrencia: 'Intercorrência registrada',
  ajuste_dose: 'Ajuste de dose registrado',
  observacao: 'Observação registrada',
};

export function isTipoRegistroConsultaPsi(value: string): value is TipoRegistroConsultaPsi {
  return (TIPOS_REGISTRO_CONSULTA_PSI as readonly string[]).includes(value);
}

export function montarTituloConsultaPsi(tipoRegistro: string): string {
  return TITULO_POR_TIPO[tipoRegistro] ?? TITULO_POR_TIPO.consulta;
}

export function montarDescricaoConsultaPsi(values: ProntuarioConsultaPsiPayload): string {
  const partes: string[] = [];
  const evolucao = String(values.evolucao || '').trim();
  const sintomas = String(values.sintomas || '').trim();
  const conduta = String(values.conduta || '').trim();
  if (evolucao) partes.push(`Evolução: ${evolucao}`);
  if (sintomas) partes.push(`Sintomas/efeitos adversos: ${sintomas}`);
  if (conduta) partes.push(`Conduta/plano: ${conduta}`);
  return partes.join('\n');
}

export function montarDadosConsultaPsi(values: ProntuarioConsultaPsiPayload): EventoTimelineDados {
  const dados: EventoTimelineDados = { status: 'Registro manual' };
  const peso = String(values.peso || '').trim();
  const cintura = String(values.cintura || '').trim();
  const dose = String(values.doseAtual || '').trim();
  const pressao = String(values.pressao || '').trim();
  const proximaDose = String(values.proximaDose || '').trim();
  const meta = String(values.meta || '').trim();
  if (peso) dados.peso = peso;
  if (cintura) dados.cintura = cintura;
  if (dose) dados.dose = dose;
  if (pressao) dados.pressao = pressao;
  if (proximaDose) dados.proximaDose = proximaDose;
  if (meta) dados.meta = meta;
  return dados;
}

export function temInformacaoClinicaConsultaPsi(values: ProntuarioConsultaPsiPayload): boolean {
  return [values.evolucao, values.conduta, values.sintomas].some(
    (v) => String(v || '').trim().length > 0
  );
}

/** Snapshot de autoria para exibição na timeline (nome + CRM/UF quando disponível). */
export function formatPsiquiatraAutorSnapshot(opts: {
  nome?: string | null;
  genero?: 'M' | 'F' | '' | null;
  registroNumero?: string | null;
  crmUf?: string | null;
}): string {
  const nomeFmt = formatNomeMedicoAssinatura({
    nome: opts.nome,
    genero: opts.genero,
    fallback: 'Psiquiatra',
  });
  const crm = formatRegistroProfissional('psiquiatra', {
    numero: opts.registroNumero,
    uf: opts.crmUf,
  });
  return crm ? `${nomeFmt} · ${crm}` : nomeFmt;
}

export function formatDataHoraConsultaPsi(dataRegistro?: string): { data: string; hora: string } {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const hora = `${hh}:${min}`;

  const raw = String(dataRegistro || '').trim();
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
