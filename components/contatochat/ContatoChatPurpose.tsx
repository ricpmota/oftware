type Props = {
  pageBg: string;
};

const ITEMS = [
  { icon: '🔔', title: 'Notificações importantes' },
  { icon: '✨', title: 'Novidades do seu acompanhamento' },
  { icon: '📋', title: 'Atualizações e orientações' },
] as const;

export default function ContatoChatPurpose({ pageBg }: Props) {
  return (
    <section className="drprov-rise rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm sm:px-5">
      <h2 className="text-[15px] font-bold tracking-tight text-gray-900">
        Para que serve <span style={{ color: pageBg }}>este contato?</span>
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
        Este número é usado para enviarmos notificações, novidades e atualizações relacionadas ao
        seu acompanhamento.
      </p>
      <ul className="mt-4 space-y-2.5">
        {ITEMS.map((item) => (
          <li key={item.title} className="flex items-center gap-2.5 text-[13px] text-gray-900">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-sm">
              {item.icon}
            </span>
            {item.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
