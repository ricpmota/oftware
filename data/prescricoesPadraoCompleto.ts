/**
 * PRESCRIÇÕES PADRÃO (COMPLETO) — /metaadmin
 *
 * Objetivo:
 * - Centralizar um catálogo amplo de prescrições (templates globais) para o módulo de Prescrições.
 * - Manter o MESMO formato já usado em `prescricoesPadrao.ts`.
 *
 * Como o sistema usa:
 * - `PrescricaoService.criarPrescricoesPadraoGlobais()` deve percorrer `PRESCRICOES_PADRAO` e persistir
 *   como templates (`isTemplate: true`, `medicoId: 'SISTEMA'`) caso não existam.
 *
 * COMO SUBDIVIDIR POR SUBTIPO (SISTEMA) NA UI:
 * - Regra 1 (preferencial): o subtipo está no PREFIXO do `nome`, antes de " — ".
 *   Ex.: "Gastrointestinal — Constipação (PEG)" => subtipo = "Gastrointestinal".
 * - Regra 2 (fallback): se não houver prefixo, inferir por palavras-chave (nome/descrição/observações).
 *
 * Subtipos oficiais (prefixos):
 * - Base do Tratamento
 * - Gastrointestinal
 * - Massa Magra & Performance
 * - Metabólico / Glicêmico
 * - Micronutrientes
 * - Sono & Comportamento
 * - Hepático / Cardiometabólico
 * - Outros
 *
 * Observação importante (clínica):
 * - Estes templates são MODELOS. Ajustar a conduta e posologia ao contexto (comorbidades,
 *   gestação, função renal/hepática, interações, etc.) e às diretrizes locais.
 */

export interface PrescricaoItemPadrao {
  medicamento: string;
  dosagem: string;
  frequencia: string;
  instrucoes: string;
  quantidade?: string;
}

export interface PrescricaoPadraoDef {
  nome: string;
  descricao: string;
  observacoes: string;
  itens: PrescricaoItemPadrao[];
}

/** Peso de referência (kg) para prescrições que dependem do peso (ex: Suplementar). */
export const PESO_REFERENCIA_KG = 70;

/**
 * Dica de implementação (opcional) no service:
 * - Para templates dependentes do peso: recálculo por peso do paciente ao selecionar/imprimir.
 * - Já existe recálculo para Whey (1,6 g/kg/dia) e Creatina (3,5 g/dia).
 */

