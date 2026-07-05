'use client';

import { useState } from 'react';
import type { ProntuarioNutriFormValues } from './prontuarioTypes';

const inputClass =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500';

function dataHojeISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const FORM_INICIAL: ProntuarioNutriFormValues = {
  tipoRegistro: 'consulta',
  dataRegistro: dataHojeISO(),
  evolucao: '',
  conduta: '',
  adesao: '',
  meta: '',
};

export type ProntuarioNutriFormProps = {
  onSalvar: (values: ProntuarioNutriFormValues) => Promise<void> | void;
};

function temConteudo(values: ProntuarioNutriFormValues): boolean {
  return [values.evolucao, values.conduta, values.adesao].some((v) => v.trim().length > 0);
}

export function ProntuarioNutriForm({ onSalvar }: ProntuarioNutriFormProps) {
  const [values, setValues] = useState<ProntuarioNutriFormValues>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const atualizar = (campo: keyof ProntuarioNutriFormValues, valor: string) => {
    setValues((prev) => ({ ...prev, [campo]: valor }));
    setMensagemErro(null);
    setMensagemSucesso(null);
  };

  const handleSalvar = async () => {
    if (!temConteudo(values)) {
      setMensagemSucesso(null);
      setMensagemErro('Preencha evolução, conduta ou adesão antes de salvar.');
      return;
    }

    setSalvando(true);
    setMensagemErro(null);
    setMensagemSucesso(null);

    try {
      await onSalvar(values);
      setValues({ ...FORM_INICIAL, dataRegistro: dataHojeISO() });
      setMensagemSucesso('Consulta nutricional registrada no prontuário.');
    } catch {
      setMensagemErro('Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="space-y-4 min-w-0">
      <div>
        <h4 className="text-base font-semibold text-gray-900">Registrar consulta nutricional</h4>
        <p className="text-sm text-gray-600 mt-0.5">
          Visível ao médico responsável. O prontuário médico do paciente não é exibido aqui.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de atendimento</label>
          <select
            className={inputClass}
            value={values.tipoRegistro}
            onChange={(e) => atualizar('tipoRegistro', e.target.value)}
          >
            <option value="consulta">Consulta nutricional</option>
            <option value="retorno">Retorno nutricional</option>
            <option value="teleconsulta">Teleconsulta nutricional</option>
            <option value="observacao">Observação / orientação</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data do atendimento</label>
          <input
            type="date"
            className={inputClass}
            value={values.dataRegistro}
            onChange={(e) => atualizar('dataRegistro', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Evolução / anamnese</label>
          <textarea
            rows={3}
            placeholder="Queixa, hábitos, recordatório, contexto clínico nutricional..."
            className={`${inputClass} resize-y min-h-[72px]`}
            value={values.evolucao}
            onChange={(e) => atualizar('evolucao', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Conduta / plano alimentar</label>
          <textarea
            rows={2}
            placeholder="Metas, cardápio, suplementos, ajustes..."
            className={`${inputClass} resize-y min-h-[56px]`}
            value={values.conduta}
            onChange={(e) => atualizar('conduta', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Adesão e comportamento</label>
          <textarea
            rows={2}
            placeholder="Check-ins, uso do app Nutri, ChatNutri, barreiras..."
            className={`${inputClass} resize-y min-h-[56px]`}
            value={values.adesao}
            onChange={(e) => atualizar('adesao', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta até próximo contato</label>
          <input
            type="text"
            placeholder="ex.: Manter 120 g proteína/dia, 3 check-ins/semana..."
            className={inputClass}
            value={values.meta}
            onChange={(e) => atualizar('meta', e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSalvar()}
          disabled={salvando}
          className="w-full rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {salvando ? 'Salvando...' : 'Salvar consulta nutricional'}
        </button>

        {mensagemErro && (
          <p className="text-sm text-red-600" role="alert">
            {mensagemErro}
          </p>
        )}
        {mensagemSucesso && (
          <p className="text-sm text-green-700" role="status">
            {mensagemSucesso}
          </p>
        )}
      </div>
    </section>
  );
}
