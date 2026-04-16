'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { renderInlineBold } from '@/lib/format/renderInlineBold';
import type { IARole } from '@/lib/ia/orchestrate';
import type { IAContextSurface } from '@/lib/ia/buildSystemPrompt';
import type { ApiMealResponse, ChatNutriMealType } from '@/lib/chatnutri/types';
import { prepareMealImageForUpload } from '@/utils/prepareMealImageForUpload';
import { MessageCircle, X, Send, Loader2, Camera } from 'lucide-react';

const MEAL_OPTIONS: { value: ChatNutriMealType; label: string }[] = [
  { value: 'cafe', label: 'Café' },
  { value: 'lanche1', label: 'Lanche manhã' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'lanche2', label: 'Lanche tarde' },
  { value: 'jantar', label: 'Jantar' },
];

const MEAL_LABELS: Record<ChatNutriMealType, string> = {
  cafe: 'Café da Manhã',
  lanche1: 'Lanche da Manhã',
  almoco: 'Almoço',
  lanche2: 'Lanche da Tarde',
  jantar: 'Jantar',
};

export type ChatIAMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
};

export type ChatIAChatNutriUpload = {
  patientId: string;
  dateKey: string;
  beneficiaryLabel?: string;
};

/** Fluxo médico: lista de pacientes em tratamento + data ao gravar no ChatNutri */
export type ChatIAMedicoNutriMeal = {
  dateKey: string;
  patients: Array<{ id: string; label: string }>;
};

type ChatIAProps = {
  userLabel?: string;
  floatPosition?: 'left' | 'right';
  className?: string;
  roleHint?: IARole;
  contextSurface?: IAContextSurface;
  /** Landing Rafaela: link wa.me — exibe destaque “Conversa WhatsApp” com o painel aberto */
  whatsappHref?: string;
  /** Paciente logado: grava direto no ChatNutri deste paciente */
  chatNutriUpload?: ChatIAChatNutriUpload | null;
  /** Médico no metaadmin: escolhe associar ao ChatNutri de um paciente ou análise avulsa no chat */
  chatNutriMedicoMeal?: ChatIAMedicoNutriMeal | null;
};

function welcomeForSurface(surface: IAContextSurface | undefined, userLabel: string): string {
  const disclaimerPacienteOuPublico =
    'Lembrete: não substituo seu médico nem dou orientação clínica específica — em emergência, busque ajuda presencial.';
  switch (surface) {
    case 'meta_paciente':
      return `Olá! Sou o assistente da Oftware na **área do paciente**. Posso ajudar com o app, rotinas e dúvidas sobre a plataforma.\n\n${disclaimerPacienteOuPublico}\n\nComo posso ajudar, ${userLabel}?`;
    case 'metaadmin_medico':
      return `Olá! Sou o assistente da Oftware na **área do médico** (Metaadmin). Posso ajudar com o painel e os fluxos do sistema, e conversar sobre condutas e organização do tratamento no seu consultório.\n\nEm que posso ajudar, ${userLabel}?`;
    case 'rafaela_public':
      return `Olá! Como posso te ajudar?

Pode perguntar qualquer dúvida jurídica sobre **Previdenciário**, **Família** ou **Sucessões** — respondo com calma e em linguagem simples.

Isso é só orientação geral por aqui; não substitui uma consulta com a Dra. Rafaela.

Para começar, preencha seu **nome** e **telefone** (com DDD) no formulário abaixo.`;
    default:
      return `Olá! Sou assistente da Oftware. Posso explicar como a plataforma funciona e ajudar com o próximo passo.\n\n${disclaimerPacienteOuPublico}\n\nComo posso ajudar, ${userLabel}?`;
  }
}

const WELCOME_ID = 'welcome-ia';
const RAFAELA_LEAD_THANKS_ID = 'rafaela-lead-thanks';
const RAFAELA_IDLE_MS = 5 * 60 * 1000;
const MAX_MEAL_FILE_BYTES = 5 * 1024 * 1024;

type ApiAdhocMealResponse =
  | { ok: true; text: string; imageUrl?: string | null }
  | { ok: false; error?: { message?: string } };

