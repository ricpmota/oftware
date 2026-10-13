import type { ReactNode } from 'react';

export function DisparosSectionTitle({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[#E8EDED]">{title}</h3>
      {hint ? <p className="mt-1 text-sm text-[#E8EDED]/60">{hint}</p> : null}
    </div>
  );
}

export function DisparosBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'warn' | 'danger' | 'muted' | 'info';
}) {
  const className =
    tone === 'success'
      ? 'bg-[#4CCB7A]/15 text-[#4CCB7A]'
      : tone === 'warn'
        ? 'bg-amber-500/15 text-amber-200'
        : tone === 'danger'
          ? 'bg-rose-500/15 text-rose-200'
          : tone === 'info'
            ? 'bg-sky-500/15 text-sky-200'
            : 'bg-white/10 text-[#E8EDED]/55';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function DisparosStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#E8EDED]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#E8EDED]/45">{hint}</p> : null}
    </div>
  );
}

export function DisparosSoftCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  );
}
