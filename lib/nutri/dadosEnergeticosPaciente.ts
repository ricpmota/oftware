/**
 * Base confiável de dados energéticos do paciente (ETAPA 4).
 * Extração/validação apenas — sem TMB, GET, déficit ou meta calórica.
 *
 * Não reutiliza o fallback silencioso de 70 kg de `obterPesoAtual()` (legado).
 */

import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import { calcularImcFromPesoAlturaCm } from '@/lib/meta/medidasIniciaisImc';
import { parseDataNascimentoDiaMesLocal } from '@/utils/dataNascimentoLocal';

export type SexoBiologicoEnergetico = 'masculino' | 'feminino';

export type AtividadeFisicaEnergeticaDeclarada =
  | 'nunca'
  | '1-2x'
  | '3-4x'
  | '5-7x';

export type BloqueioEnergeticoCodigo =
  | 'DADOS_INSUFICIENTES'
  | 'PESO_INDISPONIVEL'
  | 'ALTURA_INDISPONIVEL'
  | 'IDADE_INDISPONIVEL'
  | 'IDADE_FORA_ESCOPO_ADULTO'
  | 'SEXO_INDISPONIVEL'
  | 'SEXO_NAO_BINARIO_PARA_EQUACAO'
  | 'GESTACAO'
  | 'LACTACAO';

export type AlertaEnergeticoCodigo =
  | 'PESO_SEM_DATA'
  | 'PESO_EVOLUCAO_SEM_ORDEM_CONFIRMADA'
  | 'NASCIMENTO_FORMATO_INVALIDO'
  | 'GESTACAO_DESCONHECIDA'
  | 'LACTACAO_DESCONHECIDA'
  | 'ATIVIDADE_FISICA_NAO_INFORMADA'
  | 'IMC_LEGADO_DIVERGENTE';

export interface PesoEnergeticoPaciente {
  pesoKg: number | null;
  dataPeso: string | null;
  origem: 'evolucao' | 'medida_inicial' | 'indisponivel';
  confiavel: boolean;
}

export interface DadosEnergeticosPaciente {
  versao: 1;
  peso: PesoEnergeticoPaciente;
  alturaCm: number | null;
  idadeAnos: number | null;
  sexoBiologico: SexoBiologicoEnergetico | null;
  atividadeFisicaDeclarada: AtividadeFisicaEnergeticaDeclarada | null;
  imcAtual: number | null;
  aptoParaEstimativaEnergetica: boolean;
  bloqueios: BloqueioEnergeticoCodigo[];
  alertas: AlertaEnergeticoCodigo[];
}

export interface MontarDadosEnergeticosOpcoes {
  atividadeFisicaDeclarada?: AtividadeFisicaEnergeticaDeclarada | null;
  dataReferencia?: Date;
}

/** Faixa técnica ampla — rejeita erro de armazenamento, não diagnóstico. */
export const PESO_ENERGETICO_MIN_KG = 20;
export const PESO_ENERGETICO_MAX_KG = 400;

export const ALTURA_ENERGETICA_MIN_CM = 120;
export const ALTURA_ENERGETICA_MAX_CM = 230;

/** Escopo adulto do motor energético futuro. */
export const IDADE_ENERGETICA_MIN_ANOS = 18;
export const IDADE_ENERGETICA_MAX_ANOS = 100;

/** Diferença absoluta (pontos de IMC) para alerta IMC_LEGADO_DIVERGENTE. */
export const IMC_LEGADO_DIVERGENCIA_MIN = 1;

const ATIVIDADES_VALIDAS = new Set<AtividadeFisicaEnergeticaDeclarada>([
  'nunca',
  '1-2x',
  '3-4x',
  '5-7x',
]);

export function normalizarSexoBiologicoEnergetico(
  valor: unknown
): SexoBiologicoEnergetico | null {
  if (valor === 'M') return 'masculino';
  if (valor === 'F') return 'feminino';
  return null;
}

/**
 * Idade em anos completos (considera dia/mês).
 * Usa `parseDataNascimentoDiaMesLocal` (mesma base do cadastro) e lógica
 * alinhada a `calcularIdade` em labRangesFromJson, com `dataReferencia` testável.
 * Válida para o motor: 18–100 inclusive; fora disso retorna o número (bloqueio na montagem).
 */
