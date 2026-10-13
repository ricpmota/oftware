'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { healthEmoji, healthLabel } from '@/lib/automation/opsHealthRules';
import type { AutomationOpsHealth } from '@/types/automationOps';

export function OpsPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#E8EDED]">{title}</h1>
      <p className="mt-1 text-sm text-[#E8EDED]/60">{subtitle}</p>
    </div>
  );
}

export function OpsHealthBadge({ status }: { status: AutomationOpsHealth }) {
  const tone =
    status === 'healthy' ? 'bg-[#4CCB7A]/15 text-[#4CCB7A] border-[#4CCB7A]/30'
    : status === 'warning' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-red-500/15 text-red-300 border-red-500/30';

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${tone}`}>
      <span>{healthEmoji(status)}</span>
      {healthLabel(status)}
    </span>
  );
}

export function OpsMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: 'default' | 'warn' | 'ok' | 'critical';
}) {
  const valueClass =
    tone === 'warn' ? 'text-amber-300'
    : tone === 'ok' ? 'text-[#4CCB7A]'
    : tone === 'critical' ? 'text-red-300'
    : 'text-[#E8EDED]';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-[#E8EDED]/55">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-3 text-2xl font-bold ${valueClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#E8EDED]/50">{hint}</p> : null}
    </div>
  );
}

export function OpsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/45">{title}</h2>
      {children}
    </section>
  );
}

export function OpsPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function OpsEngineBadge({ engine }: { engine: string }) {
  const tone =
    engine === 'queue' ? 'bg-[#4CCB7A]/15 text-[#4CCB7A]'
    : engine === 'shadow' ? 'bg-sky-500/15 text-sky-300'
    : 'bg-white/10 text-[#E8EDED]/70';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {engine}
    </span>
  );
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}min`;
}

export function formatMinutes(m: number | null | undefined): string {
  if (m == null) return '—';
  if (m < 60) return `${m.toFixed(1)} min`;
  return `${(m / 60).toFixed(1)} h`;
}

export function formatRate(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n.toFixed(2)}/min`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return iso;
  }
}

export const OPS_CHANNEL_TABS = [
  { id: 'email', label: 'E-mail', active: true },
  { id: 'whatsapp', label: 'WhatsApp', active: true },
  { id: 'push', label: 'Push', active: false },
  { id: 'sms', label: 'SMS', active: false },
  { id: 'ia', label: 'IA', active: false },
  { id: 'webhooks', label: 'Webhooks', active: false },
] as const;

export type OpsChannelTabId = (typeof OPS_CHANNEL_TABS)[number]['id'];
