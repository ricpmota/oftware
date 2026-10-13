'use client';

type Props = {
  professionalName: string;
  roleLabel: 'médico' | 'nutricionista';
  whatsappUrl: string | null;
  onEncerrar?: () => void;
};

export default function AgendaSemHorarioWhatsApp({
  professionalName,
  roleLabel,
  whatsappUrl,
  onEncerrar,
}: Props) {
  const nome = professionalName.trim() || (roleLabel === 'médico' ? 'seu médico' : 'sua nutricionista');

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-5 text-center space-y-3">
      <p className="text-sm font-semibold text-slate-800">Nenhum horário disponível</p>
      <p className="text-sm text-slate-600 leading-relaxed">
        A agenda de {nome} não tem horários livres no momento. Encerre por aqui e fale direto no
        WhatsApp {roleLabel === 'médico' ? 'do médico' : 'da nutricionista'}.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe57]"
          >
            Falar no WhatsApp
          </a>
        ) : (
          <p className="text-xs text-slate-500">WhatsApp ainda não cadastrado para este profissional.</p>
        )}
        {onEncerrar ? (
          <button
            type="button"
            onClick={onEncerrar}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Encerrar
          </button>
        ) : null}
      </div>
    </div>
  );
}
