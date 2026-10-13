'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  Loader2,
  Mail,
  Phone,
  Stethoscope,
  UserPlus,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import SolicitacaoAnamneseProgressBar from '@/components/metaadmin/SolicitacaoAnamneseProgressBar';
import { formatSolicitacaoPhoneDisplay } from '@/lib/whatsapp/resolveIndicacaoSolicitacaoPhone';

export type SolicitacaoPacienteCarouselChip = {
  id: string;
  label: string;
  variant?: 'blue' | 'amber' | 'emerald' | 'slate';
  icon?: 'nutri' | 'personal' | 'indicador' | 'medico';
};

export type SolicitacaoPacienteCarouselItem = {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  telefoneDdi?: string;
  telefonePais?: string;
  criadoEm?: Date | null;
  cadastroIncompleto?: boolean;
  chips?: SolicitacaoPacienteCarouselChip[];
  anamnesePacienteId?: string;
  anamnesePacienteEmail?: string;
};

type Props = {
  items: SolicitacaoPacienteCarouselItem[];
  aceitandoId?: string | null;
  onAceitar: (id: string) => void;
  onRejeitar: (id: string) => void;
  rejectLabel?: string;
};

function formatTelefone(telefone: string) {
  const digits = telefone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return telefone;
}

function iniciais(nome?: string, email?: string) {
  return (nome || email || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

const CHIP_STYLES: Record<NonNullable<SolicitacaoPacienteCarouselChip['variant']>, string> = {
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  slate: 'bg-slate-100 text-slate-700',
};

function ChipIcon({ icon }: { icon?: SolicitacaoPacienteCarouselChip['icon'] }) {
  if (icon === 'nutri') return <UtensilsCrossed size={9} />;
  if (icon === 'personal') return <Dumbbell size={9} />;
  if (icon === 'indicador') return <UserPlus size={9} />;
  if (icon === 'medico') return <Stethoscope size={9} />;
  return null;
}

export default function SolicitacoesPacientesCarousel({
  items,
  aceitandoId = null,
  onAceitar,
  onRejeitar,
  rejectLabel = 'Recusar',
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-solicitacao-card]'));
    if (cards.length === 0) return;

    const scrollLeft = el.scrollLeft;
    let closest = 0;
    let closestDist = Infinity;
    cards.forEach((card, index) => {
      const dist = Math.abs(card.offsetLeft - scrollLeft);
      if (dist < closestDist) {
        closestDist = dist;
        closest = index;
      }
    });
    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateActiveFromScroll();
    el.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    window.addEventListener('resize', updateActiveFromScroll);
    return () => {
      el.removeEventListener('scroll', updateActiveFromScroll);
      window.removeEventListener('resize', updateActiveFromScroll);
    };
  }, [items.length, updateActiveFromScroll]);

  const scrollToIndex = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelectorAll<HTMLElement>('[data-solicitacao-card]')[index];
    if (!card) return;
    el.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <div
        ref={scrollerRef}
        className="flex gap-2.5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div
            key={item.id}
            data-solicitacao-card
            className="snap-start flex-shrink-0 w-[min(240px,82%)] sm:w-[calc((100%-0.625rem)/2)] md:w-[calc((100%-1.25rem)/3)] lg:w-[calc((100%-2.5rem)/5)] rounded-lg border border-gray-200 bg-gray-50/80 p-3 relative overflow-hidden"
          >
            {(item.anamnesePacienteId || item.anamnesePacienteEmail) && (
              <SolicitacaoAnamneseProgressBar
                pacienteId={item.anamnesePacienteId}
                pacienteEmail={item.anamnesePacienteEmail}
              />
            )}
            {aceitandoId === item.id && (
              <div
                className="absolute inset-0 z-10 bg-white/75 flex flex-col items-center justify-center gap-1.5"
                aria-live="polite"
                aria-busy="true"
              >
                <Loader2 size={20} className="animate-spin text-emerald-700" />
                <span className="text-[11px] font-medium text-emerald-800">Aceitando...</span>
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[11px] font-semibold border border-emerald-100"
                aria-hidden
              >
                {iniciais(item.nome, item.email)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1.5">
                  <h4 className="text-sm font-medium text-gray-900 truncate leading-tight">{item.nome}</h4>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 whitespace-nowrap flex-shrink-0">
                    <Clock size={10} />
                    Aguarda
                  </span>
                </div>
                {item.cadastroIncompleto && (
                  <p className="text-[10px] text-slate-500 mt-0.5">Cadastro incompleto</p>
                )}
              </div>
            </div>

            <div className="mt-2 space-y-1 text-[11px] text-gray-500">
              {item.email && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Mail size={11} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate" title={item.email}>
                    {item.email}
                  </span>
                </div>
              )}
              {item.telefone && (
                <div className="flex items-center gap-1.5">
                  <Phone size={11} className="text-gray-400 flex-shrink-0" />
                  <span>
                    {formatSolicitacaoPhoneDisplay({
                      pacienteTelefone: item.telefone,
                      pacienteTelefoneDdi: item.telefoneDdi,
                      pacienteTelefonePais: item.telefonePais,
                    }) || formatTelefone(item.telefone)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar size={11} className="text-gray-400 flex-shrink-0" />
                <span>
                  {item.criadoEm?.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  }) || '-'}
                </span>
              </div>
            </div>

            {item.chips && item.chips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.chips.map((chip) => (
                  <span
                    key={chip.id}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded ${
                      CHIP_STYLES[chip.variant || 'slate']
                    }`}
                  >
                    <ChipIcon icon={chip.icon} />
                    {chip.label}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2.5 flex items-center gap-1.5">
              <button
                type="button"
                disabled={aceitandoId === item.id}
                onClick={() => onRejeitar(item.id)}
                className="flex-1 px-2 py-1.5 text-[11px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={12} />
                {rejectLabel}
              </button>
              <button
                type="button"
                disabled={!!aceitandoId}
                onClick={() => onAceitar(item.id)}
                className="flex-1 px-2 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200/80 transition-colors flex items-center justify-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {aceitandoId === item.id ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Aceitando
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={12} />
                    Aceitar
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5" role="tablist" aria-label="Solicitações">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`Ir para solicitação ${index + 1}`}
              onClick={() => scrollToIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                activeIndex === index ? 'w-4 bg-gray-500' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
