import type { DadosClinicos, PacienteCompleto, PerfilMetabolicoV3 } from '@/types/obesidade';
import {
  COMORBIDADES_OPTIONS,
  DIAGNOSTICO_LABELS,
  MOTIVACAO_OPTIONS,
  RISK_QUESTIONS,
  SINTOMAS_GI_OPTIONS,
  TIREOIDE_OPTIONS,
  filterRiskQuestionsForSexo,
  riskOptionLabel,
} from '@/lib/meta/metaChatInicial';
import { rotulosCirurgias } from '@/lib/meta/metaChatInicial/cirurgias';
import { rotulosMedicamentosDiabetes } from '@/lib/meta/metaChatInicial/medicamentosDiabetes';
import { respostaDepressao, respostaIdeacao, rotuloSimNao } from '@/lib/meta/metaChatInicial/triagemHumor';
import {
  blocoBarreirasCompleto,
  blocoEnergiaCompleto,
  blocoHistoricoCompleto,
  blocoMedicamentosCompleto,
  blocoSonoCompleto,
  deriveExpectativaPerdaPesoFromMetas,
  shouldSkipExpectativaPerdaPesoStep,
} from '@/lib/meta/perfilMetabolicoV3Chat';

export type AnamneseEditTarget =
  | { kind: 'v2'; id: string; title: string }
  | { kind: 'v3'; id: string; title: string };

export type AnamneseCampoStatus = 'vazio' | 'parcial' | 'preenchido';

export type AnamneseCampo = {
  id: string;
  label: string;
  values: string[];
  status: AnamneseCampoStatus;
  edit: AnamneseEditTarget;
};

export type AnamneseBloco = {
  id: string;
  numero: string;
  titulo: string;
  campos: AnamneseCampo[];
  /** Só quando cada pergunta de risco aplicável foi respondida com Não. */
  nenhumFatorRiscoRelatado?: boolean;
};

export type AnamnesePendencia = {
  id: string;
  label: string;
};

export type AnamneseIndicador = {
  id: string;
  rotulo: string;
  valor: string;
  atencao?: boolean;
};

export type AnamneseLayout = {
  destaques: string[];
  indicadores: AnamneseIndicador[];
  pendencias: AnamnesePendencia[];
  blocos: AnamneseBloco[];
};

const SIM_NAO: Record<string, string> = {
  sim: 'Sim',
  nao: 'Não',
  as_vezes: 'Às vezes',
  nao_sei: 'Não sei',
  nao_aplicavel: 'Não se aplica',
};

const QUALIDADE_SONO: Record<string, string> = {
  muito_bom: 'Muito bom',
  bom: 'Bom',
  regular: 'Regular',
  ruim: 'Ruim',
  muito_ruim: 'Muito ruim',
};

const HORAS_SONO: Record<string, string> = {
  menos_5: 'Menos de 5 h',
  '5_6': '5–6 h',
  '7_8': '7–8 h',
  mais_8: 'Mais de 8 h',
};

const ROTINA: Record<string, string> = {
  sedentario: 'Sedentário',
  leve: 'Leve',
  moderada: 'Moderada',
  intensa: 'Intensa',
};

const MOMENTO_ALIM: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  fim_de_semana: 'Fim de semana',
};

const ENERGIA_NIVEL: Record<string, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
  muito_baixa: 'Muito baixa',
};

const EXPECTATIVA_PESO: Record<string, string> = {
  ate_5kg: 'Até 5 kg',
  '5_10kg': '5–10 kg',
  '10_15kg': '10–15 kg',
  mais_15kg: 'Mais de 15 kg',
  nao_sei: 'Ainda não sabe',
};

const MEDICACOES_PREV: Record<string, string> = {
  semaglutida: 'Semaglutida',
  tirzepatida: 'Tirzepatida',
  sibutramina: 'Sibutramina',
  orlistate: 'Orlistate',
  outro: 'Outro',
  nenhuma: 'Nenhuma',
};

const DIFICULDADES: Record<string, string> = {
  faltaTempo: 'Falta de tempo',
  dor: 'Dor',
  desanimo: 'Desânimo',
  nenhuma: 'Nenhuma',
};

