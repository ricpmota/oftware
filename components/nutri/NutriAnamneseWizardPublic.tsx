'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronLeft, Loader2, User, UtensilsCrossed } from 'lucide-react';
import {
  INTENSIDADE_DESEJADA_PADRAO,
  type AnamneseWizardInput,
} from '@/lib/nutri/anamneseNutricional';
import { CheckInSemanalNutriProgress } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriProgress';
import PublicPageBrandFooter from '@/components/public/PublicPageBrandFooter';

export function emptyAnamneseWizard(): AnamneseWizardInput {
  return {
    objetivoPrincipal: 'perda_peso',
    intensidadeDesejada: INTENSIDADE_DESEJADA_PADRAO,
    horarioTrabalho: 'diurno',
    horasSentado: '4-8h',
    dietaUltimos12Meses: 'nao',
    tipoDieta: '',
    efeitoSanfona: 'nao',
    fomeMatinal: 5,
    fomeNoturna: 5,
    vontadeDoce: 5,
    pulaCafeManha: false,
    chegaComMuitaFomeJantar: false,
    atividadeFisica: 'nunca',
    sonoHoras: '6-8h',
    horarioDormir: '22-00',
    acordaDescansado: 'as_vezes',
    numeroRefeicoesDia: '4-5',
    comportamentosAlimentares: [],
    fomeEmocional: false,
    compulsaoNoturna: false,
    dosesAlcoolSemana: '0',
    finalSemanaSaiDieta: 'quase_nunca',
    restricoes: [],
    preferenciasProteina: [],
    sintomasGI: 'nenhum',
  };
}

function primeiroNome(nome: string | undefined) {
  if (!nome) return '';
  return nome.trim().split(/\s+/).filter(Boolean)[0] || '';
}

const choiceClass = (selected: boolean) =>
  `w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base transition-all ${
    selected
      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
  }`;

type ChoiceOption = { value: string; label: string; desc?: string };

type StepDef =
  | { id: 'intro' }
  | {
      id: string;
      kind: 'single';
      title: string;
      helper?: string;
      field: keyof AnamneseWizardInput;
      options: ChoiceOption[];
    }
  | {
      id: string;
      kind: 'scale';
      title: string;
      helper?: string;
      field: 'fomeMatinal' | 'fomeNoturna' | 'vontadeDoce';
    }
  | {
      id: string;
      kind: 'yesno';
      title: string;
      field: 'pulaCafeManha' | 'chegaComMuitaFomeJantar' | 'fomeEmocional' | 'compulsaoNoturna';
    }
  | {
      id: string;
      kind: 'multi';
      title: string;
      helper?: string;
      field: 'restricoes' | 'preferenciasProteina' | 'comportamentosAlimentares';
      options: ChoiceOption[];
      exclusiveValue?: string;
    }
  | {
      id: string;
      kind: 'text';
      title: string;
      helper?: string;
      field: 'tipoDieta';
      placeholder?: string;
      showWhen: (data: AnamneseWizardInput) => boolean;
    };

