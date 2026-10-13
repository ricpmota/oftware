'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  Loader2,
  MapPin,
  Pencil,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { AvaliacaoAtividadeFisicaQuestionnaire } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaQuestionnaire';
import { PatientAnamneseSummary } from '@/components/personal/patient/PatientAnamneseSummary';
import { buildPhysicalActivityAssessmentSummary } from '@/lib/avaliacaoAtividadeFisica/buildAssessmentSummary';
import { buildSafetyAssessment } from '@/lib/avaliacaoAtividadeFisica/buildSafetyAssessment';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import type {
  AvaliacaoAtividadeFisica,
  AvaliacaoAtividadeFisicaSummary,
} from '@/types/avaliacaoAtividadeFisica';

export type PersonalVinculadoPerfil = {
  id: string;
  nome: string;
  isVerificado?: boolean;
  fotoPerfilUrl?: string | null;
  instagramUsuario?: string;
  telefone?: string;
  telefoneDdi?: string;
  registroNumero?: string;
  cidades?: { estado: string; cidade: string }[];
  nomeLocal?: string;
  endereco?: string;
  numero?: string;
};

type PersonalPatientHeaderActionsProps = {
  photoUrl?: string | null;
  personal: PersonalVinculadoPerfil | null;
  rating?: { count: number; media: number } | null;
  patientId?: string | null;
  userId?: string | null;
  patientName?: string | null;
  onClose: () => void;
  onOpenSettings: () => void;
};

function resolveSummary(assessment: AvaliacaoAtividadeFisica): AvaliacaoAtividadeFisicaSummary {
  const answers = assessment.answers || {};
  const safety = buildSafetyAssessment(answers);
  return buildPhysicalActivityAssessmentSummary(answers, safety);
}

function instagramHref(usuario?: string): string | null {
  const handle = (usuario || '').trim().replace(/^@/, '');
  if (!handle) return null;
  return `https://instagram.com/${encodeURIComponent(handle)}`;
}

function formatPhone(personal: PersonalVinculadoPerfil): string {
  const tel = (personal.telefone || '').trim();
  if (!tel) return '';
  const ddi = (personal.telefoneDdi || '').replace(/\D/g, '');
  return ddi ? `+${ddi} ${tel}` : tel;
}

export function PersonalPatientHeaderActions({
  photoUrl,
  personal,
  rating,
  patientId,
  userId,
  patientName,
  onClose,
  onOpenSettings,
}: PersonalPatientHeaderActionsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [anamneseOpen, setAnamneseOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [menuOpen]);

  return (
    <div ref={rootRef} className="relative mt-0.5 flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/25"
        aria-label="Abrir menu da conta"
        aria-expanded={menuOpen}
        title="Conta"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-5 w-5 text-white" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/15"
        aria-label="Fechar e voltar ao Home"
        title="Fechar"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#071833] py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.65)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setPersonalOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm font-medium text-[#E8EDED] hover:bg-white/10"
            >
              <Dumbbell className="h-4 w-4 text-[#4CCB7A]" aria-hidden />
              Meu Personal
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setAnamneseOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm font-medium text-[#E8EDED] hover:bg-white/10"
            >
              <ClipboardList className="h-4 w-4 text-[#4CCB7A]" aria-hidden />
              Minha Anamnese
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm font-medium text-[#E8EDED] hover:bg-white/10"
            >
              <Settings className="h-4 w-4 text-[#4CCB7A]" aria-hidden />
              Configurações
            </button>
          </div>
      )}

      {portalReady && personalOpen &&
        createPortal(
          <PersonalProfileModal
            personal={personal}
            rating={rating}
            onClose={() => setPersonalOpen(false)}
          />,
          document.body
        )}

      {portalReady && anamneseOpen &&
        createPortal(
          <AnamneseModal
            patientId={patientId}
            userId={userId}
            patientName={patientName}
            onClose={() => setAnamneseOpen(false)}
          />,
          document.body
        )}
    </div>
  );
}

