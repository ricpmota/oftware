'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import type { Medico } from '@/types/medico';
import {
  ChoiceButton,
  FieldGrid,
  FieldLabel,
  StepHint,
  inputClassName,
  selectClassName,
} from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import VerificationWizardShell, { VerificationAwaitingSupportScreen } from '@/components/meta/VerificationWizardShell';
import VerificationCidadesFields from '@/components/meta/VerificationCidadesFields';
import {
  ESTADOS_BR,
  formatCpf,
  formatTelefone,
  getFirstIncompleteMedicoStep,
  isMedicoVerificacaoWizardCompleto,
  markIntroMedicoSessionDone,
  MEDICO_STEP_TEXTS,
  META_MEDICO_STEP_CIDADES,
  META_MEDICO_STEP_CNH,
  META_MEDICO_STEP_COMPLETO,
  META_MEDICO_STEP_CPF,
  META_MEDICO_STEP_CRM,
  META_MEDICO_STEP_CRM_DOC,
  META_MEDICO_STEP_ENDERECO,
  META_MEDICO_STEP_GENERO,
  META_MEDICO_STEP_INTRO,
  META_MEDICO_STEP_NOME,
  META_MEDICO_STEP_SELFIE,
  META_MEDICO_STEP_TELEFONE,
  META_MEDICO_WIZARD_PROGRESS_STEPS,
} from '@/lib/meta/metaMedicoVerificacao';
import {
  MENSAGEM_AGUARDANDO_SUPORTE_VERIFICACAO,
  TEXTO_FINAL_VERIFICACAO,
  TEXTO_INTRO_VERIFICACAO_HINT,
  TEXTO_INTRO_VERIFICACAO_TITULO,
} from '@/lib/meta/verificacaoProfissional/constants';

type Props = {
  medico: Medico;
  userDisplayName: string | null;
  userId: string;
  onSave: (closeAfter?: boolean, medicoAtualizado?: Medico) => Promise<void>;
  saving: boolean;
  setSaving: (v: boolean) => void;
  resumeAfterLoadTick?: number;
};

