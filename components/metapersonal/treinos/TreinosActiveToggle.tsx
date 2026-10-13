'use client';

type Props = {
  state: 'on' | 'off' | 'mixed';
  tooltip?: string;
  disabled?: boolean;
  onClick: () => void;
};

export function TreinosActiveToggle({ state, tooltip, disabled, onClick }: Props) {
  const pressed = state === 'on';
  const ariaLabel =
    tooltip || (pressed ? 'Desativar treino' : state === 'off' ? 'Ativar treino' : 'Alterar status do treino');
  return (
    <button
      type="button"
      role="switch"
      aria-checked={state === 'mixed' ? 'mixed' : pressed}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center rounded-md p-0.5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${
          state === 'on' ? 'bg-emerald-500' : state === 'mixed' ? 'bg-amber-400' : 'bg-gray-300'
        }`}
      >
        <span
          className={`pointer-events-none mt-0.5 inline-block h-3 w-3 rounded-full bg-white shadow transition ${
            state === 'off' ? 'translate-x-0.5' : 'translate-x-3.5'
          }`}
        />
      </span>
    </button>
  );
}