export function obterIdadeEnergeticaAnos(
  dataNascimento: unknown,
  dataReferencia: Date = new Date()
): number | null {
  const nasc = parseDataNascimentoDiaMesLocal(dataNascimento);
  if (!nasc) return null;

  const ref = dataReferencia;
  if (!(ref instanceof Date) || Number.isNaN(ref.getTime())) return null;

  let idade = ref.getFullYear() - nasc.getFullYear();
  const m = ref.getMonth() - nasc.getMonth();
  const dia = ref.getDate() - nasc.getDate();
  if (m < 0 || (m === 0 && dia < 0)) idade--;

  if (!Number.isFinite(idade) || idade < 0) return null;
  return idade;
}

function isPesoTecnicamenteValido(peso: unknown): peso is number {
  return (
    typeof peso === 'number' &&
    Number.isFinite(peso) &&
    peso > 0 &&
    peso >= PESO_ENERGETICO_MIN_KG &&
    peso <= PESO_ENERGETICO_MAX_KG
  );
}

/**
 * Campo real de data em `SeguimentoSemanal`: apenas `dataRegistro`.
 * Aceita Date, Firestore Timestamp (`toDate` / seconds) e strings parseáveis.
 */
function parseDataRegistroSeguimento(valor: unknown): Date | null {
  if (valor == null) return null;

  // YYYY-MM-DD → dia civil local (evita deslocar para o dia anterior em fusos UTC−)
  if (typeof valor === 'string') {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
    if (ymd) {
      const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    // Instantes meia-noite UTC (ex.: `new Date('2025-06-01')`) → dia civil UTC
    const utcH = valor.getUTCHours();
    const utcM = valor.getUTCMinutes();
    const utcS = valor.getUTCSeconds();
    const utcMs = valor.getUTCMilliseconds();
    if (utcH === 0 && utcM === 0 && utcS === 0 && utcMs === 0) {
      return new Date(
        valor.getUTCFullYear(),
        valor.getUTCMonth(),
        valor.getUTCDate()
      );
    }
    return valor;
  }

  if (typeof (valor as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (valor as { toDate: () => Date }).toDate();
      return parseDataRegistroSeguimento(d);
    } catch {
      return null;
    }
  }

  const secRaw =
    typeof (valor as { seconds?: unknown }).seconds === 'number'
      ? (valor as { seconds: number }).seconds
      : typeof (valor as { _seconds?: unknown })._seconds === 'number'
        ? (valor as { _seconds: number })._seconds
        : null;
  if (secRaw !== null) {
    const ns = Number(
      (valor as { nanoseconds?: unknown }).nanoseconds ??
        (valor as { _nanoseconds?: unknown })._nanoseconds ??
        0
    );
    return parseDataRegistroSeguimento(new Date(secRaw * 1000 + ns / 1e6));
  }

  if (typeof valor === 'string' || typeof valor === 'number') {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : parseDataRegistroSeguimento(d);
  }

  return null;
}

function formatDataPesoIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function obterPesoEnergeticoPaciente(
  paciente: PacienteCompleto
): PesoEnergeticoPaciente & {
  alertasPeso: AlertaEnergeticoCodigo[];
} {
  const alertasPeso: AlertaEnergeticoCodigo[] = [];
  const evolucao = Array.isArray(paciente?.evolucaoSeguimento)
    ? paciente.evolucaoSeguimento
    : [];

  type Candidato = {
    pesoKg: number;
    data: Date | null;
    indexOriginal: number;
  };

  const candidatos: Candidato[] = [];
  for (let i = 0; i < evolucao.length; i++) {
    const reg = evolucao[i] as SeguimentoSemanal & { dataRegistro?: unknown };
    if (!isPesoTecnicamenteValido(reg?.peso)) continue;
    candidatos.push({
      pesoKg: reg.peso as number,
      data: parseDataRegistroSeguimento(reg?.dataRegistro),
      indexOriginal: i,
    });
  }

  if (candidatos.length > 0) {
    const comData = candidatos.filter((c) => c.data != null);
    if (comData.length > 0) {
      comData.sort((a, b) => {
        const ta = a.data!.getTime();
        const tb = b.data!.getTime();
        if (ta !== tb) return tb - ta;
        return b.indexOriginal - a.indexOriginal;
      });
      const escolhido = comData[0];
      return {
        pesoKg: escolhido.pesoKg,
        dataPeso: formatDataPesoIso(escolhido.data!),
        origem: 'evolucao',
        confiavel: true,
        alertasPeso,
      };
    }

    // Pesos válidos sem nenhuma data válida: último do array (maior índice).
    const ultimo = [...candidatos].sort(
      (a, b) => b.indexOriginal - a.indexOriginal
    )[0];
    alertasPeso.push('PESO_SEM_DATA');
    alertasPeso.push('PESO_EVOLUCAO_SEM_ORDEM_CONFIRMADA');
    return {
      pesoKg: ultimo.pesoKg,
      dataPeso: null,
      origem: 'evolucao',
      confiavel: false,
      alertasPeso,
    };
  }

  const pesoInicial = paciente?.dadosClinicos?.medidasIniciais?.peso;
  if (isPesoTecnicamenteValido(pesoInicial)) {
    alertasPeso.push('PESO_SEM_DATA');
    return {
      pesoKg: pesoInicial,
      dataPeso: null,
      origem: 'medida_inicial',
      confiavel: true,
      alertasPeso,
    };
  }

  return {
    pesoKg: null,
    dataPeso: null,
    origem: 'indisponivel',
    confiavel: false,
    alertasPeso,
  };
}

export function obterAlturaEnergeticaCm(
  paciente: PacienteCompleto
): number | null {
  const altura = paciente?.dadosClinicos?.medidasIniciais?.altura;
  if (
    typeof altura !== 'number' ||
    !Number.isFinite(altura) ||
    altura < ALTURA_ENERGETICA_MIN_CM ||
    altura > ALTURA_ENERGETICA_MAX_CM
  ) {
    return null;
  }
  return altura;
}

export function calcularImcEnergeticoAtual(
  pesoKg: number | null,
  alturaCm: number | null
): number | null {
  if (pesoKg == null || alturaCm == null) return null;
  if (!isPesoTecnicamenteValido(pesoKg)) return null;
  if (
    typeof alturaCm !== 'number' ||
    !Number.isFinite(alturaCm) ||
    alturaCm < ALTURA_ENERGETICA_MIN_CM ||
    alturaCm > ALTURA_ENERGETICA_MAX_CM
  ) {
    return null;
  }
  return calcularImcFromPesoAlturaCm(pesoKg, alturaCm);
}

function normalizarAtividadeDeclarada(
  valor: unknown
): AtividadeFisicaEnergeticaDeclarada | null {
  if (typeof valor !== 'string') return null;
  if (ATIVIDADES_VALIDAS.has(valor as AtividadeFisicaEnergeticaDeclarada)) {
    return valor as AtividadeFisicaEnergeticaDeclarada;
  }
  return null;
}

function uniquePush<T>(arr: T[], item: T): void {
  if (!arr.includes(item)) arr.push(item);
}

/** Mensagens não estigmatizantes para UI administrativa (bloqueios). */
export function rotuloBloqueioEnergetico(
  codigo: BloqueioEnergeticoCodigo
): string {
  switch (codigo) {
    case 'PESO_INDISPONIVEL':
      return 'peso válido não disponível';
    case 'ALTURA_INDISPONIVEL':
      return 'altura válida não disponível';
    case 'IDADE_INDISPONIVEL':
      return 'data de nascimento não informada ou inválida';
    case 'IDADE_FORA_ESCOPO_ADULTO':
      return 'idade fora do escopo adulto do motor energético (18–100 anos)';
    case 'SEXO_INDISPONIVEL':
      return 'sexo biológico não informado';
    case 'SEXO_NAO_BINARIO_PARA_EQUACAO':
      return 'a equação energética futura exige variável binária M/F não disponível';
    case 'GESTACAO':
      return 'gestação confirmada — requer avaliação nutricional própria';
    case 'LACTACAO':
      return 'lactação confirmada — requer avaliação nutricional própria';
    case 'DADOS_INSUFICIENTES':
      return 'dados insuficientes para estimativa energética';
    default:
      return codigo;
  }
}

export function montarDadosEnergeticosPaciente(
  paciente: PacienteCompleto,
  opcoes?: MontarDadosEnergeticosOpcoes
): DadosEnergeticosPaciente {
  const dataRef = opcoes?.dataReferencia ?? new Date();
  const bloqueios: BloqueioEnergeticoCodigo[] = [];
  const alertas: AlertaEnergeticoCodigo[] = [];

  const pesoResult = obterPesoEnergeticoPaciente(paciente);
  const { alertasPeso, ...peso } = pesoResult;
  for (const a of alertasPeso) uniquePush(alertas, a);

  const alturaCm = obterAlturaEnergeticaCm(paciente);
  const imcAtual = calcularImcEnergeticoAtual(peso.pesoKg, alturaCm);

  const rawNasc: unknown = paciente?.dadosIdentificacao?.dataNascimento;
  let idadeAnos: number | null = null;
  if (rawNasc == null || rawNasc === '') {
    idadeAnos = null;
  } else {
    idadeAnos = obterIdadeEnergeticaAnos(rawNasc, dataRef);
    if (idadeAnos == null) {
      uniquePush(alertas, 'NASCIMENTO_FORMATO_INVALIDO');
    }
  }

  const rawSexo = paciente?.dadosIdentificacao?.sexoBiologico;
  const sexoBiologico = normalizarSexoBiologicoEnergetico(rawSexo);

  const atividadeFisicaDeclarada = normalizarAtividadeDeclarada(
    opcoes?.atividadeFisicaDeclarada
  );
  if (atividadeFisicaDeclarada == null) {
    uniquePush(alertas, 'ATIVIDADE_FISICA_NAO_INFORMADA');
  }

  // IMC legado vs atual
  const imcLegado = paciente?.dadosClinicos?.medidasIniciais?.imc;
  if (
    imcAtual != null &&
    typeof imcLegado === 'number' &&
    Number.isFinite(imcLegado) &&
    Math.abs(imcAtual - imcLegado) >= IMC_LEGADO_DIVERGENCIA_MIN
  ) {
    uniquePush(alertas, 'IMC_LEGADO_DIVERGENTE');
  }

  // Gestação / lactação
  const gestacao = paciente?.dadosClinicos?.riscos?.gestacao;
  const lactacao = paciente?.dadosClinicos?.riscos?.lactacao;

  if (gestacao === 'sim') {
    uniquePush(bloqueios, 'GESTACAO');
  } else if (gestacao === 'desconheco' || gestacao == null) {
    uniquePush(alertas, 'GESTACAO_DESCONHECIDA');
  }
  // 'nao' → sem bloqueio / sem alerta

  if (lactacao === 'sim') {
    uniquePush(bloqueios, 'LACTACAO');
  } else if (lactacao == null) {
    // tipo estruturado só tem sim|nao; ausência → alerta de revisão
    uniquePush(alertas, 'LACTACAO_DESCONHECIDA');
  }
  // 'nao' → ok

  // Bloqueios de dados
  if (peso.pesoKg == null || peso.origem === 'indisponivel') {
    uniquePush(bloqueios, 'PESO_INDISPONIVEL');
  }
  if (alturaCm == null) {
    uniquePush(bloqueios, 'ALTURA_INDISPONIVEL');
  }
  if (idadeAnos == null) {
    uniquePush(bloqueios, 'IDADE_INDISPONIVEL');
  } else if (
    idadeAnos < IDADE_ENERGETICA_MIN_ANOS ||
    idadeAnos > IDADE_ENERGETICA_MAX_ANOS
  ) {
    uniquePush(bloqueios, 'IDADE_FORA_ESCOPO_ADULTO');
  }

  if (rawSexo === 'Outro') {
    uniquePush(bloqueios, 'SEXO_NAO_BINARIO_PARA_EQUACAO');
  } else if (sexoBiologico == null) {
    uniquePush(bloqueios, 'SEXO_INDISPONIVEL');
  }

  if (bloqueios.length > 0) {
    uniquePush(bloqueios, 'DADOS_INSUFICIENTES');
  }

  const aptoParaEstimativaEnergetica = bloqueios.length === 0;

  return {
    versao: 1,
    peso,
    alturaCm,
    idadeAnos,
    sexoBiologico,
    atividadeFisicaDeclarada,
    imcAtual,
    aptoParaEstimativaEnergetica,
    bloqueios,
    alertas,
  };
}
