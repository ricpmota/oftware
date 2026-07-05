'use client';

import { Send } from 'lucide-react';
import type { PacienteCompleto, PerfilMetabolicoV3 } from '@/types/obesidade';
import { FieldLabel } from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import {
  blocoAlimentacaoCompleto,
  blocoAtividadeCompleto,
  blocoBarreirasCompleto,
  blocoEnergiaCompleto,
  blocoHistoricoCompleto,
  blocoMedicamentosCompleto,
  blocoSonoCompleto,
  mergePerfilMetabolicoV3,
  STEP_PERFIL_METABOLICO_ALIMENTACAO,
  STEP_PERFIL_METABOLICO_ATIVIDADE,
  STEP_PERFIL_METABOLICO_BARREIRAS,
  STEP_PERFIL_METABOLICO_ENERGIA,
  STEP_PERFIL_METABOLICO_EXPECTATIVA,
  STEP_PERFIL_METABOLICO_HISTORICO,
  STEP_PERFIL_METABOLICO_MEDICAMENTOS,
  STEP_PERFIL_METABOLICO_SONO,
} from '@/lib/meta/perfilMetabolicoV3Chat';

type Props = {
  step: number;
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
  onSubmit?: (replyLabel: string, pacienteAtualizado: PacienteCompleto) => void;
  wizardMode?: boolean;
};

function chatBtnClass(active: boolean) {
  return `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    active
      ? 'bg-[#4CCB7A] text-[#0A1F44] font-semibold'
      : 'border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15'
  }`;
}

function wizardBtnClass(active: boolean) {
  return `px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
    active
      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
  }`;
}

function optionBtnClass(wizardMode: boolean, active: boolean) {
  return wizardMode ? wizardBtnClass(active) : chatBtnClass(active);
}

function subLabelClass(wizardMode: boolean) {
  return wizardMode ? 'text-sm font-medium text-slate-800' : 'text-sm font-medium text-[#E8EDED]';
}

function hintClass(wizardMode: boolean) {
  return wizardMode ? 'text-xs text-slate-500' : 'text-xs text-[#E8EDED]/60';
}

