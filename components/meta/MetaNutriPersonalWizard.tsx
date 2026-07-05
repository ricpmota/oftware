'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import type { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import type { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import {
  FieldGrid,
  StepHint,
  inputClassName,
} from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import VerificationWizardShell, { VerificationAwaitingSupportScreen } from '@/components/meta/VerificationWizardShell';
import VerificationCidadesFields from '@/components/meta/VerificationCidadesFields';
import {
  formatTelefone,
  getFirstIncompleteNutriPersonalStep,
  isNutriPersonalVerificacaoWizardCompleto,
  markIntroNutriPersonalSessionDone,
  type ProfissionalVerificacaoDoc,
} from '@/lib/meta/metaNutriPersonalVerificacao';
import {
  META_NUTRI_PERSONAL_STEP_CIDADES,
  META_NUTRI_PERSONAL_STEP_CNH,
  META_NUTRI_PERSONAL_STEP_COMPLETO,
  META_NUTRI_PERSONAL_STEP_INTRO,
  META_NUTRI_PERSONAL_STEP_NOME,
  META_NUTRI_PERSONAL_STEP_REGISTRO,
  META_NUTRI_PERSONAL_STEP_REGISTRO_DOC,
  META_NUTRI_PERSONAL_STEP_SELFIE,
  META_NUTRI_PERSONAL_STEP_TELEFONE,
  META_NUTRI_PERSONAL_WIZARD_PROGRESS_STEPS,
  nutriPersonalStepTexts,
} from '@/lib/meta/metaNutriPersonalVerificacao/constants';
import {
  MENSAGEM_AGUARDANDO_SUPORTE_VERIFICACAO,
  TEXTO_FINAL_VERIFICACAO,
  TEXTO_INTRO_VERIFICACAO_HINT,
  TEXTO_INTRO_VERIFICACAO_TITULO,
} from '@/lib/meta/verificacaoProfissional/constants';

export {
  META_NUTRI_CHAT_INTRO_SESSION_KEY,
  META_PERSONAL_CHAT_INTRO_SESSION_KEY,
} from '@/lib/meta/metaNutriPersonalVerificacao/constants';
export { getFirstIncompleteNutriPersonalStep, type ProfissionalVerificacaoDoc } from '@/lib/meta/metaNutriPersonalVerificacao';

type Props = {
  tipo: 'nutri' | 'personal';
  profissional: ProfissionalVerificacaoDoc;
  setProfissional:
    | React.Dispatch<React.SetStateAction<NutricionistaDoc | null>>
    | React.Dispatch<React.SetStateAction<PersonalTrainerDoc | null>>;
  userDisplayName: string | null;
  userId: string;
  onSave: (closeAfter?: boolean, atualizado?: ProfissionalVerificacaoDoc) => Promise<void>;
  saving: boolean;
  setSaving: (v: boolean) => void;
  resumeAfterLoadTick?: number;
};