function WhatsAppGlyphSmall({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ChatIA({
  userLabel = 'visitante',
  floatPosition = 'right',
  className = '',
  roleHint,
  contextSurface,
  whatsappHref,
  chatNutriUpload,
  chatNutriMedicoMeal,
}: ChatIAProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ChatIAMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const patientIdNutri = chatNutriUpload?.patientId?.trim() ?? '';
  const dateKeyNutri = chatNutriUpload?.dateKey?.trim() ?? '';
  const mealBeneficiaryLabel = chatNutriUpload?.beneficiaryLabel?.trim() ?? '';

  const mealUploadPatient = Boolean(patientIdNutri && dateKeyNutri);
  const mealUploadMedico = Boolean(chatNutriMedicoMeal);
  const mealUploadEnabled = mealUploadPatient || mealUploadMedico;

  /** Após "Sim" no fluxo médico: paciente escolhido para gravar no ChatNutri */
  const [medicoSelectedPatient, setMedicoSelectedPatient] = useState<{ id: string; label: string } | null>(null);
  /** true = análise só no chat; false = vai para ChatNutri (paciente fixo ou selecionado) */
  const [medicoMealAdhoc, setMedicoMealAdhoc] = useState(false);
  const [showMealAssocModal, setShowMealAssocModal] = useState(false);
  const [showMealPatientPickModal, setShowMealPatientPickModal] = useState(false);
  const [showMealIntroModal, setShowMealIntroModal] = useState(false);
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [pendingMealFile, setPendingMealFile] = useState<File | null>(null);
  const [mealPreviewUrl, setMealPreviewUrl] = useState<string | null>(null);
  const [mealType, setMealType] = useState<ChatNutriMealType>('almoco');
  const [uploadingMeal, setUploadingMeal] = useState(false);
  const [mealFlowError, setMealFlowError] = useState<string | null>(null);
  /** Paciente escolhido no select do fluxo médico (antes de Continuar) */
  const [mealPatientPickId, setMealPatientPickId] = useState('');

  /** Landing Rafaela: identificação antes do primeiro envio à IA */
  const [rafaelaLeadDone, setRafaelaLeadDone] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [leadNameInput, setLeadNameInput] = useState('');
  const [leadPhoneInput, setLeadPhoneInput] = useState('');
  const [leadFormError, setLeadFormError] = useState<string | null>(null);

  const itemsRef = useRef<ChatIAMessage[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptEmailDoneRef = useRef(false);
  const transcriptEmailLockRef = useRef(false);
  const rafaelaLeadDoneRef = useRef(false);

  const fileGalleryRef = useRef<HTMLInputElement>(null);
  const fileCameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || items.length > 0) return;
    setItems([
      {
        id: WELCOME_ID,
        role: 'assistant',
        content: welcomeForSurface(contextSurface, userLabel),
      },
    ]);
  }, [open, userLabel, items.length, contextSurface]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [items, loading, uploadingMeal]);

  const revokePreview = useCallback(() => {
    setMealPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingMealFile(null);
  }, []);

  useEffect(() => {
    return () => {
      setMealPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (open) return;
    setShowMealAssocModal(false);
    setShowMealPatientPickModal(false);
    setShowMealIntroModal(false);
    setShowMealTypeModal(false);
    setMealFlowError(null);
    setMedicoSelectedPatient(null);
    setMedicoMealAdhoc(false);
    setMealPatientPickId('');
    setMealPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingMealFile(null);
  }, [open]);

  useEffect(() => {
    if (!showMealPatientPickModal) return;
    setMealPatientPickId(medicoSelectedPatient?.id ?? '');
  }, [showMealPatientPickModal, medicoSelectedPatient?.id]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  rafaelaLeadDoneRef.current = rafaelaLeadDone;

  const maybeSendTranscriptEmail = useCallback(
    async (reason: 'idle_5m' | 'whatsapp') => {
      if (contextSurface !== 'rafaela_public') return;
      const name = visitorName.trim();
      const phone = visitorPhone.trim();
      if (!name || !phone) return;
      if (transcriptEmailDoneRef.current || transcriptEmailLockRef.current) return;
      transcriptEmailLockRef.current = true;
      try {
        const transcript = itemsRef.current
          .map((m) => {
            const who = m.role === 'user' ? 'Visitante' : 'Assistente';
            return `${who}: ${m.content}`;
          })
          .join('\n\n');
        if (!transcript.trim()) return;
        const res = await fetch('/api/rafaela/chat-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, transcript, reason }),
        });
        if (res.ok) transcriptEmailDoneRef.current = true;
      } catch {
        /* rede */
      } finally {
        transcriptEmailLockRef.current = false;
      }
    },
    [contextSurface, visitorName, visitorPhone]
  );

  const bumpIdleTimer = useCallback(() => {
    if (contextSurface !== 'rafaela_public' || !rafaelaLeadDoneRef.current) return;
    if (transcriptEmailDoneRef.current) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      void maybeSendTranscriptEmail('idle_5m');
    }, RAFAELA_IDLE_MS);
  }, [contextSurface, maybeSendTranscriptEmail]);

  const submitRafaelaLead = useCallback(() => {
    if (contextSurface !== 'rafaela_public') return;
    const name = leadNameInput.trim();
    const digits = leadPhoneInput.replace(/\D/g, '');
    if (name.length < 2) {
      setLeadFormError('Informe seu nome (pelo menos 2 letras).');
      return;
    }
    if (digits.length < 10) {
      setLeadFormError('Informe um telefone com DDD (mínimo 10 dígitos).');
      return;
    }
    setLeadFormError(null);
    setVisitorName(name);
    setVisitorPhone(leadPhoneInput.trim());
    setRafaelaLeadDone(true);
    const first = name.split(/\s+/)[0] ?? name;
    setItems((prev) => [
      ...prev,
      {
        id: RAFAELA_LEAD_THANKS_ID,
        role: 'assistant',
        content: `Obrigado, ${first}! Pode mandar sua dúvida quando quiser.`,
      },
    ]);
  }, [contextSurface, leadNameInput, leadPhoneInput]);

  useEffect(() => {
    if (contextSurface !== 'rafaela_public' || !rafaelaLeadDone) return;
    bumpIdleTimer();
  }, [contextSurface, rafaelaLeadDone, bumpIdleTimer]);

  const onWhatsAppRafaelaClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!whatsappHref || contextSurface !== 'rafaela_public') return;
      e.preventDefault();
      void (async () => {
        await maybeSendTranscriptEmail('whatsapp');
        window.open(whatsappHref, '_blank', 'noopener,noreferrer');
      })();
    },
    [whatsappHref, contextSurface, maybeSendTranscriptEmail]
  );

  useEffect(() => {
    if (open) return;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [open]);

  const send = useCallback(async () => {
    if (contextSurface === 'rafaela_public' && !rafaelaLeadDone) return;
    const text = input.trim();
    if (!text || loading || uploadingMeal) return;

    const userMsg: ChatIAMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };

    const priorForApi = items
      .filter((m) => m.id !== WELCOME_ID)
      .map((m) => ({ role: m.role, content: m.content }));

    setItems((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          messages: priorForApi,
          ...(roleHint ? { roleHint } : {}),
          ...(contextSurface ? { contextSurface } : {}),
          ...(contextSurface === 'rafaela_public' && rafaelaLeadDone && visitorName.trim() && visitorPhone.trim()
            ? { visitorMeta: { name: visitorName.trim(), phone: visitorPhone.trim() } }
            : {}),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Falha na resposta.');
      }
      const reply = data.reply?.trim();
      if (!reply) throw new Error('Resposta vazia.');
      setItems((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
      if (contextSurface === 'rafaela_public' && rafaelaLeadDone) {
        bumpIdleTimer();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    items,
    roleHint,
    contextSurface,
    uploadingMeal,
    rafaelaLeadDone,
    visitorName,
    visitorPhone,
    bumpIdleTimer,
  ]);

  const openMealFlow = useCallback(() => {
    if (!mealUploadEnabled || loading || uploadingMeal) return;
    setMealFlowError(null);
    if (chatNutriMedicoMeal) {
      setMedicoSelectedPatient(null);
      setMedicoMealAdhoc(false);
      setShowMealAssocModal(true);
    } else {
      setShowMealIntroModal(true);
    }
  }, [mealUploadEnabled, chatNutriMedicoMeal, loading, uploadingMeal]);

  const handleMealFilePicked = useCallback(
    (file: File | undefined) => {
      if (!file || loading || uploadingMeal) return;
      setMealFlowError(null);
      if (!file.type.startsWith('image/')) {
        setMealFlowError('Selecione uma imagem.');
        return;
      }
      if (file.size > MAX_MEAL_FILE_BYTES) {
        setMealFlowError('Imagem muito grande. Máximo 5 MB.');
        return;
      }
      setMealPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setPendingMealFile(file);
      setShowMealIntroModal(false);
      setShowMealTypeModal(true);
    },
    [loading, uploadingMeal]
  );

  const onGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    handleMealFilePicked(f);
  };

  const onCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    handleMealFilePicked(f);
  };

  const backFromMealTypeToIntro = () => {
    setShowMealTypeModal(false);
    revokePreview();
    setMealFlowError(null);
    setShowMealIntroModal(true);
  };

  const introCopyNutriTarget = (): React.ReactNode => {
    if (mealUploadMedico && medicoMealAdhoc) {
      return renderInlineBold(
        'A estimativa será mostrada **apenas nesta conversa**, sem salvar no ChatNutri de nenhum paciente.',
        { strongClassName: 'font-semibold text-[#E8EDED]' }
      );
    }
    const ben = mealBeneficiaryLabel || (medicoSelectedPatient?.label?.trim() ?? '');
    const dk = dateKeyNutri || chatNutriMedicoMeal?.dateKey || '';
    if (ben && dk) {
      return (
        <>
          o registro será associado ao ChatNutri do paciente <strong className="text-[#E8EDED]">{ben}</strong> no dia{' '}
          <strong className="text-[#E8EDED]">{dk}</strong>, junto com o plano do nutricionista quando houver.
        </>
      );
    }
    return (
      <>
        o registro entra no seu dia no ChatNutri (aba Nutri), junto com o plano do nutricionista quando houver.
      </>
    );
  };

  const submitMealAnalysis = async () => {
    if (!pendingMealFile) return;

    const useAdhoc = mealUploadMedico && medicoMealAdhoc;
    const nutriPatientId =
      patientIdNutri || (medicoSelectedPatient?.id && !medicoMealAdhoc ? medicoSelectedPatient.id : '');
    const nutriDateKey = dateKeyNutri || chatNutriMedicoMeal?.dateKey || '';

    if (!useAdhoc && (!nutriPatientId.trim() || !nutriDateKey.trim())) return;

    setMealFlowError(null);
    setUploadingMeal(true);
    try {
      const fileToSend = await prepareMealImageForUpload(pendingMealFile);
      if (fileToSend.size > MAX_MEAL_FILE_BYTES) {
        setMealFlowError('A foto está muito grande mesmo após otimização. Tente outra imagem.');
        return;
      }

      if (useAdhoc) {
        const fd = new FormData();
        fd.set('mealType', mealType);
        fd.set('file', fileToSend);
        const res = await fetch('/api/chatnutri/meal-adhoc', { method: 'POST', body: fd });
        const raw = await res.text();
        let data: ApiAdhocMealResponse;
        try {
          data = raw ? (JSON.parse(raw) as ApiAdhocMealResponse) : { ok: false, error: { message: '' } };
        } catch {
          setMealFlowError(
            res.status === 413
              ? 'Arquivo grande demais para o servidor.'
              : `Falha ao enviar (${res.status}). Tente de novo.`
          );
          return;
        }
        if (!data.ok) {
          const msg = typeof data.error?.message === 'string' ? data.error.message : 'Não foi possível analisar a foto.';
          setMealFlowError(msg);
          return;
        }
        const img = data.imageUrl ?? null;
        const userText = `Análise avulsa — ${MEAL_LABELS[mealType]}`;
        setShowMealTypeModal(false);
        revokePreview();
        setMedicoSelectedPatient(null);
        setMedicoMealAdhoc(false);
        setItems((prev) => [
          ...prev,
          { id: `u-meal-${Date.now()}`, role: 'user', content: userText, imageUrl: img },
          { id: `a-meal-${Date.now()}`, role: 'assistant', content: data.text, imageUrl: img },
        ]);
        return;
      }

      const fd = new FormData();
      fd.set('patientId', nutriPatientId.trim());
      fd.set('dateKey', nutriDateKey.trim());
      fd.set('mealType', mealType);
      fd.set('file', fileToSend);

      const res = await fetch('/api/chatnutri/meal', { method: 'POST', body: fd });
      const raw = await res.text();
      let data: ApiMealResponse;
      try {
        data = raw ? (JSON.parse(raw) as ApiMealResponse) : { ok: false, error: { code: 'EMPTY', message: '' } };
      } catch {
        if (res.status === 413) {
          setMealFlowError('Arquivo grande demais para o servidor. Tire a foto mais de perto ou use a galeria.');
        } else {
          setMealFlowError(
            res.ok
              ? 'Resposta inválida do servidor. Tente de novo.'
              : `Falha ao enviar (${res.status}). Tente de novo.`
          );
        }
        return;
      }

      if (!data.ok) {
        const msg = typeof data.error?.message === 'string' ? data.error.message : 'Não foi possível analisar a foto.';
        setMealFlowError(msg);
        return;
      }
      const img = data.message.imageUrl ?? null;
      const userText = `[${MEAL_LABELS[mealType]} de hoje]`;
      setShowMealTypeModal(false);
      revokePreview();
      setMedicoSelectedPatient(null);
      setMedicoMealAdhoc(false);
      setItems((prev) => [
        ...prev,
        { id: `u-meal-${Date.now()}`, role: 'user', content: userText, imageUrl: img },
        { id: `a-meal-${Date.now()}`, role: 'assistant', content: data.message.text, imageUrl: img },
      ]);
    } catch {
      setMealFlowError('Erro de conexão ao enviar a foto. Verifique a internet e tente de novo.');
    } finally {
      setUploadingMeal(false);
    }
  };

  const busy = loading || uploadingMeal;
  const posClass = floatPosition === 'left' ? 'left-4 sm:left-6' : 'right-4 sm:right-6';
  const raSkin = contextSurface === 'rafaela_public';

  const patientsList = chatNutriMedicoMeal?.patients ?? [];
  const canAssocNutri = patientsList.length > 0;

  const modals =
    mounted &&
    (showMealAssocModal ||
      showMealPatientPickModal ||
      showMealIntroModal ||
      showMealTypeModal) ? (
      <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/55 backdrop-blur-[2px]">
        {showMealAssocModal && (
          <div
            role="dialog"
            aria-modal
            aria-labelledby="meal-assoc-title"
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0d2a5a] shadow-2xl p-5 text-[#E8EDED]"
          >
            <h2 id="meal-assoc-title" className="text-base font-semibold text-[#E8EDED] mb-2">
              Associar ao ChatNutri?
            </h2>
            <p className="text-sm text-[#E8EDED]/85 leading-relaxed mb-4">
              {renderInlineBold(
                'Deseja **associar** esta análise ao histórico **ChatNutri** de um paciente **em tratamento**? Se escolher **Não**, a foto será analisada e o resultado aparece **só neste chat**, sem salvar no prontuário Nutri de ninguém.',
                { strongClassName: 'font-semibold text-[#E8EDED]' }
              )}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={!canAssocNutri}
                className="w-full rounded-xl bg-[#4CCB7A] text-[#0A1F44] py-3 text-sm font-semibold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => {
                  setMealFlowError(null);
                  if (!canAssocNutri) {
                    setMealFlowError('Não há pacientes em tratamento na lista. Use “Não” para análise avulsa no chat.');
                    return;
                  }
                  setShowMealAssocModal(false);
                  setShowMealPatientPickModal(true);
                  setMedicoMealAdhoc(false);
                }}
              >
                Sim, escolher paciente em tratamento
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-white/25 bg-white/10 py-3 text-sm font-medium text-[#E8EDED] hover:bg-white/15"
                onClick={() => {
                  setMealFlowError(null);
                  setMedicoMealAdhoc(true);
                  setMedicoSelectedPatient(null);
                  setShowMealAssocModal(false);
                  setShowMealIntroModal(true);
                }}
              >
                Não, só análise no chat
              </button>
              <button
                type="button"
                className="w-full py-2.5 text-sm text-[#E8EDED]/70 hover:text-[#E8EDED]"
                onClick={() => setShowMealAssocModal(false)}
              >
                Cancelar
              </button>
            </div>
            {!canAssocNutri && (
              <p className="mt-3 text-xs text-[#E8EDED]/60">Nenhum paciente em tratamento na sua lista no momento.</p>
            )}
            {mealFlowError && (
              <p className="mt-3 text-center text-xs text-amber-200" role="alert">
                {mealFlowError}
              </p>
            )}
          </div>
        )}

        {showMealPatientPickModal && (
          <div
            role="dialog"
            aria-modal
            aria-labelledby="meal-pick-title"
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0d2a5a] shadow-2xl p-5 text-[#E8EDED] max-h-[90vh] overflow-y-auto"
          >
            <h2 id="meal-pick-title" className="text-base font-semibold text-[#E8EDED] mb-3">
              Paciente em tratamento
            </h2>
            <p className="text-sm text-[#E8EDED]/75 mb-3">
              Escolha o paciente para registrar no ChatNutri do dia {chatNutriMedicoMeal?.dateKey}.
            </p>
            <label htmlFor="meal-patient-pick" className="block text-xs text-[#E8EDED]/65 mb-1">
              Paciente em tratamento
            </label>
            <select
              id="meal-patient-pick"
              value={mealPatientPickId}
              onChange={(e) => setMealPatientPickId(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#0A1F44]/80 text-[#E8EDED] px-3 py-2.5 text-sm mb-4"
            >
              <option value="">Selecione o paciente…</option>
              {patientsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!mealPatientPickId}
              className="w-full rounded-xl bg-[#4CCB7A] text-[#0A1F44] py-3 text-sm font-semibold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed mb-2"
              onClick={() => {
                const p = patientsList.find((x) => x.id === mealPatientPickId);
                if (!p) return;
                setMedicoSelectedPatient(p);
                setMedicoMealAdhoc(false);
                setShowMealPatientPickModal(false);
                setShowMealIntroModal(true);
              }}
            >
              Continuar
            </button>
            <button
              type="button"
              className="w-full py-2.5 text-sm text-[#E8EDED]/70 hover:text-[#E8EDED]"
              onClick={() => {
                setShowMealPatientPickModal(false);
                setShowMealAssocModal(true);
              }}
            >
              Voltar
            </button>
          </div>
        )}

        {showMealIntroModal && (
          <div
            role="dialog"
            aria-modal
            aria-labelledby="meal-intro-title"
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0d2a5a] shadow-2xl p-5 text-[#E8EDED]"
          >
            <h2 id="meal-intro-title" className="text-base font-semibold text-[#E8EDED] mb-2">
              Foto da refeição
            </h2>
            <p className="text-sm text-[#E8EDED]/85 leading-relaxed mb-4">
              Você pode tirar uma foto nítida do prato ou escolher uma imagem da galeria. Vamos estimar calorias e
              macronutrientes com IA — {introCopyNutriTarget()}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full rounded-xl bg-[#4CCB7A] text-[#0A1F44] py-3 text-sm font-semibold hover:opacity-95"
                onClick={() => fileGalleryRef.current?.click()}
              >
                Abrir galeria
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-white/25 bg-white/10 py-3 text-sm font-medium text-[#E8EDED] hover:bg-white/15"
                onClick={() => fileCameraRef.current?.click()}
              >
                Tirar foto
              </button>
              <button
                type="button"
                className="w-full py-2.5 text-sm text-[#E8EDED]/70 hover:text-[#E8EDED]"
                onClick={() => {
                  setShowMealIntroModal(false);
                  if (mealUploadMedico && medicoSelectedPatient && !medicoMealAdhoc) {
                    setShowMealPatientPickModal(true);
                  } else if (mealUploadMedico && !medicoMealAdhoc && !medicoSelectedPatient) {
                    setShowMealAssocModal(true);
                  }
                }}
              >
                Voltar
              </button>
            </div>
            {mealFlowError && (
              <p className="mt-3 text-center text-xs text-amber-200" role="alert">
                {mealFlowError}
              </p>
            )}
          </div>
        )}

        {showMealTypeModal && pendingMealFile && mealPreviewUrl && (
          <div
            role="dialog"
            aria-modal
            aria-labelledby="meal-type-title"
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0d2a5a] shadow-2xl p-5 text-[#E8EDED] max-h-[90vh] overflow-y-auto"
          >
            <h2 id="meal-type-title" className="text-base font-semibold text-[#E8EDED] mb-3">
              Qual é o tipo de refeição?
            </h2>
            <img
              src={mealPreviewUrl}
              alt=""
              className="w-full max-h-40 object-contain rounded-xl bg-black/20 mb-3"
            />
            <label className="block text-xs text-[#E8EDED]/65 mb-1">Refeição</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as ChatNutriMealType)}
              disabled={uploadingMeal}
              className="w-full rounded-xl border border-white/15 bg-[#0A1F44]/80 text-[#E8EDED] px-3 py-2.5 text-sm mb-4"
            >
              {MEAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {mealFlowError && (
              <p className="mb-3 text-center text-xs text-amber-200" role="alert">
                {mealFlowError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={uploadingMeal}
                className="flex-1 rounded-xl border border-white/25 py-2.5 text-sm text-[#E8EDED] hover:bg-white/10 disabled:opacity-50"
                onClick={backFromMealTypeToIntro}
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={uploadingMeal}
                className="flex-1 rounded-xl bg-[#4CCB7A] py-2.5 text-sm font-semibold text-[#0A1F44] hover:opacity-95 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                onClick={() => void submitMealAnalysis()}
              >
                {uploadingMeal ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando…
                  </>
                ) : (
                  'Analisar foto'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    ) : null;

  const shell = (
    <div
      className={`fixed z-[200] flex flex-col gap-2 ${posClass} bottom-[calc(1rem+1cm)] md:bottom-[calc(1rem+2cm)] ${className}`}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            raSkin
              ? 'h-14 w-14 rounded-full bg-[#4099B3] text-white shadow-lg flex items-center justify-center hover:bg-[#2F7F96] focus:outline-none focus:ring-2 focus:ring-[#4099B3]/45'
              : 'h-14 w-14 rounded-full bg-[#4CCB7A] text-[#0A1F44] shadow-lg flex items-center justify-center hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/50'
          }
          aria-label={raSkin ? 'Abrir chat de dúvidas jurídicas' : 'Abrir assistente Oftware'}
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      ) : (
        <div
          className={
            raSkin
              ? 'flex flex-col w-[min(100vw-2rem,22rem)] max-h-[min(32rem,calc(100dvh-6rem))] rounded-2xl border border-[#E9E7E7] bg-white shadow-2xl text-[#4E4B4C] overflow-hidden'
              : 'flex flex-col w-[min(100vw-2rem,22rem)] max-h-[min(32rem,calc(100dvh-6rem))] rounded-2xl border border-white/15 bg-[#0d2a5a] shadow-2xl text-[#E8EDED] overflow-hidden'
          }
        >
          <div
            className={
              raSkin
                ? 'flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-[#E9E7E7] bg-[#EAF5F8]'
                : 'flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-[#0A1F44]/90'
            }
          >
            <MessageCircle className={`w-5 h-5 flex-shrink-0 ${raSkin ? 'text-[#4099B3]' : 'text-[#4CCB7A]'}`} />
            <span className={`text-sm font-semibold ${raSkin ? 'text-[#2F2D2E]' : ''}`}>
              {raSkin ? 'Dúvidas jurídicas' : 'Assistente Oftware'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={
                raSkin
                  ? 'ml-auto p-1 rounded-lg hover:bg-[#CFE7EE]/80 text-[#656263]'
                  : 'ml-auto p-1 rounded-lg hover:bg-white/10 text-[#E8EDED]'
              }
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {open && raSkin && whatsappHref && rafaelaLeadDone ? (
            <div className="flex-shrink-0 px-3 pb-2 pt-1 border-b border-[#CFE7EE] bg-gradient-to-b from-[#ecfdf5] to-[#EAF5F8]">
              <a
                href={whatsappHref}
                onClick={onWhatsAppRafaelaClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-3 text-sm font-bold text-white shadow-md ring-2 ring-[#25D366]/40 transition-transform hover:bg-[#20bd5a] active:scale-[0.99]"
              >
                <WhatsAppGlyphSmall className="h-5 w-5 shrink-0" />
                Conversa WhatsApp
              </a>
              <p className="mt-1.5 text-center text-[11px] leading-snug text-[#4E4B4C]">
                Fale com a <span className="font-semibold text-[#2F2D2E]">Dra. Rafaela Albuquerque</span> para análise
                do seu caso
              </p>
            </div>
          ) : null}
          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3 overscroll-contain">
            {items.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[min(100%,18rem)] rounded-xl px-3 py-2 text-sm break-words ${
                    m.role === 'user'
                      ? raSkin
                        ? 'bg-[#4099B3] text-white'
                        : 'bg-[#4CCB7A] text-[#0A1F44]'
                      : raSkin
                        ? 'bg-[#F7F7F7] text-[#4E4B4C] border border-[#E9E7E7]'
                        : 'bg-white/10 text-[#E8EDED] border border-white/10'
                  }`}
                >
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt="" className="rounded-lg max-h-40 w-full object-contain mb-1.5 bg-black/20" />
                  ) : null}
                  <div className="whitespace-pre-wrap">
                    {m.role === 'assistant' ? renderInlineBold(m.content) : m.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className={
                    raSkin
                      ? 'inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-[#F7F7F7] border border-[#E9E7E7] text-sm text-[#4E4B4C]'
                      : 'inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/10 text-sm'
                  }
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pensando…
                </div>
              </div>
            )}
          </div>
          <div
            className={
              raSkin
                ? 'flex-shrink-0 border-t border-[#E9E7E7] p-3 space-y-2 bg-[#F7F7F7]'
                : 'flex-shrink-0 border-t border-white/10 p-3 space-y-2 bg-[#0A1F44]/50'
            }
          >
            {raSkin && !rafaelaLeadDone ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#656263]">Identificação (obrigatório)</p>
                <input
                  type="text"
                  value={leadNameInput}
                  onChange={(e) => setLeadNameInput(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  className="w-full rounded-xl border border-[#E9E7E7] bg-white text-[#2F2D2E] placeholder:text-[#8A8788] px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  value={leadPhoneInput}
                  onChange={(e) => setLeadPhoneInput(e.target.value)}
                  placeholder="WhatsApp com DDD"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-[#E9E7E7] bg-white text-[#2F2D2E] placeholder:text-[#8A8788] px-3 py-2 text-sm"
                />
                {leadFormError ? (
                  <p className="text-xs text-amber-700" role="alert">
                    {leadFormError}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => submitRafaelaLead()}
                  className="w-full rounded-xl bg-[#4099B3] py-2.5 text-sm font-semibold text-white hover:bg-[#2F7F96]"
                >
                  Começar conversa
                </button>
              </div>
            ) : null}
            <input ref={fileGalleryRef} type="file" accept="image/*" className="hidden" onChange={onGalleryChange} />
            <input
              ref={fileCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onCameraChange}
            />
            <div className={`flex gap-2 min-w-0 items-center ${raSkin && !rafaelaLeadDone ? 'hidden' : ''}`}>
              {mealUploadEnabled && (
                <button
                  type="button"
                  onClick={openMealFlow}
                  disabled={busy}
                  className={
                    raSkin
                      ? 'flex-shrink-0 inline-flex items-center justify-center p-2.5 rounded-xl border border-[#C9C6C7] bg-white text-[#656263] hover:bg-[#EAF5F8] disabled:opacity-50'
                      : 'flex-shrink-0 inline-flex items-center justify-center p-2.5 rounded-xl border border-white/20 bg-white/10 text-[#E8EDED] hover:bg-white/15 disabled:opacity-50'
                  }
                  aria-label="Foto da refeição"
                  title="Foto da refeição"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                disabled={busy}
                placeholder="Escreva sua mensagem…"
                className={
                  raSkin
                    ? 'flex-1 min-w-0 rounded-xl border border-[#E9E7E7] bg-white text-[#2F2D2E] placeholder:text-[#8A8788] px-3 py-2 text-sm'
                    : 'flex-1 min-w-0 rounded-xl border border-white/15 bg-[#0A1F44]/80 text-[#E8EDED] placeholder:text-[#E8EDED]/45 px-3 py-2 text-sm'
                }
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                className={
                  raSkin
                    ? 'flex-shrink-0 inline-flex items-center justify-center p-2.5 rounded-xl bg-[#4099B3] text-white hover:bg-[#2F7F96] disabled:opacity-50'
                    : 'flex-shrink-0 inline-flex items-center justify-center p-2.5 rounded-xl bg-[#4CCB7A] text-[#0A1F44] hover:opacity-95 disabled:opacity-50'
                }
                aria-label="Enviar"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <p className={`text-xs ${raSkin ? 'text-amber-700' : 'text-amber-200'}`} role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {mounted && modals ? createPortal(modals, document.body) : null}
      {shell}
    </>
  );
}
