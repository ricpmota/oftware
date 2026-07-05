'use client';

import Link from 'next/link';
import {
  Activity,
  Brain,
  ChevronRight,
  FlaskConical,
  MessageSquare,
  Pill,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type PatrimonioModule = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  menuId?: string;
  accent?: string;
};

const PATRIMONIO_MODULES: PatrimonioModule[] = [
  {
    id: 'chatinicial',
    label: 'Chat Inicial',
    description: 'Preview e evolução do fluxo conversacional inicial do paciente.',
    icon: MessageSquare,
    href: '/metaadmingeral/chatinicial',
  },
  {
    id: 'exames-laboratoriais',
    label: 'Exames Laboratoriais',
    description: 'Catálogo global de exames e referências laboratoriais.',
    icon: FlaskConical,
    menuId: 'exames-laboratoriais',
  },
  {
    id: 'protocolos-prescricao',
    label: 'Prescrições',
    description: 'Protocolos e prescrições do patrimônio global da plataforma.',
    icon: Pill,
    menuId: 'protocolos-prescricao',
  },
  {
    id: 'bio-impedancia',
    label: 'Bio Impedância',
    description: 'Referências e configuração de bioimpedância corporal.',
    icon: Activity,
    menuId: 'bio-impedancia',
  },
  {
    id: 'oi-validation',
    label: '🧠 OI Validation',
    description: 'Monitoramento da qualidade e evolução do modelo estatístico OI.',
    icon: Brain,
    href: '/metaadmingeral/oi-validation',
  },
];

type PlatformPatrimonioHubPanelProps = {
  onNavigate: (menuId: string) => void;
};

function ModuleCard({
  module,
  onNavigate,
}: {
  module: PatrimonioModule;
  onNavigate: (menuId: string) => void;
}) {
  const Icon = module.icon;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4CCB7A]/15 text-[#4CCB7A]">
          {module.accent ? (
            <span className="text-lg leading-none" aria-hidden>
              {module.accent}
            </span>
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#E8EDED]/30 transition-transform group-hover:translate-x-0.5 group-hover:text-[#4CCB7A]/70" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#E8EDED]">{module.label}</h3>
      <p className="mt-1.5 text-sm text-[#E8EDED]/60 leading-relaxed">{module.description}</p>
    </>
  );

  const className =
    'group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-colors hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5';

  if (module.href) {
    return (
      <Link href={module.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => module.menuId && onNavigate(module.menuId)} className={className}>
      {content}
    </button>
  );
}

export default function PlatformPatrimonioHubPanel({ onNavigate }: PlatformPatrimonioHubPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#E8EDED]">Patrimônio Global</h2>
        <p className="mt-1 text-sm text-[#E8EDED]/60 max-w-2xl">
          Recursos compartilhados por todas as organizações — protocolos, exames, chat inicial e modelos
          estatísticos da Oftware.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PATRIMONIO_MODULES.map((module) => (
          <ModuleCard key={module.id} module={module} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