const BARREIRAS_ENERGIA: Record<string, string> = {
  faltaTempo: 'Falta de tempo',
  faltaMotivacao: 'Falta de motivação',
  faltaPlanejamento: 'Falta de planejamento',
  faltaApoio: 'Falta de apoio',
  nenhuma: 'Nenhuma',
};

const BARREIRAS_ADESAO: Record<string, string> = {
  faltaTempo: 'Falta de tempo',
  faltaMotivacao: 'Falta de motivação',
  custo: 'Custo',
  efeitosColaterais: 'Efeitos colaterais',
  rotinaCorrida: 'Rotina corrida',
  faltaApoio: 'Falta de apoio',
  nenhuma: 'Nenhuma',
  outro: 'Outro',
};

const EMOCIONAL = [
  { key: 'vontadeDoces' as const, label: 'Vontade de doces' },
  { key: 'beliscaEntreRefeicoes' as const, label: 'Belisca entre refeições' },
  { key: 'comeAnsiedadeEstresse' as const, label: 'Come por ansiedade ou estresse' },
  { key: 'perdaControleAlimentar' as const, label: 'Perda de controle alimentar' },
];

function campo(
  id: string,
  label: string,
  values: string[],
  status: AnamneseCampoStatus,
  edit: AnamneseEditTarget
): AnamneseCampo {
  return { id, label, values, status, edit };
}

function statusDe(values: string[], completo: boolean): AnamneseCampoStatus {
  if (values.length === 0) return 'vazio';
  return completo ? 'preenchido' : 'parcial';
}

function flagsChips(obj: Record<string, boolean> | undefined, labels: Record<string, string>): string[] {
  if (!obj) return [];
  return Object.entries(obj)
    .filter(([k, v]) => v && k !== 'outroDescricao')
    .map(([k]) => labels[k] || k);
}

function rotulo(map: Record<string, string>, value?: string): string | undefined {
  if (!value) return undefined;
  return map[value] || value;
}

function tiposDiagnostico(dc?: DadosClinicos): string[] {
  const dcAny = dc as { diagnosticoPrincipalTipos?: string[] } | undefined;
  const raw =
    dcAny?.diagnosticoPrincipalTipos ||
    (dc?.diagnosticoPrincipal?.tipo ? [dc.diagnosticoPrincipal.tipo] : []);
  return Array.isArray(raw) ? raw : [];
}

function chipsDiagnostico(dc?: DadosClinicos): string[] {
  return tiposDiagnostico(dc).map((t) => {
    if (t === 'outro' && dc?.diagnosticoPrincipal?.outro?.trim()) return dc.diagnosticoPrincipal.outro.trim();
    return DIAGNOSTICO_LABELS[t] || t;
  });
}

function chipsMotivacao(dc?: DadosClinicos): string[] {
  const m = (dc?.motivacao || {}) as Record<string, boolean>;
  const chips: string[] = [];
  MOTIVACAO_OPTIONS.forEach(({ key, label }) => {
    if (m[key] && key !== 'outro') chips.push(label);
  });
  if (m.outro && dc?.motivacaoOutro?.trim()) chips.push(dc.motivacaoOutro.trim());
  else if (m.outro) chips.push('Outro');
  return chips;
}

function chipsComorbidades(dc?: DadosClinicos): string[] {
  const c = (dc?.comorbidades || {}) as Record<string, unknown>;
  const chips: string[] = [];
  COMORBIDADES_OPTIONS.forEach(({ key, label }) => {
    if (c[key]) chips.push(label);
  });
  if (c.outra && typeof c.outraDescricao === 'string' && c.outraDescricao.trim()) {
    chips.push(c.outraDescricao.trim());
  }
  return chips;
}