function PersonalProfileModal({
  personal,
  rating,
  onClose,
}: {
  personal: PersonalVinculadoPerfil | null;
  rating?: { count: number; media: number } | null;
  onClose: () => void;
}) {
  const ig = instagramHref(personal?.instagramUsuario);
  const phone = personal ? formatPhone(personal) : '';
  const cidades = (personal?.cidades || [])
    .map((c) => [c.cidade, c.estado].filter(Boolean).join(' - '))
    .filter(Boolean);
  const endereco = [personal?.endereco, personal?.numero].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-[240] flex items-end justify-center bg-black/55 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meu-personal-titulo"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#071833] text-[#E8EDED] shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#E8EDED]/45">Meu Personal</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!personal ? (
          <p className="px-6 pb-10 pt-6 text-center text-sm text-[#E8EDED]/70">
            Nenhum personal vinculado no momento.
          </p>
        ) : (
          <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 h-28 w-28 overflow-hidden rounded-full bg-white/10 ring-2 ring-[#4CCB7A]/70 shadow-[0_0_24px_rgba(76,203,122,0.28)]">
                {personal.fotoPerfilUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={personal.fotoPerfilUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserRound className="h-12 w-12 text-white/70" aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <h2 id="meu-personal-titulo" className="text-xl font-bold text-white">
                  {personal.nome}
                </h2>
                {personal.isVerificado ? (
                  <ShieldCheck className="h-5 w-5 text-[#4CCB7A]" aria-label="Verificado" />
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-[#E8EDED]/55">Personal trainer</p>
              {rating && rating.count > 0 ? (
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={
                        star <= Math.round(rating.media)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-white/25'
                      }
                    />
                  ))}
                  <span className="ml-1 text-xs tabular-nums text-[#E8EDED]/60">
                    {rating.media.toFixed(1)} ({rating.count})
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#E8EDED]/45">Seu personal compartilhado</p>
              )}
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {personal.registroNumero ? (
                <p className="rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10">
                  <span className="block text-[10px] uppercase tracking-wider text-[#E8EDED]/40">Registro</span>
                  <span className="font-medium text-white">{personal.registroNumero}</span>
                </p>
              ) : null}
              {ig ? (
                <a
                  href={ig}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10 text-[#4CCB7A]"
                >
                  <span className="block text-[10px] uppercase tracking-wider text-[#E8EDED]/40">Instagram</span>
                  @{personal.instagramUsuario?.trim().replace(/^@/, '')}
                </a>
              ) : null}
              {phone ? (
                <p className="rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10">
                  <span className="block text-[10px] uppercase tracking-wider text-[#E8EDED]/40">Telefone</span>
                  <span className="font-medium text-white">{phone}</span>
                </p>
              ) : null}
              {(personal.nomeLocal || endereco || cidades.length > 0) && (
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10">
                  <span className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#E8EDED]/40">
                    <MapPin className="h-3 w-3" aria-hidden />
                    Atendimento
                  </span>
                  {personal.nomeLocal ? <p className="font-medium text-white">{personal.nomeLocal}</p> : null}
                  {endereco ? <p className="text-[#E8EDED]/75">{endereco}</p> : null}
                  {cidades.length > 0 ? <p className="text-[#E8EDED]/75">{cidades.join(' · ')}</p> : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnamneseModal({
  patientId,
  userId,
  patientName,
  onClose,
}: {
  patientId?: string | null;
  userId?: string | null;
  patientName?: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AvaliacaoAtividadeFisica | null>(null);
  const [editing, setEditing] = useState(false);

  const reload = useCallback(async () => {
    if (!patientId) {
      setAssessment(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const doc = await avaliacaoAtividadeFisicaService.getByPatientId(patientId);
      setAssessment(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar a anamnese.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const summary = useMemo(
    () => (assessment ? resolveSummary(assessment) : null),
    [assessment]
  );
  const hasAnswers = Boolean(assessment && Object.keys(assessment.answers || {}).length > 0);

  const editAssessment = assessment
    ? assessment.status === 'completed'
      ? { ...assessment, status: 'needs_review' as const, currentStep: 'final_review' }
      : assessment
    : null;

  if (editing && patientId && userId) {
    return (
      <div className="fixed inset-0 z-[240] overflow-y-auto bg-slate-50">
        <AvaliacaoAtividadeFisicaQuestionnaire
          patientId={patientId}
          userId={userId}
          patientFullName={patientName}
          initialAssessment={editAssessment}
          onAssessmentComplete={() => {
            setEditing(false);
            void reload();
          }}
          onDefer={() => {
            setEditing(false);
            void reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[240] flex flex-col bg-black/55" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="minha-anamnese-titulo"
        className="mt-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#091D3C] text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#315072] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[#4DDA91]">AVALIAÇÃO FÍSICA</p>
            <h2 id="minha-anamnese-titulo" className="mt-0.5 text-base font-semibold text-white">
              Minha Anamnese
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-[#9FB4CF]">
              Respostas compartilhadas com seu personal
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#315072] bg-[#1B3658] text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-[#4DDA91]" />
            </div>
          ) : error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">{error}</p>
          ) : !hasAnswers || !summary ? (
            <div className="space-y-4 py-6 text-center">
              <p className="text-sm text-[#9FB4CF]">Você ainda não preencheu a anamnese do treino.</p>
              {patientId && userId ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-xl bg-[#4DDA91] px-4 py-3 text-sm font-semibold text-[#091D3C]"
                >
                  Preencher anamnese
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-[20px] border border-[#315072] bg-[#11294B] px-3.5 py-3">
                {assessment?.status === 'completed' ? (
                  <ClipboardCheck className="h-5 w-5 shrink-0 text-[#4DDA91]" aria-hidden />
                ) : null}
                <div className="min-w-0 flex-1">
                  {assessment?.status === 'completed' ? (
                    <p className="text-sm font-semibold text-white">Avaliação preenchida</p>
                  ) : null}
                  <p className="text-xs text-[#9FB4CF]">Informações do seu perfil físico</p>
                </div>
                {patientId && userId ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#315072] bg-[#1B3658] text-[#9FB4CF]"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <PatientAnamneseSummary summary={summary} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