export const PRESCRICOES_PADRAO: PrescricaoPadraoDef[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // BASE DO TRATAMENTO
  // ───────────────────────────────────────────────────────────────────────────
  {
    nome: 'Base do Tratamento — Tirzepatida (orientações + titulação)'
    ,
    descricao:
      'Orientações gerais para uso de tirzepatida em tratamento de obesidade, incluindo titulação e medidas comportamentais para reduzir efeitos adversos gastrointestinais.',
    observacoes:
      'Modelo. Ajustar dose e escalonamento conforme tolerância, comorbidades e disponibilidade. Orientar sinais de alarme (dor abdominal intensa e persistente, vômitos incoercíveis, sinais de desidratação). Evitar em gestação/lactação. Avaliar histórico de pancreatite e doença biliar.',
    itens: [
      {
        medicamento: 'Tirzepatida (SC)',
        dosagem:
          'Iniciar 2,5 mg 1x/semana por 4 semanas; depois 5 mg 1x/semana por 4 semanas; aumentar em passos de 2,5 mg a cada 4 semanas conforme tolerância',
        frequencia: '1x por semana',
        instrucoes:
          'Aplicar 1x/semana no mesmo dia da semana. Rodiziar locais (abdome/coxa/braço). Se esquecer, aplicar em até 4 dias; se passar disso, pular a dose e retomar na semana seguinte. Manter hidratação adequada, proteína suficiente e fibra para reduzir efeitos GI. Reavaliar em 4 semanas após ajustes de dose.',
        quantidade: '1 caneta/frasco conforme apresentação',
      },
      {
        medicamento: 'Orientações alimentares (coadjuvante)',
        dosagem: 'Proteína 1,2–1,6 g/kg/dia; fibra 25–35 g/dia; água 30–35 ml/kg/dia',
        frequencia: 'Diário',
        instrucoes:
          'Priorizar proteína em todas as refeições; fracionar refeições; reduzir alimentos gordurosos/ultraprocessados; evitar grandes volumes à noite. Se náusea: refeições menores, gengibre/chá, evitar cheiros fortes, manter consumo lento. Se constipação: aumentar fibra gradualmente + água + atividade física.',
        quantidade: 'Plano diário',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // GASTROINTESTINAL
  // ───────────────────────────────────────────────────────────────────────────
  {
    nome: 'Gastrointestinal — Probióticos (manipulado)'
    ,
    descricao: 'Prescrição de probióticos para uso oral. Manipular em cápsulas.',
    observacoes:
      'Manipular em cápsulas. Tomar 1 cápsula ao deitar, por tempo indeterminado ou conforme orientação médica.',
    itens: [
      {
        medicamento: 'Probióticos (manipulado)',
        dosagem:
          'Lactobacillus reuteri 2 bilhões UFC + Lactobacillus gasseri 2 bilhões UFC + Bifidobacterium longum 2 bilhões UFC + Lactobacillus acidophilus 1 bilhão UFC + Inulina 100 mg + FOS 100 mg',
        frequencia: '1x ao dia',
        instrucoes:
          'Tomar 1 cápsula ao deitar. Manter por tempo indeterminado ou conforme orientação médica. Pode ser associado a fibras (psyllium) para trânsito intestinal.',
        quantidade: '30 cápsulas',
      },
    ],
  },
  {
    nome: 'Gastrointestinal — Náusea: Ondansetrona (SOS)'
    ,
    descricao:
      'Antiemético para episódios de náusea/vômitos associados a GLP-1/GIP, com orientação de uso sob demanda.',
    observacoes:
      'Atenção a QT prolongado, interações e contraindicações. Ajustar em hepatopatia. Se vômitos persistentes, investigar desidratação e complicações.',
    itens: [
      {
        medicamento: 'Ondansetrona',
        dosagem: '4 mg',
        frequencia: 'A cada 8 horas se necessário',
        instrucoes:
          'Usar apenas se náusea importante. Preferir via oral (comprimido/ODT). Se necessidade frequente (>48–72h), reavaliar dose do agonista e medidas dietéticas.',
        quantidade: '10 comprimidos',
      },
    ],
  },
  {
    nome: 'Gastrointestinal — Refluxo/Dispepsia: IBP por curto prazo'
    ,
    descricao:
      'Modelo de proteção gástrica quando houver sintomas de refluxo/dispepsia, especialmente na fase de titulação.',
    observacoes:
      'Evitar uso prolongado sem indicação. Avaliar H. pylori e alarmes (disfagia, perda de peso inexplicada, anemia, melena).',
    itens: [
      {
        medicamento: 'Omeprazol (ou equivalente)',
        dosagem: '20 mg',
        frequencia: '1x ao dia',
        instrucoes:
          'Tomar 30 minutos antes do café da manhã por 14–28 dias. Associar medidas comportamentais (elevar cabeceira, evitar refeições volumosas à noite, reduzir gorduras e álcool).',
        quantidade: '14 a 28 cápsulas',
      },
    ],
  },
  {
    nome: 'Gastrointestinal — Constipação: PEG (macrogol)'
    ,
    descricao:
      'Laxativo osmótico de primeira linha para constipação associada a redução de ingestão alimentar e GLP-1/GIP.',
    observacoes:
      'Ajustar dose ao efeito. Garantir hidratação e fibra. Se dor abdominal intensa, distensão importante ou ausência de evacuação prolongada, reavaliar.',
    itens: [
      {
        medicamento: 'Polietilenoglicol (PEG/Macrogol)',
        dosagem: '13–17 g',
        frequencia: '1x ao dia (podendo ajustar)',
        instrucoes:
          'Dissolver em 200–250 ml de água. Ajustar para 1–2 doses/dia conforme resposta. Manter ingestão hídrica adequada.',
        quantidade: '14 sachês',
      },
    ],
  },
  {
    nome: 'Gastrointestinal — Constipação: Psyllium + água'
    ,
    descricao:
      'Fibra solúvel para melhorar trânsito intestinal e saciedade, com ênfase na hidratação.',
    observacoes:
      'Iniciar com dose baixa e aumentar gradualmente para evitar gases. Sempre com água.',
    itens: [
      {
        medicamento: 'Psyllium',
        dosagem: '5–10 g',
        frequencia: '1–2x ao dia',
        instrucoes:
          'Misturar em 200–300 ml de água e ingerir imediatamente. Beber mais um copo de água em seguida. Separar 2 horas de outros medicamentos.',
        quantidade: '300 g',
      },
    ],
  },
  {
    nome: 'Gastrointestinal — Hidratação/eletrólitos (quando baixa ingestão)'
    ,
    descricao:
      'Reposição oral de eletrólitos em cenários de baixa ingestão hídrica, sudorese ou episódios de vômito/diarreia.',
    observacoes:
      'Evitar em restrição hídrica/insuficiência cardíaca sem orientação. Ajustar para diabéticos (preferir sem açúcar).',
    itens: [
      {
        medicamento: 'Solução de reidratação oral (SRO) / eletrólitos',
        dosagem: '200–500 ml',
        frequencia: '1–2x ao dia (conforme necessidade)',
        instrucoes:
          'Usar especialmente nos dias pós-aplicação se houver náusea/baixa ingestão. Preferir formulações sem açúcar quando possível.',
        quantidade: '7 sachês (1 semana)',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // MASSA MAGRA & PERFORMANCE
  // ───────────────────────────────────────────────────────────────────────────
  {
    nome: 'Massa Magra & Performance — Prescrição Suplementar Padrão (Whey + Creatina)'
    ,
    descricao:
      'Prescrição de suplementos para preservar massa muscular durante perda de peso. Whey ajusta por peso; creatina fixa.',
    observacoes:
      'Whey: 1,6 g/kg/dia dividido em 3 tomadas (recalcular ao selecionar/imprimir). Creatina: 3,5 g/dia. Ajustar se nefropatia/risco renal. Incentivar treino resistido.',
    itens: [
      {
        medicamento: 'Whey Protein',
        dosagem: '112g por dia (1,6g por kg de peso corporal)',
        frequencia: '3x ao dia',
        instrucoes:
          'Tomar aproximadamente 37.3g 3 vezes ao dia (total 112g/dia). Preferencialmente após refeições ou após exercícios. Recalcular conforme peso do paciente (1,6 g/kg/dia).',
        quantidade: '112g/dia',
      },
      {
        medicamento: 'Creatina MAX',
        dosagem: '3,5g por dia',
        frequencia: '1x ao dia',
        instrucoes:
          'Tomar 3,5g/dia em 200ml de água, preferencialmente pós-treino ou com refeição. Manter hidratação adequada.',
        quantidade: '3,5g/dia',
      },
    ],
  },
  {
    nome: 'Massa Magra & Performance — Hidroximetilbutirato (HMB)'
    ,
    descricao:
      'HMB para auxiliar na preservação de massa muscular durante perda de peso e/ou baixa ingestão proteica.',
    observacoes:
      'Tomar preferencialmente com as refeições. Suplementação por tempo indeterminado ou conforme orientação médica.',
    itens: [
      {
        medicamento: 'Hidroximetilbutirato (HMB)',
        dosagem: '3g por dia',
        frequencia: '1,5g 2x ao dia ou 1g 3x ao dia',
        instrucoes:
          'Tomar 1,5g 2x/dia ou 1g 3x/dia com refeições. Útil em períodos de restrição calórica, baixa ingestão proteica ou idosos.',
        quantidade: '30 sachês (3g) ou cápsulas equivalentes',
      },
    ],
  },
  {
    nome: 'Massa Magra & Performance — Proteína (alvo diário)'
    ,
    descricao:
      'Modelo de prescrição de alvo proteico (dietético) para evitar sarcopenia durante perda de peso.',
    observacoes:
      'Ajustar meta conforme idade, comorbidades renais, nível de atividade e tolerância. Preferir distribuição ao longo do dia.',
    itens: [
      {
        medicamento: 'Plano proteico (dieta)',
        dosagem: '1,2–1,6 g/kg/dia (pode chegar a 2,0 g/kg/dia em atletas)',
        frequencia: 'Diário',
        instrucoes:
          'Distribuir proteína em 3–5 refeições. Incluir fonte proteica em todas as refeições. Se usar suplementação, adequar ao total diário.',
        quantidade: 'Meta diária',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // METABÓLICO / GLICÊMICO
  // ───────────────────────────────────────────────────────────────────────────
  {
    nome: 'Metabólico / Glicêmico — Berberina'
    ,
    descricao:
      'Suplemento com potencial benefício em sensibilidade à insulina e glicemia, como adjuvante (não substitui terapia antidiabética quando indicada).',
    observacoes:
      'Atenção a interações (CYP/P-gp) e efeitos GI. Evitar em gestação/lactação. Ajustar em hepatopatia. Monitorar glicemia se em uso de hipoglicemiantes.',
    itens: [
      {
        medicamento: 'Berberina',
        dosagem: '500 mg',
        frequencia: '2–3x ao dia',
        instrucoes:
          'Tomar junto às principais refeições. Iniciar com 1x/dia por 3–7 dias se sensível a efeitos GI, depois titular.',
        quantidade: '60 a 90 cápsulas',
      },
    ],
  },
  {
    nome: 'Metabólico / Glicêmico — Picolinato de Cromo'
    ,
    descricao:
      'Suplemento adjuvante para craving e controle glicêmico em alguns pacientes.',
    observacoes:
      'Evidência variável. Ajustar ao contexto e evitar falsas expectativas. Monitorar glicemia/insulina se necessário.',
    itens: [
      {
        medicamento: 'Picolinato de Cromo',
        dosagem: '200–400 mcg',
        frequencia: '1x ao dia',
        instrucoes:
          'Tomar com a principal refeição. Reavaliar benefício em 8–12 semanas.',
        quantidade: '30 cápsulas',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // MICRONUTRIENTES
  // ───────────────────────────────────────────────────────────────────────────
  {
    nome: 'Micronutrientes — Vitamina D3'
    ,
    descricao:
      'Suplementação de vitamina D3 (colecalciferol). Ajustar dose conforme 25-OH vitamina D e risco.',
    observacoes:
      'Tomar com refeição gordurosa. Monitorar 25-OH vitamina D e cálcio conforme orientação. Evitar megadoses sem controle.',
    itens: [
      {
        medicamento: 'Vitamina D3 (colecalciferol)',
        dosagem: '2000–4000 UI por dia (ajustar conforme dosagem sérica)',
        frequencia: '1x ao dia',
        instrucoes:
          'Tomar 1x/dia com a refeição mais gordurosa. Ajustar conforme metas e controle laboratorial.',
        quantidade: '30 cápsulas',
      },
    ],
  },
  {
    nome: 'Micronutrientes — Multivitamínico (adulto)'
    ,
    descricao:
      'Multivitamínico diário como suporte em pacientes com restrição calórica e baixa ingestão alimentar.',
    observacoes:
      'Preferir formulações completas. Ajustar se gestação, nefropatia, hepatopatia ou uso de anticoagulantes (vitamina K).',
    itens: [
      {
        medicamento: 'Multivitamínico',
        dosagem: '1 comprimido',
        frequencia: '1x ao dia',
        instrucoes:
          'Tomar com refeição. Se gastrite, usar após almoço. Não substitui alimentação.',
        quantidade: '30 comprimidos',
      },
    ],
  },
  {
    nome: 'Micronutrientes — Vitamina B12 (manutenção)'
    ,
    descricao:
      'Suplementação de B12 em pacientes com risco de baixa ingestão proteica, dietas restritivas ou uso prévio de metformina/IBP.',
    observacoes:
      'Ajustar dose conforme B12 sérica e sintomas. Considerar via sublingual ou IM conforme necessidade.',
    itens: [
      {
        medicamento: 'Metilcobalamina (Vitamina B12)',
        dosagem: '1000 mcg',
        frequencia: '1x ao dia ou 2–3x por semana',
        instrucoes:
          'Sublingual se disponível. Ajustar frequência conforme exames e sintomas.',
        quantidade: '30 comprimidos',
      },
    ],
  },
  {
    nome: 'Micronutrientes — Magnésio (bisglicinato)'
    ,
    descricao:
      'Magnésio para suporte de sono, câimbras e/ou constipação leve, dependendo da formulação.',
    observacoes:
      'Evitar em insuficiência renal avançada sem orientação. Pode causar diarreia (citrato).',
    itens: [
      {
        medicamento: 'Magnésio bisglicinato',
        dosagem: '200–400 mg (elementar)',
        frequencia: '1x à noite',
        instrucoes:
          'Tomar 1x/noite. Se objetivo for constipação, considerar citrato e ajustar ao efeito.',
        quantidade: '30 cápsulas',
      },
    ],
  },
  {
    nome: 'Micronutrientes — Noripurum (ferro): via oral ou EV'
    ,
    descricao:
      'Reposição de ferro (Noripurum®) para manutenção/anemia leve via oral ou anemia moderada/grave/má absorção via endovenosa.',
    observacoes:
      'VO: tomar após refeições; pode escurecer fezes; evitar no mesmo horário leite, café, cálcio ou antiácidos; reavaliar Hb + ferritina após ~8 semanas. EV: administrar em ambiente com suporte a reações alérgicas; monitorar PA e sintomas durante infusão; não misturar com outras medicações; reavaliar hemograma + ferritina 2–4 semanas após completar esquema.',
    itens: [
      {
        medicamento: 'Noripurum® comprimido mastigável 100 mg',
        dosagem: '100 mg (ferro elementar)',
        frequencia: '1–2x ao dia',
        instrucoes:
          'Tomar 1 comprimido VO 1–2x ao dia, após refeições. Duração: 8 a 12 semanas (ou até normalização da ferritina/hemoglobina).',
        quantidade: 'VO — manutenção/anemia leve',
      },
      {
        medicamento: 'Noripurum® solução oral (50 mg/mL)',
        dosagem: '2 mL = 100 mg de ferro elementar',
        frequencia: '1–2x ao dia',
        instrucoes:
          'Tomar 2 mL VO 1–2x ao dia, após refeições. Duração: 8 a 12 semanas (ou até normalização da ferritina/hemoglobina).',
        quantidade: 'VO — alternativa à forma sólida',
      },
      {
        medicamento: 'Noripurum® EV (hidróxido de ferro polimaltosado)',
        dosagem: '100 a 200 mg por aplicação',
        frequencia: '1–3x por semana (conforme déficit)',
        instrucoes:
          '200 mg EV diluídos em 100 mL de SF 0,9%, correr em 30–60 minutos. Repetir 1–2x por semana. Total habitual: 600–1000 mg, conforme peso e Hb inicial. Indicado em anemia moderada/grave, má absorção ou intolerância à via oral.',
        quantidade: 'EV — anemia moderada/grave ou intolerância VO',
      },
    ],
  },
  {
    nome: 'Micronutrientes — Coenzima q10 + NADH'
    ,
    descricao:
      'Suplementação voltada para melhora da função mitocondrial, produção de energia celular e suporte metabólico em pacientes com fadiga, resistência insulínica ou baixa resposta ao tratamento.',
    observacoes:
      'Coenzima Q10 auxilia na produção de energia celular e pode melhorar fadiga e desempenho metabólico.\n' +
      'NADH pode ser utilizado como suporte adicional em casos de baixa energia ou desempenho reduzido.\n' +
      'Período de tratamento: 8 semanas',
    itens: [
      {
        medicamento: 'Coenzima Q10 (Ubiquinona ou Ubiquinol)',
        dosagem: '200mg',
        frequencia: '1x ao dia',
        instrucoes: 'Preferencialmente junto a refeição com gordura.',
        quantidade: '120',
      },
      {
        medicamento: 'NADH (Nicotinamida Adenina Dinucleotídeo reduzido)',
        dosagem: '10mg',
        frequencia: '1x ao dia',
        instrucoes: 'Preferencialmente pela manhã.',
        quantidade: '120',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // SONO & COMPORTAMENTO
  // ───────────────────────────────────────────────────────────────────────────
  {
    nome: 'Sono & Comportamento — Higiene do sono (plano)'
    ,
    descricao:
      'Plano estruturado de higiene do sono para reduzir insônia e compulsão noturna.',
    observacoes:
      'Modelo. Ajustar caso haja depressão/ansiedade moderada-grave, apneia do sono ou uso de sedativos. Considerar avaliação de apneia.',
    itens: [
      {
        medicamento: 'Higiene do sono (rotina)',
        dosagem: 'Checklist diário',
        frequencia: 'Diário',
        instrucoes:
          'Evitar telas 60–90 min antes de dormir; ambiente escuro e fresco; horário regular; cafeína até 14–16h; luz solar pela manhã; jantar leve; atividade física regular.',
        quantidade: 'Plano diário',
      },
    ],
  },
  {
    nome: 'Sono & Comportamento — Melatonina (curto prazo)'
    ,
    descricao:
      'Melatonina como adjuvante para ajuste de início do sono, especialmente em fase de mudança comportamental.',
    observacoes:
      'Ajustar dose ao efeito. Evitar em gestação/lactação sem orientação. Considerar cronoterapia e higiene do sono.',
    itens: [
      {
        medicamento: 'Melatonina',
        dosagem: '0,5–3 mg',
        frequencia: '1x à noite',
        instrucoes:
          'Tomar 30–60 min antes de dormir. Iniciar com menor dose e ajustar conforme resposta.',
        quantidade: '30 comprimidos',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // HEPÁTICO / CARDIOMETABÓLICO
  // ───────────────────────────────────────────────────────────────────────────
  {
    nome: 'Hepático / Cardiometabólico — Ômega-3 (EPA+DHA)'
    ,
    descricao:
      'Ômega-3 como adjuvante em hipertrigliceridemia leve/moderada e inflamação metabólica.',
    observacoes:
      'Ajustar dose conforme triglicerídeos e tolerância. Atenção em uso de anticoagulantes/antiagregantes.',
    itens: [
      {
        medicamento: 'Ômega-3 (EPA + DHA)',
        dosagem: '1–2 g/dia (EPA+DHA)',
        frequencia: '1–2x ao dia',
        instrucoes:
          'Tomar com refeições para reduzir refluxo. Preferir formulações com certificação de pureza.',
        quantidade: '60 cápsulas',
      },
    ],
  },
  {
    nome: 'Hepático / Cardiometabólico — Silimarina (adjuvante)'
    ,
    descricao:
      'Modelo de adjuvante para suporte hepático em esteatose, junto a dieta, perda de peso e atividade física.',
    observacoes:
      'Evidência variável. Não substitui tratamento da causa (perda de peso, resistência insulínica). Monitorar TGO/TGP/GGT conforme plano.',
    itens: [
      {
        medicamento: 'Silimarina',
        dosagem: '140–300 mg',
        frequencia: '2x ao dia',
        instrucoes:
          'Tomar com refeições. Reavaliar em 8–12 semanas junto com exames e evolução clínica.',
        quantidade: '60 cápsulas',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // OUTROS
  // ───────────────────────────────────────────────────────────────────────────
  {
    nome: 'Outros — Educação alimentar (plano de bolso)'
    ,
    descricao:
      'Resumo prático de condutas alimentares para pacientes em uso de tirzepatida/GLP-1/GIP.',
    observacoes:
      'Personalizar conforme cultura, preferências e restrições. Ideal integrar com nutrição.',
    itens: [
      {
        medicamento: 'Plano alimentar resumido',
        dosagem: 'Regras práticas',
        frequencia: 'Diário',
        instrucoes:
          '1) Prato: metade legumes/verduras, 1/4 proteína, 1/4 carboidrato; 2) Proteína sempre primeiro; 3) Evitar líquidos junto às refeições se empachamento; 4) 8–10 mil passos/dia se possível; 5) Treino resistido 2–4x/sem.',
        quantidade: 'Plano diário',
      },
    ],
  },
];
