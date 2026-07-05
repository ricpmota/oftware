'use client';

import { AlertCircle, X } from 'lucide-react';

type Props = {
  open: boolean;
  pacienteNome?: string;
  pendencias: string[];
  onClose: () => void;
};

export default function ModalCadastroIncompletoPaciente({
  open,
  pacienteNome,
  pendencias,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cadastro-incompleto-title"
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-amber-100"
      >
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertCircle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="cadastro-incompleto-title" className="text-lg font-semibold text-gray-900">
              Cadastro inicial incompleto
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {pacienteNome
                ? `${pacienteNome} ainda não finalizou todas as etapas do cadastro no app.`
                : 'Este paciente ainda não finalizou todas as etapas do cadastro no app.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {pendencias.length > 0 ? (
            <>
              <p className="text-sm font-medium text-gray-800 mb-2">Próxima etapa pendente no app:</p>
              <ul className="space-y-2">
                {pendencias.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-gray-700 rounded-lg bg-amber-50/80 border border-amber-100 px-3 py-2"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Não foi possível identificar etapas pendentes nos dados atuais. Peça ao paciente para
              abrir o app em <strong>/meta</strong> e concluir o cadastro, ou atualize a página e tente
              novamente.
            </p>
          )}
          <p className="mt-4 text-xs text-gray-500">
            Você só poderá aceitar o paciente depois que ele concluir o cadastro inicial no aplicativo.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
