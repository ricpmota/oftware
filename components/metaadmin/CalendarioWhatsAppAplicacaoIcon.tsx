import { Loader2, Zap, CheckCircle2 } from 'lucide-react';
import MetodoEmagrecerIcon from '@/components/metodo/MetodoEmagrecerIcon';

type Props = {
  loading?: boolean;
  autoEnabled: boolean;
  autoSent?: boolean;
  autoFailed?: boolean;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  disabled?: boolean;
  isMobile?: boolean;
  className?: string;
  title?: string;
};

export default function CalendarioWhatsAppAplicacaoIcon({
  loading,
  autoEnabled,
  autoSent,
  autoFailed,
  onClick,
  disabled,
  isMobile,
  className = '',
  title = 'Abrir WhatsApp e enviar link para o paciente',
}: Props) {
  const size = isMobile ? 28 : 32;

  return (
    <a
      href="#"
      onClick={onClick}
      tabIndex={disabled ? -1 : undefined}
      className={`relative inline-flex items-center justify-center shrink-0 ${className} ${
        loading ? 'cursor-wait pointer-events-none opacity-90' : ''
      } ${disabled ? 'cursor-default pointer-events-none' : ''}`}
      title={title}
      aria-label={title}
      aria-disabled={disabled || undefined}
      aria-busy={loading}
    >
      <span className="inline-flex items-center justify-center" style={{ width: size, height: size }}>
        {loading ? (
          <Loader2 className="animate-spin" size={18} aria-hidden />
        ) : (
          <MetodoEmagrecerIcon icon="mensagens" size={size} />
        )}
      </span>

      {autoEnabled && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-600 text-white ring-1 ring-white dark:ring-gray-900"
          title="Envio automático ativo"
        >
          <Zap size={8} strokeWidth={2.5} aria-hidden />
        </span>
      )}

      {autoSent && (
        <span
          className="absolute -bottom-0.5 -left-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-1 ring-white dark:ring-gray-900"
          title="Mensagem automática enviada"
        >
          <CheckCircle2 size={8} strokeWidth={2.5} aria-hidden />
        </span>
      )}

      {autoFailed && !autoSent && (
        <span
          className="absolute -bottom-0.5 -left-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-white text-[8px] font-bold ring-1 ring-white dark:ring-gray-900"
          title="Falha no envio automático"
        >
          !
        </span>
      )}
    </a>
  );
}
