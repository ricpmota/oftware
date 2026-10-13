import { CalendarCheck, MessageCircle, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CARDS: Array<{ title: string; body: string; icon: LucideIcon }> = [
  {
    title: 'Pessoas reais',
    body: 'Conecte-se com quem também busca uma vida mais ativa.',
    icon: Users,
  },
  {
    title: 'Eventos e grupos',
    body: 'Atividades ao ar livre, treinos e encontros.',
    icon: CalendarCheck,
  },
  {
    title: 'Troca de experiências',
    body: 'Inspiração, companhia e novas conexões.',
    icon: MessageCircle,
  },
];

export function MatchCommunityCards() {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Destaques do Match Saudável">
      {CARDS.map(({ title, body, icon: Icon }) => (
        <article
          key={title}
          className="rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 backdrop-blur-md"
        >
          <Icon className="h-4 w-4 text-[#4CCB7A]" strokeWidth={2} aria-hidden="true" />
          <h2 className="mt-1.5 text-[11px] font-bold leading-tight tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-1 text-[10px] leading-snug text-white/70">{body}</p>
        </article>
      ))}
    </div>
  );
}