export default function MetaNutriPersonalWizard({
  tipo,
  profissional,
  setProfissional,
  userDisplayName,
  userId,
  onSave,
  saving,
  setSaving,
  resumeAfterLoadTick = 0,
}: Props) {
  const profRef = useRef(profissional);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingUploadKind = useRef<null | 'cnh' | 'selfie' | 'registro_doc'>(null);

  const [step, setStep] = useState(() => getFirstIncompleteNutriPersonalStep(profissional, tipo));
  const [uploadingKind, setUploadingKind] = useState<null | 'cnh' | 'selfie' | 'registro_doc'>(null);
  const [error, setError] = useState<string | null>(null);

  const stepTextsMap = nutriPersonalStepTexts(tipo);

  useEffect(() => {
    profRef.current = profissional;
  }, [profissional]);

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
    const target = getFirstIncompleteNutriPersonalStep(profRef.current, tipo);
    setStep((prev) => (target > prev ? target : prev));
  }, [resumeAfterLoadTick, tipo]);

  const setProf = useCallback(
    (update: ProfissionalVerificacaoDoc) => {
      setProfissional(update as NutricionistaDoc & PersonalTrainerDoc);
      profRef.current = update;
    },
    [setProfissional]
  );

  const persist = useCallback(
    async (p: ProfissionalVerificacaoDoc) => {
      setSaving(true);
      try {
        await onSave(false, p);
      } finally {
        setSaving(false);
      }
    },
    [onSave, setSaving]
  );

  const onboardingComplete = isNutriPersonalVerificacaoWizardCompleto(profissional, tipo);
  const aguardandoSomenteSuporte = profissional.isVerificado !== true && onboardingComplete;
  const mostrarFaixaAguardandoCadastro = profissional.isVerificado !== true && !onboardingComplete;

  const uploadFile = async (file: File, kind: 'cnh' | 'selfie' | 'registro_doc'): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('categoria', kind === 'registro_doc' ? 'registro_doc' : kind);
    fd.append('profissao', tipo === 'nutri' ? 'nutricionista' : 'personal');
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
      const cur = profRef.current;
      const patch: Partial<ProfissionalVerificacaoDoc> =
        kind === 'cnh'
          ? { docVerificacaoCnhUrl: url }
          : kind === 'selfie'
            ? { docVerificacaoSelfieUrl: url }
            : { docVerificacaoRegistroUrl: url };
      const updated: ProfissionalVerificacaoDoc = { ...cur, ...patch };
      setProf(updated);
      const nextStep =
        kind === 'cnh'
          ? META_NUTRI_PERSONAL_STEP_SELFIE
          : kind === 'selfie'
            ? META_NUTRI_PERSONAL_STEP_REGISTRO_DOC
            : META_NUTRI_PERSONAL_STEP_COMPLETO;
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

  const triggerUpload = (kind: 'cnh' | 'selfie' | 'registro_doc') => {
    pendingUploadKind.current = kind;
    fileRef.current?.click();
  };

  const canContinue = (): boolean => {
    const p = profRef.current;
    switch (step) {
      case META_NUTRI_PERSONAL_STEP_NOME:
        return !!(p.nome || '').trim();
      case META_NUTRI_PERSONAL_STEP_TELEFONE:
        return (p.telefone || '').replace(/\D/g, '').length >= 10;
      case META_NUTRI_PERSONAL_STEP_REGISTRO:
        return (p.registroNumero || '').replace(/\D/g, '').length >= 1;
      case META_NUTRI_PERSONAL_STEP_CIDADES:
        return !!(p.cidades && p.cidades.length > 0);
      case META_NUTRI_PERSONAL_STEP_CNH:
        return !!(p.docVerificacaoCnhUrl || '').trim();
      case META_NUTRI_PERSONAL_STEP_SELFIE:
        return !!(p.docVerificacaoSelfieUrl || '').trim();
      case META_NUTRI_PERSONAL_STEP_REGISTRO_DOC:
        return !!(p.docVerificacaoRegistroUrl || '').trim();
      default:
        return true;
    }
  };

  const handleNext = async () => {
    setError(null);
    const cur = profRef.current;
    if (step === META_NUTRI_PERSONAL_STEP_INTRO) {
      markIntroNutriPersonalSessionDone(tipo);
      setStep(META_NUTRI_PERSONAL_STEP_NOME);
      return;
    }
    if (!canContinue()) {
      setError('Preencha os campos obrigatórios antes de continuar.');
      return;
    }
    if (step === META_NUTRI_PERSONAL_STEP_REGISTRO_DOC) {
      setStep(META_NUTRI_PERSONAL_STEP_COMPLETO);
      await persist(cur);
      return;
    }
    const next = step + 1;
    setStep(next);
    if (step >= META_NUTRI_PERSONAL_STEP_NOME && step <= META_NUTRI_PERSONAL_STEP_CIDADES) {
      await persist(cur);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step <= META_NUTRI_PERSONAL_STEP_NOME) {
      setStep(META_NUTRI_PERSONAL_STEP_INTRO);
      return;
    }
    setStep((s) => s - 1);
  };

  if (aguardandoSomenteSuporte) {
    return <VerificationAwaitingSupportScreen message={MENSAGEM_AGUARDANDO_SUPORTE_VERIFICACAO} />;
  }

  const stepTexts = stepTextsMap[step];
  const stepLabel =
    step === META_NUTRI_PERSONAL_STEP_INTRO
      ? ''
      : step === META_NUTRI_PERSONAL_STEP_COMPLETO
        ? 'Concluído'
        : `${step} / ${META_NUTRI_PERSONAL_WIZARD_PROGRESS_STEPS}`;

  const isUploadStep =
    step === META_NUTRI_PERSONAL_STEP_CNH ||
    step === META_NUTRI_PERSONAL_STEP_SELFIE ||
    step === META_NUTRI_PERSONAL_STEP_REGISTRO_DOC;

  const renderContent = () => {
    if (step === META_NUTRI_PERSONAL_STEP_INTRO) {
      return (
        <>
          <h1 className="mb-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{TEXTO_INTRO_VERIFICACAO_TITULO}</h1>
          <StepHint>{TEXTO_INTRO_VERIFICACAO_HINT}</StepHint>
        </>
      );
    }

    if (step === META_NUTRI_PERSONAL_STEP_COMPLETO) {
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

        {step === META_NUTRI_PERSONAL_STEP_NOME && (
          <FieldGrid>
            <input
              type="text"
              value={profissional.nome || ''}
              onChange={(e) => setProf({ ...profRef.current, nome: e.target.value })}
              placeholder={userDisplayName || 'Seu nome completo'}
              className={inputClassName}
            />
          </FieldGrid>
        )}

        {step === META_NUTRI_PERSONAL_STEP_TELEFONE && (
          <FieldGrid>
            <input
              type="tel"
              inputMode="numeric"
              value={profissional.telefone || ''}
              onChange={(e) => setProf({ ...profRef.current, telefone: formatTelefone(e.target.value) })}
              placeholder="(11) 99999-9999"
              className={inputClassName}
            />
          </FieldGrid>
        )}

        {step === META_NUTRI_PERSONAL_STEP_REGISTRO && (
          <FieldGrid>
            <input
              type="text"
              inputMode="numeric"
              value={profissional.registroNumero || ''}
              onChange={(e) =>
                setProf({ ...profRef.current, registroNumero: e.target.value.replace(/\D/g, '') })
              }
              placeholder={tipo === 'nutri' ? 'Número do CRN' : 'Número do CREF'}
              className={inputClassName}
            />
          </FieldGrid>
        )}

        {step === META_NUTRI_PERSONAL_STEP_CIDADES && (
          <VerificationCidadesFields
            cidades={profissional.cidades || []}
            onChange={(cidades) => setProf({ ...profRef.current, cidades })}
            userId={userId}
          />
        )}

        {isUploadStep && (
          <div className="space-y-3">
            {step === META_NUTRI_PERSONAL_STEP_CNH && profissional.docVerificacaoCnhUrl ? (
              <p className="text-sm text-emerald-700">CNH enviada. Você pode reenviar se necessário.</p>
            ) : null}
            {step === META_NUTRI_PERSONAL_STEP_SELFIE && profissional.docVerificacaoSelfieUrl ? (
              <p className="text-sm text-emerald-700">Selfie enviada. Você pode reenviar se necessário.</p>
            ) : null}
            {step === META_NUTRI_PERSONAL_STEP_REGISTRO_DOC && profissional.docVerificacaoRegistroUrl ? (
              <p className="text-sm text-emerald-700">Registro enviado. Você pode reenviar se necessário.</p>
            ) : null}
            <button
              type="button"
              disabled={uploadingKind !== null}
              onClick={() =>
                triggerUpload(
                  step === META_NUTRI_PERSONAL_STEP_CNH
                    ? 'cnh'
                    : step === META_NUTRI_PERSONAL_STEP_SELFIE
                      ? 'selfie'
                      : 'registro_doc'
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
            >
              {uploadingKind ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              {uploadingKind
                ? 'Enviando…'
                : step === META_NUTRI_PERSONAL_STEP_CNH
                  ? 'Anexar foto da CNH'
                  : step === META_NUTRI_PERSONAL_STEP_SELFIE
                    ? 'Anexar selfie'
                    : tipo === 'nutri'
                      ? 'Anexar foto do CRN'
                      : 'Anexar foto do CREF'}
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

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      <VerificationWizardShell
        step={step === META_NUTRI_PERSONAL_STEP_COMPLETO ? META_NUTRI_PERSONAL_WIZARD_PROGRESS_STEPS : step}
        progressSteps={META_NUTRI_PERSONAL_WIZARD_PROGRESS_STEPS}
        stepLabel={stepLabel}
        topBanner={mostrarFaixaAguardandoCadastro ? MENSAGEM_AGUARDANDO_SUPORTE_VERIFICACAO : null}
        showBack={step > META_NUTRI_PERSONAL_STEP_INTRO && step < META_NUTRI_PERSONAL_STEP_COMPLETO}
        onBack={handleBack}
        showContinue={(step <= META_NUTRI_PERSONAL_STEP_REGISTRO_DOC) && (!isUploadStep || canContinue())}
        onContinue={() => void handleNext()}
        continueDisabled={!canContinue()}
        continueLabel={step === META_NUTRI_PERSONAL_STEP_INTRO ? 'Começar agora' : 'Continuar'}
        saving={saving}
        isTerminal={step === META_NUTRI_PERSONAL_STEP_COMPLETO}
      >
        {renderContent()}
      </VerificationWizardShell>
    </>
  );
}