export default function MetaMedicoWizard({
  medico,
  userDisplayName,
  userId,
  onSave,
  saving,
  setSaving,
  resumeAfterLoadTick = 0,
}: Props) {
  const [draftMedico, setDraftMedico] = useState(medico);
  const medicoRef = useRef(medico);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingUploadKind = useRef<null | 'cnh' | 'selfie' | 'crm_doc'>(null);

  const [step, setStep] = useState(() => getFirstIncompleteMedicoStep(medico));
  const [cepInput, setCepInput] = useState((medico.localizacao?.cep || '').replace(/\D/g, '').slice(0, 8));
  const [uploadingKind, setUploadingKind] = useState<null | 'cnh' | 'selfie' | 'crm_doc'>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftMedico(medico);
    medicoRef.current = medico;
    setCepInput((medico.localizacao?.cep || '').replace(/\D/g, '').slice(0, 8));
  }, [medico, resumeAfterLoadTick]);

  useEffect(() => {
    medicoRef.current = draftMedico;
  }, [draftMedico]);

  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', block, true);
    return () => document.removeEventListener('keydown', block, true);
  }, []);

  useEffect(() => {
    if (!resumeAfterLoadTick) return;
    const target = getFirstIncompleteMedicoStep(medicoRef.current);
    setStep((prev) => (target > prev ? target : prev));
  }, [resumeAfterLoadTick]);

  const persist = useCallback(
    async (m: Medico) => {
      setSaving(true);
      try {
        await onSave(false, m);
      } finally {
        setSaving(false);
      }
    },
    [onSave, setSaving]
  );

  const onboardingComplete = isMedicoVerificacaoWizardCompleto(draftMedico);
  const aguardandoSomenteSuporte = draftMedico.isVerificado !== true && onboardingComplete;
  const mostrarFaixaAguardandoCadastro = draftMedico.isVerificado !== true && !onboardingComplete;

  const uploadFile = async (file: File, kind: 'cnh' | 'selfie' | 'crm_doc'): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('categoria', kind);
    const res = await fetch('/api/upload-medico-foto', { method: 'POST', body: fd });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) throw new Error(data.error || 'Falha no upload');
    if (!data.url) throw new Error('Resposta sem URL');
    return data.url;
  };

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    const kind = pendingUploadKind.current;
    e.target.value = '';
    if (!file || !kind) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem (JPG, PNG ou WEBP).');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 6 MB.');
      return;
    }
    setUploadingKind(kind);
    setError(null);
    try {
      const url = await uploadFile(file, kind);
      const cur = medicoRef.current;
      const patch: Partial<Medico> =
        kind === 'cnh'
          ? { docVerificacaoCnhUrl: url }
          : kind === 'selfie'
            ? { docVerificacaoSelfieUrl: url }
            : { docVerificacaoCrmUrl: url };
      const updated: Medico = { ...cur, ...patch };
      setDraftMedico(updated);
      medicoRef.current = updated;
      const nextStep =
        kind === 'cnh' ? META_MEDICO_STEP_SELFIE : kind === 'selfie' ? META_MEDICO_STEP_CRM_DOC : META_MEDICO_STEP_COMPLETO;
      setStep(nextStep);
      await persist(updated);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar.');
    } finally {
      setUploadingKind(null);
      pendingUploadKind.current = null;
    }
  };

  const triggerUpload = (kind: 'cnh' | 'selfie' | 'crm_doc') => {
    pendingUploadKind.current = kind;
    fileRef.current?.click();
  };

  const canContinue = (): boolean => {
    const m = medicoRef.current;
    switch (step) {
      case META_MEDICO_STEP_NOME:
        return !!(m.nome || '').trim();
      case META_MEDICO_STEP_TELEFONE:
        return (m.telefone || '').replace(/\D/g, '').length >= 10;
      case META_MEDICO_STEP_GENERO:
        return m.genero === 'M' || m.genero === 'F';
      case META_MEDICO_STEP_CPF:
        return (m.cpfPessoal || '').replace(/\D/g, '').length === 11;
      case META_MEDICO_STEP_CRM:
        return !!(m.crm?.numero || '').trim() && !!(m.crm?.estado || '').trim();
      case META_MEDICO_STEP_ENDERECO:
        return !!(m.localizacao?.endereco || '').trim();
      case META_MEDICO_STEP_CIDADES:
        return !!(m.cidades && m.cidades.length > 0);
      case META_MEDICO_STEP_CNH:
        return !!(m.docVerificacaoCnhUrl || '').trim();
      case META_MEDICO_STEP_SELFIE:
        return !!(m.docVerificacaoSelfieUrl || '').trim();
      case META_MEDICO_STEP_CRM_DOC:
        return !!(m.docVerificacaoCrmUrl || '').trim();
      default:
        return true;
    }
  };

  const patchMedico = useCallback((updater: (prev: Medico) => Medico) => {
    setDraftMedico((prev) => {
      const updated = updater(prev);
      medicoRef.current = updated;
      return updated;
    });
  }, []);

  const handleNext = async () => {
    setError(null);
    if (step === META_MEDICO_STEP_INTRO) {
      markIntroMedicoSessionDone();
      setStep(META_MEDICO_STEP_NOME);
      return;
    }
    if (!canContinue()) {
      setError('Preencha os campos obrigatórios antes de continuar.');
      return;
    }
    if (step === META_MEDICO_STEP_CRM_DOC) {
      const updated = { ...medicoRef.current };
      setStep(META_MEDICO_STEP_COMPLETO);
      await persist(updated);
      return;
    }
    const next = step + 1;
    if (step >= META_MEDICO_STEP_NOME && step <= META_MEDICO_STEP_CIDADES) {
      await persist({ ...medicoRef.current });
    }
    setStep(next);
  };

  const handleBack = () => {
    setError(null);
    if (step <= META_MEDICO_STEP_NOME) {
      setStep(META_MEDICO_STEP_INTRO);
      return;
    }
    setStep((s) => s - 1);
  };

  if (aguardandoSomenteSuporte) {
    return <VerificationAwaitingSupportScreen message={MENSAGEM_AGUARDANDO_SUPORTE_VERIFICACAO} />;
  }

  const stepTexts = MEDICO_STEP_TEXTS[step];
  const stepLabel =
    step === META_MEDICO_STEP_INTRO
      ? ''
      : step === META_MEDICO_STEP_COMPLETO
        ? 'Concluído'
        : `${step} / ${META_MEDICO_WIZARD_PROGRESS_STEPS}`;

  const renderContent = () => {
    if (step === META_MEDICO_STEP_INTRO) {
      return (
        <>
          <h1 className="mb-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{TEXTO_INTRO_VERIFICACAO_TITULO}</h1>
          <StepHint>{TEXTO_INTRO_VERIFICACAO_HINT}</StepHint>
        </>
      );
    }

    if (step === META_MEDICO_STEP_COMPLETO) {
      return (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Cadastro enviado</h1>
          <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{TEXTO_FINAL_VERIFICACAO}</p>
          <p className="text-xs text-slate-500">
            Aguarde o Suporte analisar e liberar o acesso — esta tela permanece até a verificação.
          </p>
        </div>
      );
    }

    return (
      <>
        {stepTexts ? (
          <>
            <label className="mb-2 block text-lg font-semibold leading-snug text-slate-900 sm:text-xl">{stepTexts.title}</label>
            {stepTexts.hint ? <StepHint>{stepTexts.hint}</StepHint> : null}
          </>
        ) : null}

        {step === META_MEDICO_STEP_NOME && (
          <FieldGrid>
            <input
              type="text"
              value={draftMedico.nome || ''}
              onChange={(e) => patchMedico((prev) => ({ ...prev, nome: e.target.value }))}
              placeholder={userDisplayName || 'Seu nome completo'}
              className={inputClassName}
            />
          </FieldGrid>
        )}

        {step === META_MEDICO_STEP_TELEFONE && (
          <FieldGrid>
            <input
              type="tel"
              inputMode="numeric"
              value={draftMedico.telefone || ''}
              onChange={(e) => {
                const formatted = formatTelefone(e.target.value);
                patchMedico((prev) => ({ ...prev, telefone: formatted }));
              }}
              placeholder="(11) 99999-9999"
              className={inputClassName}
            />
          </FieldGrid>
        )}

        {step === META_MEDICO_STEP_GENERO && (
          <div className="grid grid-cols-2 gap-3">
            {(['M', 'F'] as const).map((g) => (
              <ChoiceButton
                key={g}
                selected={draftMedico.genero === g}
                onClick={() => patchMedico((prev) => ({ ...prev, genero: g }))}
              >
                {g === 'F' ? 'Dra.' : 'Dr.'}
              </ChoiceButton>
            ))}
          </div>
        )}

        {step === META_MEDICO_STEP_CPF && (
          <FieldGrid>
            <input
              type="text"
              inputMode="numeric"
              value={formatCpf(draftMedico.cpfPessoal || '')}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '').slice(0, 11);
                patchMedico((prev) => ({ ...prev, cpfPessoal: d }));
              }}
              placeholder="000.000.000-00"
              className={inputClassName}
            />
          </FieldGrid>
        )}

        {step === META_MEDICO_STEP_CRM && (
          <FieldGrid>
            <div className="flex gap-2">
              <input
                type="text"
                value={draftMedico.crm?.numero || ''}
                onChange={(e) =>
                  patchMedico((prev) => ({
                    ...prev,
                    crm: { ...prev.crm, numero: e.target.value, estado: prev.crm?.estado || '' },
                  }))
                }
                placeholder="Nº CRM"
                className={`${inputClassName} min-w-0 flex-1 !w-auto`}
              />
              <select
                value={draftMedico.crm?.estado || ''}
                onChange={(e) =>
                  patchMedico((prev) => ({
                    ...prev,
                    crm: { ...prev.crm, numero: prev.crm?.numero || '', estado: e.target.value },
                  }))
                }
                className={`${selectClassName} shrink-0 !w-24`}
              >
                <option value="">UF</option>
                {ESTADOS_BR.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </FieldGrid>
        )}

        {step === META_MEDICO_STEP_ENDERECO && (
          <FieldGrid>
            <FieldLabel>CEP</FieldLabel>
            <input
              type="text"
              inputMode="numeric"
              value={cepInput}
              onChange={async (e) => {
                const cep = e.target.value.replace(/\D/g, '').slice(0, 8);
                setCepInput(cep);
                patchMedico((prev) => ({
                  ...prev,
                  localizacao: { ...prev.localizacao, cep: cep || undefined },
                }));
                if (cep.length === 8) {
                  try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();
                    if (!data.erro && data.logradouro) {
                      const enderecoCompleto = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
                      patchMedico((prev) => ({
                        ...prev,
                        localizacao: { ...prev.localizacao, endereco: enderecoCompleto, cep },
                      }));
                    }
                  } catch {
                    /* ignore */
                  }
                }
              }}
              placeholder="00000-000"
              className={inputClassName}
            />
            <FieldLabel>Endereço completo</FieldLabel>
            <input
              type="text"
              value={draftMedico.localizacao?.endereco || ''}
              onChange={(e) =>
                patchMedico((prev) => ({
                  ...prev,
                  localizacao: { ...prev.localizacao, endereco: e.target.value },
                }))
              }
              placeholder="Rua, número, bairro, cidade"
              className={inputClassName}
            />
          </FieldGrid>
        )}

        {step === META_MEDICO_STEP_CIDADES && (
          <VerificationCidadesFields
            cidades={draftMedico.cidades || []}
            onChange={(cidades) => {
              patchMedico((prev) => ({ ...prev, cidades }));
            }}
            userId={userId}
          />
        )}

        {(step === META_MEDICO_STEP_CNH || step === META_MEDICO_STEP_SELFIE || step === META_MEDICO_STEP_CRM_DOC) && (
          <div className="space-y-3">
            {step === META_MEDICO_STEP_CNH && draftMedico.docVerificacaoCnhUrl ? (
              <p className="text-sm text-emerald-700">CNH enviada. Você pode reenviar se necessário.</p>
            ) : null}
            {step === META_MEDICO_STEP_SELFIE && draftMedico.docVerificacaoSelfieUrl ? (
              <p className="text-sm text-emerald-700">Selfie enviada. Você pode reenviar se necessário.</p>
            ) : null}
            {step === META_MEDICO_STEP_CRM_DOC && draftMedico.docVerificacaoCrmUrl ? (
              <p className="text-sm text-emerald-700">CRM enviado. Você pode reenviar se necessário.</p>
            ) : null}
            <button
              type="button"
              disabled={uploadingKind !== null}
              onClick={() =>
                triggerUpload(
                  step === META_MEDICO_STEP_CNH ? 'cnh' : step === META_MEDICO_STEP_SELFIE ? 'selfie' : 'crm_doc'
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
            >
              {uploadingKind ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              {uploadingKind
                ? 'Enviando…'
                : step === META_MEDICO_STEP_CNH
                  ? 'Anexar foto da CNH'
                  : step === META_MEDICO_STEP_SELFIE
                    ? 'Anexar selfie'
                    : 'Anexar foto do CRM'}
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </>
    );
  };

  const isUploadStep =
    step === META_MEDICO_STEP_CNH || step === META_MEDICO_STEP_SELFIE || step === META_MEDICO_STEP_CRM_DOC;

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      <VerificationWizardShell
        step={step === META_MEDICO_STEP_COMPLETO ? META_MEDICO_WIZARD_PROGRESS_STEPS : step}
        progressSteps={META_MEDICO_WIZARD_PROGRESS_STEPS}
        stepLabel={stepLabel}
        topBanner={mostrarFaixaAguardandoCadastro ? MENSAGEM_AGUARDANDO_SUPORTE_VERIFICACAO : null}
        showBack={step > META_MEDICO_STEP_INTRO && step < META_MEDICO_STEP_COMPLETO}
        onBack={handleBack}
        showContinue={(step <= META_MEDICO_STEP_CRM_DOC) && (!isUploadStep || canContinue())}
        onContinue={() => void handleNext()}
        continueDisabled={!canContinue()}
        continueLabel={step === META_MEDICO_STEP_INTRO ? 'Começar agora' : 'Continuar'}
        saving={saving}
        isTerminal={step === META_MEDICO_STEP_COMPLETO}
      >
        {renderContent()}
      </VerificationWizardShell>
    </>
  );
}