function chipsAlergias(dc?: DadosClinicos): string[] {
  const a = dc?.alergias;
  const chips: string[] = [];
  if (a?.semAlergias) chips.push('Sem alergias conhecidas');
  if (a?.medicamentosa) {
    const farm = a.medicamentosa.farmaco?.trim();
    const reac = a.medicamentosa.reacao?.trim();
    chips.push(farm || reac ? `Medicamentosa: ${[farm, reac].filter(Boolean).join(' — ')}` : 'Medicamentosa');
  }
  if (a?.alimento?.trim()) chips.push(`Alimento: ${a.alimento.trim()}`);
  if (a?.latexAdesivo?.trim()) chips.push(`Látex/adesivo: ${a.latexAdesivo.trim()}`);
  return chips;
}

function chipsMedicacoesAtuais(dc?: DadosClinicos): string[] {
  const meds = Array.isArray(dc?.medicacoesUsoAtual) ? dc.medicacoesUsoAtual : [];
  return meds
    .filter((med) => med?.categoria || med?.nomeFarmaco?.trim())
    .map((med) => med.nomeFarmaco?.trim() || med.categoria);
}

function chipsTireoide(dc?: DadosClinicos): string[] {
  if (!dc?.historiaTireoidiana && !(dc?.historiaTireoidianaOutro || '').trim()) return [];
  if (dc.historiaTireoidiana === 'outro' && dc.historiaTireoidianaOutro?.trim()) {
    return [dc.historiaTireoidianaOutro.trim()];
  }
  const opt = TIREOIDE_OPTIONS.find((o) => o.value === dc.historiaTireoidiana);
  return [opt?.label || dc.historiaTireoidiana || dc.historiaTireoidianaOutro || ''].filter(Boolean);
}

function chipsGi(dc?: DadosClinicos): string[] {
  const gi = (dc?.sintomasGI || {}) as Record<string, boolean>;
  return SINTOMAS_GI_OPTIONS.filter(({ key }) => gi[key]).map(({ label }) => label);
}

function nenhumFatorRiscoRelatado(dc: DadosClinicos | undefined, sexo?: string): boolean {
  const riscos = dc?.riscos as Record<string, string> | undefined;
  const perguntas = filterRiskQuestionsForSexo(sexo);
  if (perguntas.length === 0) return false;
  return perguntas.every((q) => riscos?.[q.key] === 'nao');
}

function chipsSono(s: PerfilMetabolicoV3['sono']): string[] {
  const chips: string[] = [];
  const qualidade = rotulo(QUALIDADE_SONO, s?.qualidadeSono);
  const horas = rotulo(HORAS_SONO, s?.horasSonoMedias);
  if (qualidade) chips.push(qualidade);
  if (horas) chips.push(horas);
  if (s?.acordaCansado) chips.push(`Acorda cansado: ${SIM_NAO[s.acordaCansado] || s.acordaCansado}`);
  if (s?.ronca) chips.push(`Ronca: ${SIM_NAO[s.ronca] || s.ronca}`);
  if (s?.acordaDuranteNoite) chips.push(`Acorda à noite: ${SIM_NAO[s.acordaDuranteNoite] || s.acordaDuranteNoite}`);
  return chips;
}

function chipsMedicamentosPrevios(m: PerfilMetabolicoV3['medicamentosPrevios']): string[] {
  if (!m?.usouMedicacaoParaEmagrecer) return [];
  const chips = [`Usou medicação: ${SIM_NAO[m.usouMedicacaoParaEmagrecer] || m.usouMedicacaoParaEmagrecer}`];
  if (m.usouMedicacaoParaEmagrecer === 'sim') {
    chips.push(...flagsChips(m.medicacoes, MEDICACOES_PREV));
    if (m.teveEfeitosColaterais) chips.push(`Efeitos colaterais: ${SIM_NAO[m.teveEfeitosColaterais] || m.teveEfeitosColaterais}`);
  }
  return chips;
}

function pendenciaLabel(item: AnamneseCampo): string | null {
  if (item.status === 'vazio') return item.label;
  if (item.status === 'parcial') return `${item.label} incompleto`;
  return null;
}

