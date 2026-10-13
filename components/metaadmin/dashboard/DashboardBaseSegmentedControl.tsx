'use client';

type BaseFiltro = 'meus' | 'oftware';

type Props = {
  value: BaseFiltro;
  onChange: (next: BaseFiltro) => void;
  organizationName: string;
  buttonClassName?: string;
};

export default function DashboardBaseSegmentedControl({
  value,
  onChange,
  organizationName,
  buttonClassName,
}: Props) {
  const tapClass = buttonClassName ?? '';
  return (
    <div className="w-full sm:w-auto">
      <div className="inline-flex w-full rounded-full bg-gray-100 p-1 sm:w-auto">
        <button
          type="button"
          onClick={() => onChange('meus')}
          className={`flex-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:flex-none ${tapClass} ${
            value === 'meus'
              ? 'bg-emerald-50 font-semibold text-emerald-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Meus pacientes
        </button>
        <button
          type="button"
          onClick={() => onChange('oftware')}
          className={`flex-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:flex-none ${tapClass} ${
            value === 'oftware'
              ? 'bg-emerald-50 font-semibold text-emerald-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Base {organizationName}
        </button>
      </div>
    </div>
  );
}
