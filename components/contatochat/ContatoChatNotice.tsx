type Props = {
  spokenName: string;
  accentColor: string;
  pageBg: string;
};

export default function ContatoChatNotice({ spokenName, accentColor, pageBg }: Props) {
  return (
    <aside className="drprov-rise rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm sm:px-5">
      <p
        className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ backgroundColor: pageBg, color: accentColor }}
      >
        Importante
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-900">
        Este é um canal de notificações e atualizações.
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
        Para falar diretamente com {spokenName}, continue utilizando o canal de contato que já foi
        orientado para você.
      </p>
    </aside>
  );
}
