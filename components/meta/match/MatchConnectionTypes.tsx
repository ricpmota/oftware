import { Leaf, PersonStanding, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const PILLARS: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Atividades', icon: PersonStanding },
  { label: 'Conexões', icon: Users },
  { label: 'Experiências', icon: Sparkles },
  { label: 'Bem-estar', icon: Leaf },
];

export function MatchConnectionTypes() {
  return (
    <div className="grid grid-cols-4 gap-1">
      {PILLARS.map(({ label, icon: Icon }) => (
        <div key={label} className="flex flex-col items-center gap-1.5">
          <Icon className="h-5 w-5 text-[#4CCB7A]" strokeWidth={2} aria-hidden="true" />
          <span className="text-center text-[10px] font-semibold leading-tight tracking-tight text-white">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
