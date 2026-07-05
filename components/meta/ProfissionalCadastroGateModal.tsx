'use client';

type Props = {
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
  tipo: 'nutri' | 'personal' | 'medico';
};

export default function ProfissionalCadastroGateModal({
  loading = false,
  onConfirm,
  onDecline,
  tipo,
}: Props) {
  const pergunta =
    tipo === 'nutri'
      ? 'Voce e Nutricionista?'
      : tipo === 'medico'
        ? 'Voce e Medico?'
        : 'Voce e Personal Trainer?';
  const descricao =
    tipo === 'nutri'
      ? 'Se voce atua como nutricionista, vamos continuar com o seu cadastro e abrir o chat de verificacao.'
      : tipo === 'medico'
        ? 'Se voce atua como medico, vamos continuar com o seu cadastro e abrir o chat de verificacao.'
        : 'Se voce atua como personal trainer, vamos continuar com o seu cadastro e abrir o chat de verificacao.';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="profissional-cadastro-gate-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-6 text-[#E8EDED] shadow-2xl">
        <p
          id="profissional-cadastro-gate-title"
          className="text-xl font-bold leading-tight text-[#E8EDED]"
        >
          {pergunta}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#E8EDED]/75">{descricao}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#4CCB7A] px-4 py-3 text-sm font-semibold text-[#0A1F44] transition-colors hover:bg-[#45b86d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Continuando...' : 'Sim'}
          </button>
          <button
            type="button"
            onClick={() => void onDecline()}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-[#E8EDED] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Nao
          </button>
        </div>
      </div>
    </div>
  );
}