function EnviarRow({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm hover:bg-[#45b86d] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Send size={14} /> Enviar
    </button>
  );
}

function SubLabel({ wizardMode, children }: { wizardMode: boolean; children: React.ReactNode }) {
  if (wizardMode) return <FieldLabel>{children}</FieldLabel>;
  return <p className={subLabelClass(wizardMode)}>{children}</p>;
}

export default function PerfilMetabolicoV3ChatUI({
  step,
  paciente,
  setPaciente,
  onSubmit,
  wizardMode = false,
}: Props) {
  const pm = paciente.dadosClinicos?.perfilMetabolicoV3;

  if (step === STEP_PERFIL_METABOLICO_SONO) {
    const s = pm?.sono || {};
    const setSono = (patch: Partial<NonNullable<typeof pm>['sono']>) =>
      setPaciente((p) =>
        mergePerfilMetabolicoV3(p, { sono: { ...(p.dadosClinicos?.perfilMetabolicoV3?.sono || {}), ...patch } })
      );
    const labels: string[] = [];
    const qualLabels: Record<string, string> = {
      muito_bom: 'Muito bom',
      bom: 'Bom',
      regular: 'Regular',
      ruim: 'Ruim',
      muito_ruim: 'Muito ruim',
    };
    const horasLabels: Record<string, string> = {
      menos_5: 'Menos de 5h',
      '5_6': '5–6h',
      '7_8': '7–8h',
      mais_8: 'Mais de 8h',
    };
    if (s.qualidadeSono) labels.push(qualLabels[s.qualidadeSono] || s.qualidadeSono);
    if (s.horasSonoMedias) labels.push(horasLabels[s.horasSonoMedias] || s.horasSonoMedias);

    const simNao = (field: 'ronca' | 'acordaCansado', pergunta: string) => (
      <div className={wizardMode ? 'space-y-2.5' : 'rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3 space-y-2.5'}>
        <SubLabel wizardMode={wizardMode}>{pergunta}</SubLabel>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['sim', 'Sim'],
              ['nao', 'Não'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={`${field}-${v}`}
              type="button"
              className={optionBtnClass(wizardMode, s[field] === v)}
              onClick={() => setSono({ [field]: v } as Partial<NonNullable<typeof pm>['sono']>)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    );

    return (
      <div className="space-y-5 max-w-md">
        <div className="space-y-2.5">
          <SubLabel wizardMode={wizardMode}>Como você avalia seu sono?</SubLabel>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['muito_bom', 'Muito bom'],
                ['bom', 'Bom'],
                ['regular', 'Regular'],
                ['ruim', 'Ruim'],
                ['muito_ruim', 'Muito ruim'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={optionBtnClass(wizardMode, s.qualidadeSono === v)}
                onClick={() => setSono({ qualidadeSono: v })}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <SubLabel wizardMode={wizardMode}>Horas de sono em média</SubLabel>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['menos_5', 'Menos de 5h'],
                ['5_6', '5–6h'],
                ['7_8', '7–8h'],
                ['mais_8', 'Mais de 8h'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={optionBtnClass(wizardMode, s.horasSonoMedias === v)}
                onClick={() => setSono({ horasSonoMedias: v })}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className={wizardMode ? 'space-y-4' : 'rounded-xl border border-white/10 bg-white/5 p-4 space-y-3'}>
          {simNao('ronca', 'Você costuma roncar?')}
          {simNao('acordaCansado', 'Você acorda cansado?')}
        </div>

        {!wizardMode && onSubmit && (
          <EnviarRow
            disabled={!blocoSonoCompleto(pm)}
            onClick={() => {
              const next = mergePerfilMetabolicoV3(paciente, { sono: paciente.dadosClinicos?.perfilMetabolicoV3?.sono });
              onSubmit(labels.length ? labels.join(' · ') : 'Sono', next);
            }}
          />
        )}
      </div>
    );
  }

  if (step === STEP_PERFIL_METABOLICO_ATIVIDADE) {
    const a = pm?.atividadeFisica || {};
    const setAtiv = (patch: Partial<NonNullable<typeof pm>['atividadeFisica']>) =>
      setPaciente((p) =>
        mergePerfilMetabolicoV3(p, {
          atividadeFisica: { ...(p.dadosClinicos?.perfilMetabolicoV3?.atividadeFisica || {}), ...patch },
        })
      );
    const rotLabels: Record<string, string> = {
      sedentario: 'Sedentário',
      leve: 'Leve',
      moderada: 'Moderada',
      intensa: 'Intensa',
    };
    const dif = a.dificuldades || {};
    const toggleDif = (k: keyof NonNullable<typeof a.dificuldades>) =>
      setAtiv({ dificuldades: { ...dif, [k]: !dif[k] } });
    const reply = [
      a.rotinaMovimento ? rotLabels[a.rotinaMovimento] : '',
      dif.faltaTempo ? 'Falta de tempo' : '',
      dif.dor ? 'Dor' : '',
      dif.desanimo ? 'Desânimo' : '',
      dif.nenhuma ? 'Nenhuma dificuldade' : '',
    ]
      .filter(Boolean)
      .join(', ');
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['sedentario', 'Sedentário'],
              ['leve', 'Leve'],
              ['moderada', 'Moderada'],
              ['intensa', 'Intensa'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={optionBtnClass(wizardMode, a.rotinaMovimento === v)}
              onClick={() => setAtiv({ rotinaMovimento: v })}
            >
              {l}
            </button>
          ))}
        </div>
        <p className={hintClass(wizardMode)}>O que mais dificulta? (opcional)</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['faltaTempo', 'Falta de tempo'],
              ['dor', 'Dor'],
              ['desanimo', 'Desânimo'],
              ['nenhuma', 'Nenhuma'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" className={optionBtnClass(wizardMode, !!dif[k])} onClick={() => toggleDif(k)}>
              {l}
            </button>
          ))}
        </div>
        {!wizardMode && onSubmit && (
          <EnviarRow
            disabled={!blocoAtividadeCompleto(pm)}
            onClick={() =>
              onSubmit(reply || rotLabels[a.rotinaMovimento!], mergePerfilMetabolicoV3(paciente, { atividadeFisica: paciente.dadosClinicos?.perfilMetabolicoV3?.atividadeFisica }))
            }
          />
        )}
      </div>
    );
  }

  if (step === STEP_PERFIL_METABOLICO_ALIMENTACAO) {
    const a = pm?.alimentacao || {};
    const setAli = (patch: Partial<NonNullable<typeof pm>['alimentacao']>) =>
      setPaciente((p) =>
        mergePerfilMetabolicoV3(p, { alimentacao: { ...(p.dadosClinicos?.perfilMetabolicoV3?.alimentacao || {}), ...patch } })
      );
    const tri = (
      field: 'vontadeDoces' | 'beliscaEntreRefeicoes' | 'comeAnsiedadeEstresse' | 'perdaControleAlimentar',
      v: 'sim' | 'nao' | 'as_vezes',
      l: string
    ) => (
      <button key={`${field}-${v}`} type="button" className={optionBtnClass(wizardMode, a[field] === v)} onClick={() => setAli({ [field]: v })}>
        {l}
      </button>
    );
    const momentoLabels: Record<string, string> = {
      manha: 'Manhã',
      tarde: 'Tarde',
      noite: 'Noite',
      fim_de_semana: 'Fim de semana',
    };
    const replyParts: string[] = [];
    if (a.momentoMaisDificil) replyParts.push(momentoLabels[a.momentoMaisDificil]);
    if (a.vontadeDoces === 'sim') replyParts.push('Vontade de doces');
    if (a.beliscaEntreRefeicoes === 'sim') replyParts.push('Belisca');
    if (a.comeAnsiedadeEstresse === 'sim') replyParts.push('Come por ansiedade');
    if (a.perdaControleAlimentar === 'sim') replyParts.push('Perda de controle');
    return (
      <div className="space-y-3">
        <SubLabel wizardMode={wizardMode}>Momento mais difícil</SubLabel>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['manha', 'Manhã'],
              ['tarde', 'Tarde'],
              ['noite', 'Noite'],
              ['fim_de_semana', 'Fim de semana'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" className={optionBtnClass(wizardMode, a.momentoMaisDificil === v)} onClick={() => setAli({ momentoMaisDificil: v })}>
              {l}
            </button>
          ))}
        </div>
        <SubLabel wizardMode={wizardMode}>Marque o que se aplica</SubLabel>
        <div className="flex flex-wrap gap-2">
          {tri('vontadeDoces', 'sim', 'Doces: sim')}
          {tri('beliscaEntreRefeicoes', 'sim', 'Belisca')}
          {tri('comeAnsiedadeEstresse', 'sim', 'Ansiedade/estresse')}
          {tri('perdaControleAlimentar', 'sim', 'Perda de controle')}
          <button
            type="button"
            className={optionBtnClass(wizardMode, a.vontadeDoces === 'nao')}
            onClick={() => setAli({ vontadeDoces: 'nao', beliscaEntreRefeicoes: 'nao', comeAnsiedadeEstresse: 'nao', perdaControleAlimentar: 'nao' })}
          >
            Nada disso
          </button>
        </div>
        {!wizardMode && onSubmit && (
          <EnviarRow
            disabled={!blocoAlimentacaoCompleto(pm)}
            onClick={() =>
              onSubmit(replyParts.length ? replyParts.join(', ') : 'Alimentação', mergePerfilMetabolicoV3(paciente, { alimentacao: paciente.dadosClinicos?.perfilMetabolicoV3?.alimentacao }))
            }
          />
        )}
      </div>
    );
  }

  if (step === STEP_PERFIL_METABOLICO_ENERGIA) {
    const e = pm?.energia || {};
    const setEn = (patch: Partial<NonNullable<typeof pm>['energia']>) =>
      setPaciente((p) =>
        mergePerfilMetabolicoV3(p, { energia: { ...(p.dadosClinicos?.perfilMetabolicoV3?.energia || {}), ...patch } })
      );
    const nivLabels: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa', muito_baixa: 'Muito baixa' };
    const bar = e.barreirasRotina || {};
    const toggleBar = (k: keyof NonNullable<typeof e.barreirasRotina>) =>
      setEn({ barreirasRotina: { ...bar, [k]: !bar[k] } });
    const reply = [e.nivelEnergiaDiaria ? nivLabels[e.nivelEnergiaDiaria] : '', bar.faltaTempo ? 'Tempo' : '', bar.faltaMotivacao ? 'Motivação' : '', bar.faltaPlanejamento ? 'Planejamento' : '', bar.faltaApoio ? 'Apoio' : '', bar.nenhuma ? 'Nenhuma barreira' : ''].filter(Boolean).join(', ');
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['alta', 'Alta'],
              ['media', 'Média'],
              ['baixa', 'Baixa'],
              ['muito_baixa', 'Muito baixa'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" className={optionBtnClass(wizardMode, e.nivelEnergiaDiaria === v)} onClick={() => setEn({ nivelEnergiaDiaria: v })}>
              {l}
            </button>
          ))}
        </div>
        <SubLabel wizardMode={wizardMode}>O que atrapalha sua rotina?</SubLabel>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['faltaTempo', 'Tempo'],
              ['faltaMotivacao', 'Motivação'],
              ['faltaPlanejamento', 'Planejamento'],
              ['faltaApoio', 'Apoio'],
              ['nenhuma', 'Nenhuma'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" className={optionBtnClass(wizardMode, !!bar[k])} onClick={() => toggleBar(k)}>
              {l}
            </button>
          ))}
        </div>
        {!wizardMode && onSubmit && (
          <EnviarRow
            disabled={!blocoEnergiaCompleto(pm)}
            onClick={() => onSubmit(reply, mergePerfilMetabolicoV3(paciente, { energia: paciente.dadosClinicos?.perfilMetabolicoV3?.energia }))}
          />
        )}
      </div>
    );
  }

  if (step === STEP_PERFIL_METABOLICO_HISTORICO) {
    const h = pm?.historicoEmagrecimento || {};
    const setH = (patch: Partial<NonNullable<typeof pm>['historicoEmagrecimento']>) =>
      setPaciente((p) =>
        mergePerfilMetabolicoV3(p, {
          historicoEmagrecimento: { ...(p.dadosClinicos?.perfilMetabolicoV3?.historicoEmagrecimento || {}), ...patch },
        })
      );
    const simNao = (field: 'jaTentouEmagrecer' | 'recuperouPesoDepois', v: 'sim' | 'nao' | 'nao_sei', l: string) => (
      <button key={`${field}-${v}`} type="button" className={optionBtnClass(wizardMode, h[field] === v)} onClick={() => setH({ [field]: v })}>
        {l}
      </button>
    );
    const reply = h.jaTentouEmagrecer === 'sim' ? 'Já tentou emagrecer' : h.jaTentouEmagrecer === 'nao' ? 'Nunca tentou' : '';
    return (
      <div className="space-y-3">
        {!wizardMode && <SubLabel wizardMode={wizardMode}>Já tentou emagrecer antes?</SubLabel>}
        <div className="flex flex-wrap gap-2">
          {simNao('jaTentouEmagrecer', 'sim', 'Sim')}
          {simNao('jaTentouEmagrecer', 'nao', 'Não')}
        </div>
        {h.jaTentouEmagrecer === 'sim' && (
          <>
            <SubLabel wizardMode={wizardMode}>Recuperou peso depois?</SubLabel>
            <div className="flex flex-wrap gap-2">
              {simNao('recuperouPesoDepois', 'sim', 'Sim')}
              {simNao('recuperouPesoDepois', 'nao', 'Não')}
              {simNao('recuperouPesoDepois', 'nao_sei', 'Não sei')}
            </div>
          </>
        )}
        {!wizardMode && onSubmit && (
          <EnviarRow
            disabled={!blocoHistoricoCompleto(pm)}
            onClick={() =>
              onSubmit(
                reply,
                mergePerfilMetabolicoV3(paciente, { historicoEmagrecimento: paciente.dadosClinicos?.perfilMetabolicoV3?.historicoEmagrecimento })
              )
            }
          />
        )}
      </div>
    );
  }

  if (step === STEP_PERFIL_METABOLICO_MEDICAMENTOS) {
    const m = pm?.medicamentosPrevios || {};
    const meds = m.medicacoes || {};
    const setM = (patch: Partial<NonNullable<typeof pm>['medicamentosPrevios']>) =>
      setPaciente((p) =>
        mergePerfilMetabolicoV3(p, {
          medicamentosPrevios: { ...(p.dadosClinicos?.perfilMetabolicoV3?.medicamentosPrevios || {}), ...patch },
        })
      );
    const toggleMed = (k: keyof NonNullable<typeof m.medicacoes>) =>
      setM({ medicacoes: { ...meds, [k]: !meds[k], nenhuma: false } });
    const medLabels: Record<string, string> = {
      semaglutida: 'Semaglutida',
      tirzepatida: 'Tirzepatida',
      sibutramina: 'Sibutramina',
      orlistate: 'Orlistate',
      outro: 'Outro',
      nenhuma: 'Nenhuma',
    };
    const replyParts: string[] = [];
    if (m.usouMedicacaoParaEmagrecer === 'nao') replyParts.push('Nunca usou');
    else Object.keys(meds).filter((k) => k !== 'outroDescricao' && meds[k as keyof typeof meds]).forEach((k) => replyParts.push(medLabels[k] || k));
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={optionBtnClass(wizardMode, m.usouMedicacaoParaEmagrecer === 'sim')} onClick={() => setM({ usouMedicacaoParaEmagrecer: 'sim' })}>
            Sim, já usei
          </button>
          <button type="button" className={optionBtnClass(wizardMode, m.usouMedicacaoParaEmagrecer === 'nao')} onClick={() => setM({ usouMedicacaoParaEmagrecer: 'nao', medicacoes: { nenhuma: true } })}>
            Não
          </button>
        </div>
        {m.usouMedicacaoParaEmagrecer === 'sim' && (
          <>
            <div className="flex flex-wrap gap-2">
              {(['semaglutida', 'tirzepatida', 'sibutramina', 'orlistate', 'outro'] as const).map((k) => (
                <button key={k} type="button" className={optionBtnClass(wizardMode, !!meds[k])} onClick={() => toggleMed(k)}>
                  {medLabels[k]}
                </button>
              ))}
            </div>
            <SubLabel wizardMode={wizardMode}>Teve efeitos colaterais?</SubLabel>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['sim', 'Sim'],
                  ['nao', 'Não'],
                  ['nao_aplicavel', 'Não se aplica'],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" className={optionBtnClass(wizardMode, m.teveEfeitosColaterais === v)} onClick={() => setM({ teveEfeitosColaterais: v })}>
                  {l}
                </button>
              ))}
            </div>
          </>
        )}
        {!wizardMode && onSubmit && (
          <EnviarRow
            disabled={!blocoMedicamentosCompleto(pm)}
            onClick={() =>
              onSubmit(
                replyParts.join(', ') || 'Medicamentos',
                mergePerfilMetabolicoV3(paciente, { medicamentosPrevios: paciente.dadosClinicos?.perfilMetabolicoV3?.medicamentosPrevios })
              )
            }
          />
        )}
      </div>
    );
  }

  if (step === STEP_PERFIL_METABOLICO_BARREIRAS) {
    const b = pm?.barreirasAdesao || {};
    const setB = (patch: Partial<NonNullable<typeof pm>['barreirasAdesao']>) =>
      setPaciente((p) =>
        mergePerfilMetabolicoV3(p, { barreirasAdesao: { ...(p.dadosClinicos?.perfilMetabolicoV3?.barreirasAdesao || {}), ...patch } })
      );
    type BarreiraKey = keyof NonNullable<PerfilMetabolicoV3['barreirasAdesao']>;
    const toggle = (k: BarreiraKey) => {
      if (k === 'nenhuma') {
        setB({
          faltaTempo: false,
          faltaMotivacao: false,
          custo: false,
          efeitosColaterais: false,
          rotinaCorrida: false,
          faltaApoio: false,
          outro: false,
          nenhuma: true,
        });
        return;
      }
      setB({ ...b, [k]: !b[k], nenhuma: false });
    };
    const labels: Record<string, string> = {
      faltaTempo: 'Falta de tempo',
      faltaMotivacao: 'Motivação',
      custo: 'Custo',
      efeitosColaterais: 'Efeitos colaterais',
      rotinaCorrida: 'Rotina corrida',
      faltaApoio: 'Falta de apoio',
      nenhuma: 'Nenhuma',
      outro: 'Outro',
    };
    const reply = Object.keys(b)
      .filter((k) => k !== 'outroDescricao' && b[k as keyof typeof b])
      .map((k) => labels[k] || k)
      .join(', ');
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {(
            ['faltaTempo', 'faltaMotivacao', 'custo', 'efeitosColaterais', 'rotinaCorrida', 'faltaApoio', 'nenhuma'] as const
          ).map((k) => (
            <button key={k} type="button" className={optionBtnClass(wizardMode, !!b[k])} onClick={() => toggle(k)}>
              {labels[k]}
            </button>
          ))}
        </div>
        {!wizardMode && onSubmit && (
          <EnviarRow
            disabled={!blocoBarreirasCompleto(pm)}
            onClick={() => onSubmit(reply || 'Barreiras', mergePerfilMetabolicoV3(paciente, { barreirasAdesao: paciente.dadosClinicos?.perfilMetabolicoV3?.barreirasAdesao }))}
          />
        )}
      </div>
    );
  }

  if (step === STEP_PERFIL_METABOLICO_EXPECTATIVA) {
    const ex = pm?.expectativa || {};
    const setEx = (patch: Partial<NonNullable<typeof pm>['expectativa']>) =>
      setPaciente((p) =>
        mergePerfilMetabolicoV3(p, { expectativa: { ...(p.dadosClinicos?.perfilMetabolicoV3?.expectativa || {}), ...patch } })
      );
    const expLabels: Record<string, string> = {
      ate_5kg: 'Até 5 kg',
      '5_10kg': '5–10 kg',
      '10_15kg': '10–15 kg',
      mais_15kg: 'Mais de 15 kg',
      nao_sei: 'Ainda não sei',
    };
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['ate_5kg', 'Até 5 kg'],
              ['5_10kg', '5–10 kg'],
              ['10_15kg', '10–15 kg'],
              ['mais_15kg', 'Mais de 15 kg'],
              ['nao_sei', 'Ainda não sei'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={optionBtnClass(wizardMode, ex.expectativaPerdaPeso === v)}
              onClick={() => {
                if (wizardMode) {
                  setEx({ expectativaPerdaPeso: v });
                  return;
                }
                const next = mergePerfilMetabolicoV3(paciente, { expectativa: { expectativaPerdaPeso: v } });
                setPaciente(next);
                onSubmit?.(expLabels[v], next);
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
