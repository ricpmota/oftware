import type { PacienteCompleto, ExamesLaboratoriais, ExameDeImagemPaciente, Alerta } from '@/types/obesidade';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { Prescricao } from '@/types/prescricao';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { TrainingSession } from '@/types/trainingSession';
import type { EventoTimelineMock } from './prontuarioTypes';
import { calcularDeltaAcumuladoMedida, formatarVariacaoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as Record<string, unknown>).toDate === 'function') {
    return (val as { toDate(): Date }).toDate();
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function fmtDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Etapa 1 — Peso, Cintura, Aniversário, Alertas
// ---------------------------------------------------------------------------

export function extrairEventosPeso(paciente: PacienteCompleto): EventoTimelineMock[] {
  const eventos: EventoTimelineMock[] = [];

  const pesoInicial = paciente.dadosClinicos?.medidasIniciais?.peso;
  if (pesoInicial) {
    const dataCad = toDate(paciente.dataCadastro);
    if (dataCad) {
      eventos.push({
        id: 'peso-inicial',
        tipo: 'peso',
        titulo: 'Peso inicial registrado',
        descricao: `Peso inicial do paciente: ${pesoInicial} kg`,
        data: fmtDDMMYYYY(dataCad),
        origem: 'sistema',
        destaque: `${pesoInicial} kg`,
        dados: { peso: `${pesoInicial} kg`, status: 'Medida inicial' },
      });
    }
  }

  for (const seg of paciente.evolucaoSeguimento ?? []) {
    if (seg.peso == null) continue;
    const dt = toDate(seg.dataRegistro);
    if (!dt) continue;
    eventos.push({
      id: `peso-semana-${seg.weekIndex}`,
      tipo: 'peso',
      titulo: `Peso — Semana ${seg.weekIndex}`,
      descricao: `Registro de peso: ${seg.peso} kg`,
      data: fmtDDMMYYYY(dt),
      origem: 'paciente',
      dados: { peso: `${seg.peso} kg`, status: 'Seguimento semanal' },
    });
  }

  return eventos;
}

export function extrairEventosCintura(paciente: PacienteCompleto): EventoTimelineMock[] {
  const eventos: EventoTimelineMock[] = [];

  const cinturaInicial = paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;
  if (cinturaInicial) {
    const dataCad = toDate(paciente.dataCadastro);
    if (dataCad) {
      eventos.push({
        id: 'cintura-inicial',
        tipo: 'cintura',
        titulo: 'Cintura inicial registrada',
        descricao: `Circunferência abdominal inicial: ${cinturaInicial} cm`,
        data: fmtDDMMYYYY(dataCad),
        origem: 'sistema',
        destaque: `${cinturaInicial} cm`,
        dados: { cintura: `${cinturaInicial} cm`, status: 'Medida inicial' },
      });
    }
  }

  for (const seg of paciente.evolucaoSeguimento ?? []) {
    if (seg.circunferenciaAbdominal == null) continue;
    const dt = toDate(seg.dataRegistro);
    if (!dt) continue;
    eventos.push({
      id: `cintura-semana-${seg.weekIndex}`,
      tipo: 'cintura',
      titulo: `Cintura — Semana ${seg.weekIndex}`,
      descricao: `Circunferência abdominal: ${seg.circunferenciaAbdominal} cm`,
      data: fmtDDMMYYYY(dt),
      origem: 'paciente',
      dados: { cintura: `${seg.circunferenciaAbdominal} cm`, status: 'Seguimento semanal' },
    });
  }

  return eventos;
}

export function extrairEventosAniversario(paciente: PacienteCompleto): EventoTimelineMock[] {
  const nascRaw = paciente.dadosIdentificacao?.dataNascimento;
  const nasc = toDate(nascRaw);
  if (!nasc) return [];

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const anoAtual = hoje.getFullYear();

  const candidatos = [
    new Date(anoAtual - 1, nasc.getMonth(), nasc.getDate()),
    new Date(anoAtual, nasc.getMonth(), nasc.getDate()),
  ].filter((dt) => dt <= hoje);

  return candidatos.map((dt) => {
    const idade = dt.getFullYear() - nasc.getFullYear();
    return {
      id: `aniversario-${dt.getFullYear()}`,
      tipo: 'aniversario' as const,
      titulo: `Aniversário — ${idade} anos`,
      descricao: `${paciente.dadosIdentificacao?.nomeCompleto ?? paciente.nome} completa ${idade} anos.`,
      data: fmtDDMMYYYY(dt),
      origem: 'sistema' as const,
      destaque: `${idade} anos`,
    };
  });
}

const ALERTA_LABEL: Record<string, string> = {
  MISSED_DOSE: 'Dose perdida',
  GI_MILD: 'Efeitos GI leves',
  GI_SEVERE: 'Efeitos GI graves',
  PREGNANCY_FLAG: 'Alerta de gravidez',
  MEN2_RISK: 'Risco MEN2',
  PANCREATITIS_SUSPECTED: 'Suspeita de pancreatite',
  RENAL_DECLINE: 'Declínio renal',
  HYPOGLYCEMIA_RISK: 'Risco de hipoglicemia',
  LAB_ABNORMAL: 'Exame laboratorial alterado',
  EDEMA_SEVERE: 'Edema grave',
  TECHNICAL_EVENT: 'Evento técnico',
};

export function extrairEventosAlertas(paciente: PacienteCompleto): EventoTimelineMock[] {
  return (paciente.alertas ?? [])
    .filter((a: Alerta) => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')
    .map((a: Alerta) => {
      const dt = toDate(a.generatedAt);
      return {
        id: `alerta-${a.id}`,
        tipo: 'sistema_importante' as const,
        titulo: ALERTA_LABEL[a.type] ?? a.type,
        descricao: a.description,
        data: dt ? fmtDDMMYYYY(dt) : '01/01/2024',
        origem: 'sistema' as const,
        ...(a.severity === 'CRITICAL' ? { destaque: 'Alerta crítico' } : {}),
        dados: { status: `${a.severity} — ${a.status}` },
      };
    });
}

// ---------------------------------------------------------------------------
// Etapa 2 — Exames Laboratoriais + Imagem
// ---------------------------------------------------------------------------

const EXAME_LAB_LABELS: Record<string, string> = {
  glicemiaJejum: 'Glicemia de jejum',
  hemoglobinaGlicada: 'HbA1c',
  ureia: 'Ureia',
  creatinina: 'Creatinina',
  taxaFiltracaoGlomerular: 'TFG',
  tgo: 'TGO (AST)',
  tgp: 'TGP (ALT)',
  ggt: 'GGT',
  fosfataseAlcalina: 'Fosfatase alcalina',
  amilase: 'Amilase',
  lipase: 'Lipase',
  colesterolTotal: 'Colesterol total',
  hdl: 'HDL',
  ldl: 'LDL',
  triglicerides: 'Triglicerídeos',
  tsh: 'TSH',
  t4Livre: 'T4 livre',
  calcitonina: 'Calcitonina',
  ferritina: 'Ferritina',
  ferroSerico: 'Ferro sérico',
  vitaminaB12: 'Vitamina B12',
  vitaminaD: 'Vitamina D',
};

function resumirMarcadoresLab(exame: ExamesLaboratoriais): string {
  const preenchidos: string[] = [];
  for (const [key, label] of Object.entries(EXAME_LAB_LABELS)) {
    if ((exame as Record<string, unknown>)[key] != null) {
      preenchidos.push(label);
    }
  }
  if (exame.hemogramaCompleto) {
    const hc = exame.hemogramaCompleto;
    if (hc.hemoglobina != null || hc.hematocrito != null || hc.leucocitos != null || hc.plaquetas != null) {
      preenchidos.push('Hemograma');
    }
  }
  if (preenchidos.length === 0) return 'Resultado laboratorial registrado.';
  if (preenchidos.length <= 5) return `Marcadores: ${preenchidos.join(', ')}.`;
  return `${preenchidos.length} marcadores: ${preenchidos.slice(0, 4).join(', ')} e mais ${preenchidos.length - 4}.`;
}

export function extrairEventosExamesLab(paciente: PacienteCompleto): EventoTimelineMock[] {
  return (paciente.examesLaboratoriais ?? []).map((ex) => {
    const dt = toDate(ex.dataColeta);
    return {
      id: `exame-lab-${ex.id}`,
      tipo: 'exame_resultado' as const,
      titulo: 'Resultado laboratorial',
      descricao: resumirMarcadoresLab(ex),
      data: dt ? fmtDDMMYYYY(dt) : '01/01/2024',
      origem: 'sistema' as const,
      dados: { exame: 'Laboratorial', status: 'Resultado recebido' },
    };
  });
}

export function extrairEventosExamesImagem(paciente: PacienteCompleto): EventoTimelineMock[] {
  return (paciente.examesDeImagem ?? []).map((ex) => {
    let dt: Date | null = null;
    if (ex.dataExame) {
      const parts = ex.dataExame.split(/[-/]/);
      if (parts.length === 3) {
        const [a, b, c] = parts.map(Number);
        dt = a > 31 ? new Date(a, b - 1, c) : new Date(c, b - 1, a);
        if (isNaN(dt.getTime())) dt = null;
      }
    }
    if (!dt && ex.criadoEm) dt = toDate(ex.criadoEm);

    return {
      id: `exame-img-${ex.id}`,
      tipo: 'exame_resultado' as const,
      titulo: `Exame de imagem: ${ex.tipoExame}`,
      descricao: ex.resumoEquipamentoOuRegiao
        ? `${ex.nomeArquivo} — ${ex.resumoEquipamentoOuRegiao}`
        : ex.nomeArquivo,
      data: dt ? fmtDDMMYYYY(dt) : '01/01/2024',
      origem: 'sistema' as const,
      dados: { exame: ex.tipoExame, status: 'Exame de imagem' },
    };
  });
}

// ---------------------------------------------------------------------------
// Etapa 3 — IA + Bioimpedância
// ---------------------------------------------------------------------------

export function extrairEventosIA(paciente: PacienteCompleto): EventoTimelineMock[] {
  const ia = paciente.dadosClinicos?.anamneseInteligenteV3;
  if (!ia) return [];

  const dt = toDate(ia.geradoEm);
  const resumo = ia.resumoMedico?.length > 120
    ? ia.resumoMedico.slice(0, 117) + '...'
    : ia.resumoMedico;

  return [{
    id: 'ia-anamnese-v3',
    tipo: 'ia',
    titulo: 'Análise inteligente gerada',
    descricao: resumo || 'Análise por IA do perfil do paciente.',
    data: dt ? fmtDDMMYYYY(dt) : '01/01/2024',
    origem: 'sistema',
    destaque: `Confiança: ${ia.nivelConfianca}`,
    dados: { status: `${ia.highlights?.length ?? 0} destaques identificados` },
  }];
}

export function extrairEventosBioimpedancia(registros: BioImpedanciaRegistro[]): EventoTimelineMock[] {
  return registros.map((reg, idx) => {
    const dt = toDate(reg.dataRegistro);
    const pgc = reg.analiseObesidade?.percentualGordura;
    const mm = reg.analiseMusculoGordura?.massaMuscularKg;

    const descParts: string[] = [`Peso: ${reg.peso} kg`];
    if (pgc != null) descParts.push(`Gordura corporal: ${pgc}%`);
    if (mm != null) descParts.push(`Massa muscular: ${mm} kg`);

    return {
      id: `bio-${idx}-${dt?.getTime() ?? idx}`,
      tipo: 'bioimpedancia' as const,
      titulo: 'Avaliação de bioimpedância',
      descricao: descParts.join(' · '),
      data: dt ? fmtDDMMYYYY(dt) : '01/01/2024',
      origem: 'sistema' as const,
      ...(pgc != null ? { destaque: `${pgc}% gordura` } : {}),
      dados: { peso: `${reg.peso} kg`, status: 'Avaliação registrada' },
    };
  });
}

// ---------------------------------------------------------------------------
// Etapa 4 — Prescrições + Pagamentos
// ---------------------------------------------------------------------------

export function prescricoesParaEventos(prescricoes: Prescricao[]): EventoTimelineMock[] {
  return prescricoes
    .filter((p) => p.pacienteId)
    .map((p) => {
      const dt = toDate(p.criadoEm);
      const nItens = p.itens?.length ?? 0;
      const resumoItens = nItens > 0
        ? p.itens.slice(0, 3).map((i) => i.medicamento).join(', ') + (nItens > 3 ? ` (+${nItens - 3})` : '')
        : 'Sem itens';
      const ehRecibo = p.tipoDocumento === 'recibo_medico';

      return {
        id: `prescricao-${p.id}`,
        tipo: 'prescricao' as const,
        titulo: ehRecibo ? `Recibo: ${p.nome}` : `Prescrição: ${p.nome}`,
        descricao: ehRecibo
          ? `Valor: R$ ${p.valorConsulta?.toFixed(2) ?? '—'}`
          : resumoItens,
        data: dt ? fmtDDMMYYYY(dt) : '01/01/2024',
        origem: 'medico' as const,
        dados: { status: ehRecibo ? 'Recibo médico' : `${nItens} item(ns)` },
      };
    });
}

const STATUS_PAGAMENTO_LABEL: Record<string, string> = {
  negociacao: 'Em negociação',
  iniciou_pagamento: 'Pagamento iniciado',
  em_aberto: 'Em aberto',
  pago: 'Pago',
};

export function pagamentoParaEventos(pagamento: PagamentoPaciente): EventoTimelineMock[] {
  const eventos: EventoTimelineMock[] = [];

  if (pagamento.parcelas && pagamento.parcelas.length > 0) {
    for (const parc of pagamento.parcelas) {
      const dt = toDate(parc.dataPagamento ?? parc.dataVencimento);
      if (!dt) continue;
      eventos.push({
        id: `pagamento-parcela-${parc.numero}`,
        tipo: 'pagamento',
        titulo: `Parcela ${parc.numero} — ${parc.status === 'paga' ? 'Paga' : parc.status === 'atrasada' ? 'Atrasada' : 'Pendente'}`,
        descricao: `R$ ${parc.valor.toFixed(2)}${parc.formaPagamento ? ` (${parc.formaPagamento})` : ''}`,
        data: fmtDDMMYYYY(dt),
        origem: 'sistema',
        ...(parc.status === 'atrasada' ? { destaque: 'Parcela atrasada' } : {}),
        dados: { valor: `R$ ${parc.valor.toFixed(2)}`, status: parc.status === 'paga' ? 'Paga' : parc.status === 'atrasada' ? 'Atrasada' : 'Pendente' },
      });
    }
  } else {
    const dt = toDate(pagamento.dataPagamento ?? pagamento.dataVencimento ?? pagamento.dataUltimaAtualizacao);
    if (dt) {
      eventos.push({
        id: 'pagamento-geral',
        tipo: 'pagamento',
        titulo: `Pagamento — ${STATUS_PAGAMENTO_LABEL[pagamento.statusPagamento] ?? pagamento.statusPagamento}`,
        descricao: `Total: R$ ${pagamento.valorTotal.toFixed(2)} · Pago: R$ ${pagamento.valorPago.toFixed(2)}`,
        data: fmtDDMMYYYY(dt),
        origem: 'sistema',
        dados: { valor: `R$ ${pagamento.valorTotal.toFixed(2)}`, status: STATUS_PAGAMENTO_LABEL[pagamento.statusPagamento] ?? pagamento.statusPagamento },
      });
    }
  }

  return eventos;
}

// ---------------------------------------------------------------------------
// Etapa 5 — Atividade Física + Fotos de Progresso
// ---------------------------------------------------------------------------

const SESSION_STATUS_LABEL: Record<string, string> = {
  done: 'Realizado',
  skipped: 'Não realizado',
  scheduled: 'Agendado',
};

export function trainingSessionsParaEventos(sessions: TrainingSession[]): EventoTimelineMock[] {
  return sessions.map((s) => {
    const [y, m, d] = s.scheduledDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return {
      id: `treino-${s.id ?? s.scheduledDate}`,
      tipo: 'atividade_fisica' as const,
      titulo: s.title || 'Sessão de treino',
      descricao: `Status: ${SESSION_STATUS_LABEL[s.status] ?? s.status}${s.trainerNotes ? ` — ${s.trainerNotes}` : ''}`,
      data: fmtDDMMYYYY(dt),
      origem: 'personal' as const,
      ...(s.status === 'done' ? { destaque: 'Treino realizado' } : {}),
      dados: { status: SESSION_STATUS_LABEL[s.status] ?? s.status },
    };
  });
}

export interface ProgressPhotoData {
  id: string;
  tipo: string;
  url: string;
  semana?: number;
  createdAt?: unknown;
  dataAplicacao?: unknown;
}

export function progressPhotosParaEventos(fotos: ProgressPhotoData[]): EventoTimelineMock[] {
  return fotos.map((f) => {
    const dt = toDate(f.createdAt ?? f.dataAplicacao);
    return {
      id: `foto-${f.id}`,
      tipo: 'imagem' as const,
      titulo: `Foto de progresso: ${f.tipo}`,
      descricao: f.semana != null ? `Semana ${f.semana} — foto compartilhada pelo paciente.` : 'Foto compartilhada pelo paciente.',
      data: dt ? fmtDDMMYYYY(dt) : '01/01/2024',
      origem: 'paciente' as const,
      dados: { status: 'Foto compartilhada' },
    };
  });
}

export interface SolicitacaoExameData {
  id: string;
  medicoId: string;
  exames: string[];
  hipoteseDiagnostica: string;
  criadoEm?: unknown;
}

export function solicitacoesExamesParaEventos(solicitacoes: SolicitacaoExameData[]): EventoTimelineMock[] {
  return solicitacoes.map((s) => {
    const dt = toDate(s.criadoEm);
    const listaExames = s.exames.length <= 5
      ? s.exames.join(', ')
      : `${s.exames.slice(0, 5).join(', ')} +${s.exames.length - 5}`;
    const descParts = [`Exames: ${listaExames}`];
    if (s.hipoteseDiagnostica) descParts.push(`HD: ${s.hipoteseDiagnostica}`);
    return {
      id: `solicitacao-exame-${s.id}`,
      tipo: 'exame_solicitado' as const,
      titulo: `Solicitação de exames (${s.exames.length})`,
      descricao: descParts.join('\n'),
      data: dt ? fmtDDMMYYYY(dt) : '01/01/2024',
      origem: 'medico' as const,
      dados: { exame: 'Solicitação', status: `${s.exames.length} exame(s) solicitado(s)` },
    };
  });
}

function toNumPositivo(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return !isNaN(n) && n > 0 ? n : null;
}

/** Evento automático quando o paciente registra a conclusão do tratamento. */
export function extrairEventoConclusaoTratamento(paciente: PacienteCompleto): EventoTimelineMock | null {
  const ct = paciente.planoTerapeutico?.conclusaoTratamento as Record<string, unknown> | undefined;
  const pesoFinalKg = toNumPositivo(ct?.pesoFinalKg);
  if (!ct || pesoFinalKg == null) return null;

  const evolucao = paciente.evolucaoSeguimento ?? [];
  const primeiroRegistro = evolucao.find((e) => (e.weekIndex ?? (e as { numeroSemana?: number }).numeroSemana) === 1);
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const pesoInicialKg = primeiroRegistro?.peso ?? medidasIniciais?.peso ?? null;
  const pesoPerdidoAcumulado = calcularDeltaAcumuladoMedida(pesoInicialKg, pesoFinalKg);

  const circFinal = toNumPositivo(ct.circunferenciaAbdominalFinalCm);
  const circInicial =
    toNumPositivo(primeiroRegistro?.circunferenciaAbdominal) ?? toNumPositivo(medidasIniciais?.circunferenciaAbdominal);
  const reducaoAbdominalCm = calcularDeltaAcumuladoMedida(circInicial, circFinal);

  const percepcao = typeof ct.percepcaoResultadoFinal === 'string' ? ct.percepcaoResultadoFinal : undefined;
  const conquista = typeof ct.principalConquista === 'string' ? ct.principalConquista : undefined;
  const depoimento = typeof ct.depoimento === 'string' && ct.depoimento.trim() ? ct.depoimento.trim() : undefined;
  const estrelasMedico = typeof ct.estrelasMedico === 'number' ? Math.round(ct.estrelasMedico) : undefined;

  const dt = toDate(ct.dataConclusao) ?? toDate(ct.updatedAt) ?? toDate(paciente.dataCadastro);
  if (!dt) return null;

  const pesoPerdidoFmt = formatarVariacaoMedida(pesoPerdidoAcumulado, 'kg');
  const reducaoAbdominalFmt = formatarVariacaoMedida(reducaoAbdominalCm, 'cm');

  const descParts: string[] = [
    `Peso final: ${pesoFinalKg} kg`,
    pesoPerdidoFmt ? `Peso perdido (acum.): ${pesoPerdidoFmt}` : null,
    circFinal != null ? `Circunferência final: ${circFinal} cm` : null,
    reducaoAbdominalFmt ? `Redução abdominal (acum.): ${reducaoAbdominalFmt}` : null,
    percepcao ? `Percepção: ${percepcao}` : null,
    conquista ? `Principal conquista: ${conquista}` : null,
    depoimento ? `Depoimento: ${depoimento.length > 120 ? `${depoimento.slice(0, 120)}…` : depoimento}` : null,
    estrelasMedico != null && estrelasMedico >= 1 ? `Nota do tratamento: ${estrelasMedico}/5` : null,
  ].filter(Boolean) as string[];

  return {
    id: 'conclusao-tratamento-registrada',
    tipo: 'conclusao_tratamento',
    titulo: 'Conclusão do tratamento registrada',
    descricao: descParts.join(' · '),
    data: fmtDDMMYYYY(dt),
    origem: 'paciente',
    destaque: 'Encerramento do ciclo terapêutico',
    dados: {
      status: 'Conclusão registrada',
      conclusaoTratamento: {
        pesoFinalKg,
        pesoPerdidoAcumulado,
        ...(circFinal != null ? { circunferenciaFinalCm: circFinal } : {}),
        reducaoAbdominalCm,
        ...(percepcao ? { percepcaoResultadoFinal: percepcao } : {}),
        ...(conquista ? { principalConquista: conquista } : {}),
        ...(depoimento ? { depoimento } : {}),
        ...(estrelasMedico != null && estrelasMedico >= 1 ? { estrelasMedico } : {}),
      },
    },
  };
}
