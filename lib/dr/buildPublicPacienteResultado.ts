import type { InstagramDepoimentoItem } from '@/components/instagram/instagramDepoimentosTypes';

type EvolucaoRow = {
  weekIndex: number;
  peso: number | null;
  doseMg: number;
  circunferenciaAbdominal: number | null;
};

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const t = (val as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(val as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calcularIdade(dataNasc: unknown): number | null {
  const dataNascimento = toDate(dataNasc);
  if (!dataNascimento) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();
  const mesNasc = dataNascimento.getMonth();
  const diaNasc = dataNascimento.getDate();
  if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) idade--;
  return idade > 0 ? idade : null;
}

function evolucaoOrdenadaFromRaw(evolucaoRaw: unknown[]): EvolucaoRow[] {
  return evolucaoRaw
    .map((item) => {
      const p = item as Record<string, unknown>;
      const pesoVal = typeof p.peso === 'number' && p.peso > 0 ? p.peso : null;
      const q = (p.doseAplicada as { quantidade?: unknown } | undefined)?.quantidade;
      const doseNum =
        typeof q === 'number' ? q : typeof q === 'string' ? parseFloat(String(q).replace(',', '.')) : 0;
      const circVal =
        typeof p.circunferenciaAbdominal === 'number' && p.circunferenciaAbdominal > 0
          ? p.circunferenciaAbdominal
          : null;
      return {
        weekIndex: (p.weekIndex ?? p.numeroSemana ?? 0) as number,
        peso: pesoVal,
        doseMg: Number.isFinite(doseNum) && doseNum > 0 ? doseNum : 0,
        circunferenciaAbdominal: circVal,
      };
    })
    .filter((p) => p.weekIndex > 0 && (p.peso !== null || p.doseMg > 0 || p.circunferenciaAbdominal !== null))
    .sort((a, b) => a.weekIndex - b.weekIndex);
}

/**
 * Monta o mesmo payload do sheet "Resultado do tratamento" (depoimentos)
 * a partir do documento do paciente, para o link compartilhado com ?evolucao=1.
 */
export function buildPublicPacienteResultado(
  data: Record<string, unknown>,
  pacienteId: string,
  nomeFallback: string
): InstagramDepoimentoItem | null {
  const identificacao = (data.dadosIdentificacao || {}) as Record<string, unknown>;
  const nomeCompleto = String(identificacao.nomeCompleto || data.nome || nomeFallback || '').trim() || 'Paciente';
  const endereco = (identificacao.endereco || {}) as { cidade?: string; estado?: string };
  const cidade = endereco.cidade?.trim();
  const estado = endereco.estado?.trim();
  const cidadeEstado = cidade && estado ? `${cidade}-${estado}` : cidade || estado || null;
  const idade = calcularIdade(identificacao.dataNascimento);

  const evolucaoRaw = Array.isArray(data.evolucaoSeguimento) ? data.evolucaoSeguimento : [];
  const evolucaoOrdenada = evolucaoOrdenadaFromRaw(evolucaoRaw);

  const dadosClinicos = (data.dadosClinicos || {}) as {
    medidasIniciais?: { peso?: number; circunferenciaAbdominal?: number; comprimentoAbdominal?: number };
  };
  const medidas = dadosClinicos.medidasIniciais;
  const plano = (data.planoTerapeutico || {}) as {
    conclusaoTratamento?: {
      pesoInicialKg?: number;
      pesoAtualKg?: number;
      pesoFinalKg?: number;
      perdaTotalKg?: number;
      perdaPercentual?: number;
      circunferenciaAbdominalInicialCm?: number;
      circunferenciaAbdominalFinalCm?: number;
      comprimentoAbdominalInicialCm?: number;
      comprimentoAbdominalFinalCm?: number;
    };
  };
  const conclusao = plano.conclusaoTratamento || {};

  let pesoInicialKg: number | null =
    typeof conclusao.pesoInicialKg === 'number' ? conclusao.pesoInicialKg : null;
  let pesoAtualKg: number | null =
    typeof conclusao.pesoAtualKg === 'number'
      ? conclusao.pesoAtualKg
      : typeof conclusao.pesoFinalKg === 'number'
        ? conclusao.pesoFinalKg
        : null;

  const primeiroPeso = evolucaoOrdenada.find((p) => p.peso != null)?.peso ?? null;
  const ultimoPeso = [...evolucaoOrdenada].reverse().find((p) => p.peso != null)?.peso ?? null;
  pesoInicialKg = pesoInicialKg ?? primeiroPeso ?? (typeof medidas?.peso === 'number' ? medidas.peso : null);
  pesoAtualKg = pesoAtualKg ?? ultimoPeso ?? pesoInicialKg;

  let perdaTotalKg: number | null =
    typeof conclusao.perdaTotalKg === 'number' ? conclusao.perdaTotalKg : null;
  let perdaPercentual: number | null =
    typeof conclusao.perdaPercentual === 'number' ? conclusao.perdaPercentual : null;
  if (perdaTotalKg == null && pesoInicialKg != null && pesoAtualKg != null) {
    perdaTotalKg = pesoInicialKg - pesoAtualKg;
    perdaPercentual = pesoInicialKg > 0 ? (perdaTotalKg / pesoInicialKg) * 100 : null;
  }

  let comprimentoAbdominalInicialCm: number | null =
    typeof conclusao.comprimentoAbdominalInicialCm === 'number'
      ? conclusao.comprimentoAbdominalInicialCm
      : typeof conclusao.circunferenciaAbdominalInicialCm === 'number'
        ? conclusao.circunferenciaAbdominalInicialCm
        : typeof medidas?.circunferenciaAbdominal === 'number'
          ? medidas.circunferenciaAbdominal
          : typeof medidas?.comprimentoAbdominal === 'number'
            ? medidas.comprimentoAbdominal
            : null;
  let comprimentoAbdominalAtualCm: number | null =
    typeof conclusao.comprimentoAbdominalFinalCm === 'number'
      ? conclusao.comprimentoAbdominalFinalCm
      : typeof conclusao.circunferenciaAbdominalFinalCm === 'number'
        ? conclusao.circunferenciaAbdominalFinalCm
        : null;
  if (comprimentoAbdominalAtualCm == null) {
    const ultimaCirc = [...evolucaoOrdenada].reverse().find((p) => p.circunferenciaAbdominal != null);
    comprimentoAbdominalAtualCm = ultimaCirc?.circunferenciaAbdominal ?? null;
  }

  const perdaAbdominalCm =
    comprimentoAbdominalInicialCm != null && comprimentoAbdominalAtualCm != null
      ? comprimentoAbdominalInicialCm - comprimentoAbdominalAtualCm
      : null;
  const perdaPercentualAbdominal =
    perdaAbdominalCm != null && comprimentoAbdominalInicialCm != null && comprimentoAbdominalInicialCm > 0
      ? (perdaAbdominalCm / comprimentoAbdominalInicialCm) * 100
      : null;

  const evolucao = evolucaoOrdenada.map((p) => ({
    weekIndex: p.weekIndex,
    peso: p.peso ?? 0,
    doseMg: p.doseMg,
    circunferenciaAbdominal: p.circunferenciaAbdominal,
  }));

  const temResultado =
    evolucao.length > 0 || pesoInicialKg != null || comprimentoAbdominalInicialCm != null;
  if (!temResultado) return null;

  return {
    instanceKey: `${pacienteId}_indicacao`,
    pacienteId,
    nome: nomeCompleto,
    cidadeEstado,
    idade,
    depoimento: '',
    estrelas: 0,
    pesoInicialKg,
    pesoAtualKg,
    perdaTotalKg,
    perdaPercentual,
    comprimentoAbdominalInicialCm,
    comprimentoAbdominalAtualCm,
    perdaAbdominalCm,
    perdaPercentualAbdominal,
    evolucao,
  };
}