export function buildAnamneseLayout(paciente: PacienteCompleto): AnamneseLayout {
  const dc = paciente.dadosClinicos;
  const pm = dc?.perfilMetabolicoV3;
  const sexo = paciente.dadosIdentificacao?.sexoBiologico;
  const tipos = tiposDiagnostico(dc);
  const medsDiabetes = rotulosMedicamentosDiabetes(dc?.medicamentosDiabetes as Record<string, unknown> | undefined);
  const mostrarDiabetes = tipos.includes('dm1') || tipos.includes('dm2') || medsDiabetes.length > 0;

  const motivacao = chipsMotivacao(dc);
  const diagnostico = chipsDiagnostico(dc);
  const comorbidades = chipsComorbidades(dc);
  const cirurgias = rotulosCirurgias(dc?.cirurgiasRealizadas as Record<string, unknown> | undefined);
  const tireoide = chipsTireoide(dc);
  const gi = chipsGi(dc);
  const medsAtuais = chipsMedicacoesAtuais(dc);
  const alergias = chipsAlergias(dc);
  const depressao = respostaDepressao(dc);
  const ideacao = respostaIdeacao(dc);

  const riscos = filterRiskQuestionsForSexo(sexo).map((q) => {
    const v = (dc?.riscos as Record<string, string> | undefined)?.[q.key];
    const values = v ? [`${riskOptionLabel(v)}`] : [];
    const curto: Record<string, string> = {
      pancreatitePrevia: 'Pancreatite',
      gastroparesia: 'Gastroparesia',
      historicoCMT_MEN2: 'CMT/MEN2',
      gestacao: 'Gestação',
      lactacao: 'Amamentação',
    };
    return campo(q.key, curto[q.key] || q.label, values, values.length ? 'preenchido' : 'vazio', {
      kind: 'v2',
      id: 'riscos',
      title: 'Riscos e condições que impactam a tirzepatida',
    });
  });

  const sonoVals = chipsSono(pm?.sono);
  const atividadeVals = [
    ...(pm?.atividadeFisica?.rotinaMovimento
      ? [ROTINA[pm.atividadeFisica.rotinaMovimento] || pm.atividadeFisica.rotinaMovimento]
      : []),
    ...flagsChips(pm?.atividadeFisica?.dificuldades, DIFICULDADES),
  ];
  const momento = rotulo(MOMENTO_ALIM, pm?.alimentacao?.momentoMaisDificil);
  const energiaVals = [
    ...(pm?.energia?.nivelEnergiaDiaria
      ? [`Energia: ${ENERGIA_NIVEL[pm.energia.nivelEnergiaDiaria] || pm.energia.nivelEnergiaDiaria}`]
      : []),
    ...flagsChips(pm?.energia?.barreirasRotina, BARREIRAS_ENERGIA),
  ];
  const historicoVals: string[] = [];
  if (pm?.historicoEmagrecimento?.jaTentouEmagrecer) {
    historicoVals.push(`Já tentou: ${SIM_NAO[pm.historicoEmagrecimento.jaTentouEmagrecer] || pm.historicoEmagrecimento.jaTentouEmagrecer}`);
  }
  if (pm?.historicoEmagrecimento?.recuperouPesoDepois) {
    historicoVals.push(
      `Recuperou peso: ${SIM_NAO[pm.historicoEmagrecimento.recuperouPesoDepois] || pm.historicoEmagrecimento.recuperouPesoDepois}`
    );
  }
  const medsPrevVals = chipsMedicamentosPrevios(pm?.medicamentosPrevios);
  const barreirasVals = [
    ...flagsChips(pm?.barreirasAdesao, BARREIRAS_ADESAO),
    ...(pm?.barreirasAdesao?.outroDescricao?.trim() ? [pm.barreirasAdesao.outroDescricao.trim()] : []),
  ];

  let expectativaVals: string[] = [];
  let expectativaCompleta = false;
  if (pm?.expectativa?.expectativaPerdaPeso) {
    expectativaVals = [EXPECTATIVA_PESO[pm.expectativa.expectativaPerdaPeso] || pm.expectativa.expectativaPerdaPeso];
    expectativaCompleta = true;
  } else if (shouldSkipExpectativaPerdaPesoStep(paciente)) {
    const derivada = deriveExpectativaPerdaPesoFromMetas(paciente);
    expectativaVals = [EXPECTATIVA_PESO[derivada] || derivada];
    expectativaCompleta = true;
  }

  const emocionais = EMOCIONAL.map(({ key, label }) => {
    const valor = pm?.alimentacao?.[key];
    const texto = valor ? SIM_NAO[valor] || valor : '';
    return campo(key, label, texto ? [texto] : [], texto ? 'preenchido' : 'vazio', {
      kind: 'v3',
      id: 'alimentacao',
      title: 'Alimentação',
    });
  });

  const blocos: AnamneseBloco[] = [
    {
      id: 'indicacao',
      numero: '1',
      titulo: 'Indicação e contexto',
      campos: [
        campo('motivacao', 'Motivação', motivacao, motivacao.length ? 'preenchido' : 'vazio', {
          kind: 'v2',
          id: 'motivacao',
          title: 'Motivação em relação ao peso',
        }),
        campo('diagnostico', 'Diagnóstico', diagnostico, diagnostico.length ? 'preenchido' : 'vazio', {
          kind: 'v2',
          id: 'diagnostico',
          title: 'Diagnóstico principal',
        }),
        campo('comorbidades', 'Comorbidades', comorbidades, comorbidades.length ? 'preenchido' : 'vazio', {
          kind: 'v2',
          id: 'comorbidades',
          title: 'Comorbidades associadas',
        }),
        campo('cirurgias', 'Cirurgias', cirurgias, cirurgias.length ? 'preenchido' : 'vazio', {
          kind: 'v2',
          id: 'cirurgias',
          title: 'Cirurgias realizadas',
        }),
      ],
    },
    {
      id: 'seguranca',
      numero: '2',
      titulo: 'Segurança do tratamento',
      nenhumFatorRiscoRelatado: nenhumFatorRiscoRelatado(dc, sexo),
      campos: [
        ...riscos,
        campo('tireoide', 'História tireoidiana', tireoide, tireoide.length ? 'preenchido' : 'vazio', {
          kind: 'v2',
          id: 'tireoide',
          title: 'História tireoidiana',
        }),
        campo('sintomasGi', 'Sintomas digestivos', gi, gi.length ? 'preenchido' : 'vazio', {
          kind: 'v2',
          id: 'sintomasGi',
          title: 'Sintomas digestivos',
        }),
      ],
    },
    {
      id: 'medicamentos',
      numero: '3',
      titulo: 'Medicamentos e antecedentes',
      campos: [
        campo('medicacoes', 'Medicações atuais', medsAtuais, medsAtuais.length ? 'preenchido' : 'vazio', {
          kind: 'v2',
          id: 'medicacoes',
          title: 'Medicações em uso atual',
        }),
        campo('alergias', 'Alergias', alergias, alergias.length ? 'preenchido' : 'vazio', {
          kind: 'v2',
          id: 'alergias',
          title: 'Alergias',
        }),
        ...(mostrarDiabetes
          ? [
              campo(
                'medicamentosDiabetes',
                'Medicamentos para o diabetes',
                medsDiabetes,
                medsDiabetes.length ? 'preenchido' : 'vazio',
                { kind: 'v2', id: 'medicamentosDiabetes', title: 'Medicamentos para o diabetes' }
              ),
            ]
          : []),
        campo(
          'medicamentos',
          'Medicamentos prévios para emagrecer',
          medsPrevVals,
          statusDe(medsPrevVals, blocoMedicamentosCompleto(pm)),
          { kind: 'v3', id: 'medicamentos', title: 'Medicamentos prévios' }
        ),
        campo(
          'historico',
          'Histórico de emagrecimento',
          historicoVals,
          statusDe(historicoVals, blocoHistoricoCompleto(pm)),
          { kind: 'v3', id: 'historico', title: 'Histórico de emagrecimento' }
        ),
      ],
    },
    {
      id: 'mental',
      numero: '4',
      titulo: 'Saúde mental e comportamento',
      campos: [
        campo(
          'triagemDepressao',
          'Depressão ou perda de interesse',
          depressao ? [rotuloSimNao(depressao)] : [],
          depressao ? 'preenchido' : 'vazio',
          { kind: 'v2', id: 'triagemDepressao', title: 'Depressão ou perda de interesse' }
        ),
        campo(
          'triagemIdeacao',
          'Pensamentos de tirar a própria vida',
          ideacao ? [rotuloSimNao(ideacao)] : [],
          ideacao ? 'preenchido' : 'vazio',
          { kind: 'v2', id: 'triagemIdeacao', title: 'Pensamentos de tirar a própria vida' }
        ),
        ...emocionais,
      ],
    },
    {
      id: 'estilo',
      numero: '5',
      titulo: 'Estilo de vida',
      campos: [
        campo('sono', 'Sono', sonoVals, statusDe(sonoVals, blocoSonoCompleto(pm)), {
          kind: 'v3',
          id: 'sono',
          title: 'Sono',
        }),
        campo(
          'atividade',
          'Atividade física',
          atividadeVals,
          pm?.atividadeFisica?.rotinaMovimento ? 'preenchido' : 'vazio',
          { kind: 'v3', id: 'atividade', title: 'Atividade física' }
        ),
        campo('alimentacao', 'Alimentação', momento ? [`Momento difícil: ${momento}`] : [], momento ? 'preenchido' : 'vazio', {
          kind: 'v3',
          id: 'alimentacao',
          title: 'Alimentação',
        }),
        campo('energia', 'Energia', energiaVals, statusDe(energiaVals, blocoEnergiaCompleto(pm)), {
          kind: 'v3',
          id: 'energia',
          title: 'Energia',
        }),
        campo('barreiras', 'Barreiras', barreirasVals, statusDe(barreirasVals, blocoBarreirasCompleto(pm)), {
          kind: 'v3',
          id: 'barreiras',
          title: 'Barreiras de adesão',
        }),
        campo(
          'expectativa',
          'Expectativa',
          expectativaVals,
          expectativaCompleta ? 'preenchido' : 'vazio',
          { kind: 'v3', id: 'expectativa', title: 'Expectativa de perda de peso' }
        ),
      ],
    },
  ];

  const campos = blocos.flatMap((bloco) => bloco.campos);
  const pendencias = campos.flatMap((item) => {
    const label = pendenciaLabel(item);
    return label ? [{ id: item.id, label }] : [];
  });

  const indicadores: AnamneseIndicador[] = [];
  if (ideacao === 'sim') {
    indicadores.push({
      id: 'triagemIdeacao',
      rotulo: 'Pensamentos de tirar a própria vida',
      valor: 'Sim',
      atencao: true,
    });
  }
  if (depressao === 'sim') {
    indicadores.push({
      id: 'triagemDepressao',
      rotulo: 'Depressão ou perda de interesse',
      valor: 'Sim',
      atencao: true,
    });
  }
  if (diagnostico[0]) indicadores.push({ id: 'diagnostico', rotulo: 'Diagnóstico', valor: diagnostico[0] });
  if (motivacao[0]) indicadores.push({ id: 'motivacao', rotulo: 'Motivação', valor: motivacao[0] });
  if (tireoide[0]) indicadores.push({ id: 'tireoide', rotulo: 'Tireoide', valor: tireoide[0] });
  const qualidadeSono = rotulo(QUALIDADE_SONO, pm?.sono?.qualidadeSono);
  if (qualidadeSono) indicadores.push({ id: 'sono', rotulo: 'Sono', valor: qualidadeSono });
  if (pm?.atividadeFisica?.rotinaMovimento) {
    indicadores.push({
      id: 'atividade',
      rotulo: 'Atividade',
      valor: ROTINA[pm.atividadeFisica.rotinaMovimento] || pm.atividadeFisica.rotinaMovimento,
    });
  }

  const destaques = indicadores.map((item) =>
    item.atencao ? `${item.rotulo}: ${item.valor}` : item.id === 'sono' ? `Sono ${item.valor.toLowerCase()}` : item.id === 'atividade' ? `Atividade ${item.valor}` : item.valor
  );

  return { destaques: destaques.slice(0, 8), indicadores: indicadores.slice(0, 8), pendencias, blocos };
}