const STEPS: StepDef[] = [
  { id: 'intro' },
  {
    id: 'objetivo',
    kind: 'single',
    title: 'Qual é o seu principal objetivo?',
    field: 'objetivoPrincipal',
    options: [
      { value: 'perda_peso', label: 'Perda de peso', desc: 'Redução de peso e gordura corporal' },
      { value: 'recomposicao', label: 'Recomposição corporal', desc: 'Ganho de massa magra e perda de gordura' },
      { value: 'controle_glicemia', label: 'Controle glicêmico', desc: 'Melhorar os níveis de açúcar no sangue' },
      { value: 'melhora_disposicao', label: 'Melhora de disposição', desc: 'Aumentar energia e bem-estar' },
      { value: 'manutencao', label: 'Manutenção', desc: 'Manter peso e hábitos saudáveis' },
    ],
  },
  {
    id: 'intensidade',
    kind: 'single',
    title: 'Qual intensidade de mudança você consegue manter agora?',
    field: 'intensidadeDesejada',
    options: [
      { value: 'leve', label: 'Leve', desc: 'Mudanças graduais, com mais flexibilidade.' },
      { value: 'moderada', label: 'Moderada', desc: 'Equilíbrio entre resultado e adesão.' },
      { value: 'intensiva', label: 'Intensiva', desc: 'Mudanças mais rigorosas e organizadas.' },
    ],
  },
  {
    id: 'horario',
    kind: 'single',
    title: 'Qual é o seu horário de trabalho?',
    field: 'horarioTrabalho',
    options: [
      { value: 'diurno', label: 'Diurno' },
      { value: 'noturno', label: 'Noturno' },
      { value: 'turnos', label: 'Turnos rotativos' },
    ],
  },
  {
    id: 'sentado',
    kind: 'single',
    title: 'Quantas horas você passa sentado por dia?',
    field: 'horasSentado',
    options: [
      { value: '<4h', label: 'Menos de 4 horas' },
      { value: '4-8h', label: 'Entre 4 e 8 horas' },
      { value: '>8h', label: 'Mais de 8 horas' },
    ],
  },
  {
    id: 'dieta12',
    kind: 'single',
    title: 'Você fez dieta nos últimos 12 meses?',
    field: 'dietaUltimos12Meses',
    options: [
      { value: 'sim', label: 'Sim' },
      { value: 'nao', label: 'Não' },
    ],
  },
  {
    id: 'tipoDieta',
    kind: 'text',
    title: 'Qual tipo de dieta você fez?',
    helper: 'Pode ser o nome do método ou um resumo, como low carb, jejum ou reeducação.',
    field: 'tipoDieta',
    placeholder: 'Ex.: low carb, jejum intermitente…',
    showWhen: (data) => data.dietaUltimos12Meses === 'sim',
  },
  {
    id: 'sanfona',
    kind: 'single',
    title: 'Você já teve efeito sanfona?',
    field: 'efeitoSanfona',
    options: [
      { value: 'sim', label: 'Sim' },
      { value: 'nao', label: 'Não' },
    ],
  },
  {
    id: 'fomeMatinal',
    kind: 'scale',
    title: 'Como está sua fome de manhã?',
    helper: '0 = nenhuma fome · 10 = fome muito forte',
    field: 'fomeMatinal',
  },
  {
    id: 'fomeNoturna',
    kind: 'scale',
    title: 'Como está sua fome à noite?',
    helper: '0 = nenhuma fome · 10 = fome muito forte',
    field: 'fomeNoturna',
  },
  {
    id: 'vontadeDoce',
    kind: 'scale',
    title: 'Quanta vontade de doce você sente?',
    helper: '0 = nenhuma · 10 = vontade constante',
    field: 'vontadeDoce',
  },
  {
    id: 'pulaCafe',
    kind: 'yesno',
    title: 'Você costuma pular o café da manhã?',
    field: 'pulaCafeManha',
  },
  {
    id: 'fomeJantar',
    kind: 'yesno',
    title: 'Você chega com muita fome no jantar?',
    field: 'chegaComMuitaFomeJantar',
  },
  {
    id: 'atividade',
    kind: 'single',
    title: 'Com que frequência você pratica atividade física?',
    field: 'atividadeFisica',
    options: [
      { value: 'nunca', label: 'Nunca', desc: 'Não pratico atividade física regular' },
      { value: '1-2x', label: '1–2 vezes por semana', desc: 'Atividade leve a moderada' },
      { value: '3-4x', label: '3–4 vezes por semana', desc: 'Atividade regular' },
      { value: '5-7x', label: '5–7 vezes por semana', desc: 'Atividade intensa e frequente' },
    ],
  },
  {
    id: 'horarioDormir',
    kind: 'single',
    title: 'Em que horário você costuma dormir?',
    field: 'horarioDormir',
    options: [
      { value: '22-00', label: 'Entre 22h e 00h' },
      { value: '00-02', label: 'Entre 00h e 02h' },
      { value: 'depois_02h', label: 'Depois das 02h' },
    ],
  },
  {
    id: 'sonoHoras',
    kind: 'single',
    title: 'Quantas horas você costuma dormir?',
    field: 'sonoHoras',
    options: [
      { value: '<6h', label: 'Menos de 6 horas' },
      { value: '6-8h', label: 'Entre 6 e 8 horas' },
      { value: '>8h', label: 'Mais de 8 horas' },
    ],
  },
  {
    id: 'acorda',
    kind: 'single',
    title: 'Você acorda descansado?',
    field: 'acordaDescansado',
    options: [
      { value: 'sim', label: 'Sim' },
      { value: 'nao', label: 'Não' },
      { value: 'as_vezes', label: 'Às vezes' },
    ],
  },
  {
    id: 'refeicoes',
    kind: 'single',
    title: 'Quantas refeições você faz por dia?',
    field: 'numeroRefeicoesDia',
    options: [
      { value: '2-3', label: '2 a 3 refeições' },
      { value: '4-5', label: '4 a 5 refeições' },
      { value: '>5', label: 'Mais de 5 refeições' },
    ],
  },
  {
    id: 'comportamentos',
    kind: 'multi',
    title: 'Quais comportamentos se aplicam a você?',
    helper: 'Pode marcar mais de um, ou nenhum.',
    field: 'comportamentosAlimentares',
    options: [
      { value: 'pulo refeições', label: 'Pulo refeições' },
      { value: 'como rápido', label: 'Como rápido' },
      { value: 'belisco o dia todo', label: 'Belisco o dia todo' },
      { value: 'álcool frequente', label: 'Álcool frequente' },
    ],
  },
  {
    id: 'fomeEmocional',
    kind: 'yesno',
    title: 'Você sente fome emocional?',
    field: 'fomeEmocional',
  },
  {
    id: 'compulsao',
    kind: 'yesno',
    title: 'Você tem compulsão noturna?',
    field: 'compulsaoNoturna',
  },
  {
    id: 'alcool',
    kind: 'single',
    title: 'Quantas doses de álcool você toma por semana?',
    field: 'dosesAlcoolSemana',
    options: [
      { value: '0', label: 'Nenhuma' },
      { value: '1-3', label: '1 a 3 doses' },
      { value: '4-7', label: '4 a 7 doses' },
      { value: '>7', label: 'Mais de 7 doses' },
    ],
  },
  {
    id: 'fds',
    kind: 'single',
    title: 'Você sai da dieta no fim de semana?',
    field: 'finalSemanaSaiDieta',
    options: [
      { value: 'quase_nunca', label: 'Quase nunca' },
      { value: 'as_vezes', label: 'Às vezes' },
      { value: 'sempre', label: 'Sempre' },
    ],
  },
  {
    id: 'restricoes',
    kind: 'multi',
    title: 'Você tem alguma restrição alimentar?',
    helper: 'Pode marcar mais de uma.',
    field: 'restricoes',
    exclusiveValue: 'nada',
    options: [
      { value: 'vegetariano', label: 'Vegetariano' },
      { value: 'vegano', label: 'Vegano' },
      { value: 'intolerância lactose', label: 'Intolerância à lactose' },
      { value: 'sem glúten', label: 'Sem glúten' },
      { value: 'nada', label: 'Nenhuma restrição' },
    ],
  },
  {
    id: 'proteinas',
    kind: 'multi',
    title: 'Quais proteínas você prefere?',
    helper: 'Pode marcar mais de uma.',
    field: 'preferenciasProteina',
    options: [
      { value: 'frango', label: 'Frango' },
      { value: 'peixe', label: 'Peixe' },
      { value: 'ovos', label: 'Ovos' },
      { value: 'carne bovina', label: 'Carne bovina' },
      { value: 'whey', label: 'Whey' },
    ],
  },
  {
    id: 'gi',
    kind: 'single',
    title: 'Como estão seus sintomas gastrointestinais?',
    field: 'sintomasGI',
    options: [
      { value: 'nenhum', label: 'Nenhum' },
      { value: 'leve', label: 'Leve' },
      { value: 'moderado', label: 'Moderado' },
      { value: 'grave', label: 'Grave' },
    ],
  },
];

const INTRO_STEP = 0;

type Props = {
  onComplete: (data: AnamneseWizardInput) => Promise<void>;
  submitting?: boolean;
  patientName?: string;
  nutritionistName?: string;
  error?: string;
};

export default function NutriAnamneseWizardPublic({
  onComplete,
  submitting = false,
  patientName,
  nutritionistName,
  error,
}: Props) {
  const [step, setStep] = useState(INTRO_STEP);
  const [data, setData] = useState<AnamneseWizardInput>(emptyAnamneseWizard);

  const visibleSteps = useMemo(
    () =>
      STEPS.filter((item) => {
        if (item.id === 'intro') return true;
        if (item.kind === 'text') return item.showWhen(data);
        return true;
      }),
    [data]
  );

  const total = visibleSteps.length;
  const current = visibleSteps[step] ?? visibleSteps[0];
  const isIntro = current?.id === 'intro';
  const isLastStep = step === total - 1;
  const progress = ((step + 1) / total) * 100;
  const stepLabel = `${step + 1} de ${total}`;
  const greeting = primeiroNome(patientName);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const toggleMulti = (
    field: 'restricoes' | 'preferenciasProteina' | 'comportamentosAlimentares',
    value: string,
    exclusiveValue?: string
  ) => {
    setData((prev) => {
      const currentValues = prev[field];
      let next: string[];
      if (exclusiveValue && value === exclusiveValue) {
        next = currentValues.includes(value) ? [] : [value];
      } else if (exclusiveValue) {
        next = currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues.filter((item) => item !== exclusiveValue), value];
      } else {
        next = currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value];
      }
      return { ...prev, [field]: next };
    });
  };

  const goBack = () => {
    if (step > INTRO_STEP) setStep(step - 1);
  };

  const goNext = async () => {
    if (step < total - 1) {
      setStep(step + 1);
      return;
    }
    await onComplete(data);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col">
      <CheckInSemanalNutriProgress
        progress={progress}
        stepLabel={stepLabel}
        groupLabel="Anamnese nutricional"
      />

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id || step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto"
          >
            {isIntro ? (
              <>
                {greeting ? (
                  <p className="text-base font-semibold text-emerald-800 mb-1">Olá, {greeting}!</p>
                ) : (
                  <p className="text-base font-semibold text-emerald-800 mb-1">Olá!</p>
                )}
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
                  Anamnese nutricional
                </h1>
                <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                  Vamos conhecer seus hábitos e objetivos para montar seu acompanhamento. Leva
                  poucos minutos — uma pergunta de cada vez.
                </p>
                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-4">
                  {nutritionistName ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] text-white shadow-sm">
                        <UtensilsCrossed className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          Nutricionista
                        </p>
                        <p className="text-sm font-semibold text-slate-900">{nutritionistName}</p>
                      </div>
                    </div>
                  ) : null}
                  {patientName ? (
                    <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                          Paciente
                        </p>
                        <p className="text-sm font-semibold text-slate-900">{patientName}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-sky-700 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-500">Próximo passo</p>
                      <p className="text-sm font-semibold text-slate-900">
                        Depois você escolhe o horário da consulta
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : current && current.kind === 'single' ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-4 leading-snug">
                  {current.title}
                </label>
                <div className="space-y-2.5">
                  {current.options.map((option) => {
                    const selected = String(data[current.field] ?? '') === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setData({ ...data, [current.field]: option.value })}
                        className={choiceClass(selected)}
                      >
                        <span className="font-medium">{option.label}</span>
                        {option.desc ? (
                          <span className="block text-sm mt-1 opacity-80">{option.desc}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : current && current.kind === 'yesno' ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-4 leading-snug">
                  {current.title}
                </label>
                <div className="space-y-2.5">
                  {[
                    { value: true, label: 'Sim' },
                    { value: false, label: 'Não' },
                  ].map((option) => (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() => setData({ ...data, [current.field]: option.value })}
                      className={choiceClass(data[current.field] === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            ) : current && current.kind === 'scale' ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-1 leading-snug">
                  {current.title}
                </label>
                {current.helper ? <p className="text-sm text-slate-500 mb-4">{current.helper}</p> : null}
                <p className="text-3xl font-bold tabular-nums text-emerald-700 mb-4">{data[current.field]}</p>
                <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
                  {Array.from({ length: 11 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setData({ ...data, [current.field]: n })}
                      className={`min-h-[48px] rounded-xl border px-2 py-2.5 text-center text-sm font-semibold transition-all ${
                        data[current.field] === n
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </>
            ) : current && current.kind === 'multi' ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-1 leading-snug">
                  {current.title}
                </label>
                {current.helper ? <p className="text-sm text-slate-500 mb-4">{current.helper}</p> : null}
                <div className="space-y-2.5">
                  {current.options.map((option) => {
                    const selected = data[current.field].includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleMulti(current.field, option.value, current.exclusiveValue)}
                        className={choiceClass(selected)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : current && current.kind === 'text' ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-1 leading-snug">
                  {current.title}
                </label>
                {current.helper ? <p className="text-sm text-slate-500 mb-4">{current.helper}</p> : null}
                <input
                  type="text"
                  value={data.tipoDieta || ''}
                  onChange={(e) => setData({ ...data, tipoDieta: e.target.value })}
                  placeholder={current.placeholder}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                />
              </>
            ) : null}

            {error ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-0 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] mt-auto bg-gradient-to-t from-white via-white to-transparent">
          <div className="flex gap-3">
            {step > INTRO_STEP ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Salvando...
                </>
              ) : isIntro ? (
                'Começar anamnese'
              ) : isLastStep ? (
                'Salvar e escolher horário'
              ) : (
                'Continuar'
              )}
            </button>
          </div>
        </div>
      </div>

      <PublicPageBrandFooter theme={null} className="px-4 pb-6" />
    </div>
  );
}
