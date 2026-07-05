'use client';

import { useState } from 'react';
import type { ProntuarioFormValues } from './prontuarioTypes';

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500';

function dataHojeISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const FORM_INICIAL: ProntuarioFormValues = {
  tipoRegistro: 'consulta',
  dataRegistro: dataHojeISO(),
  evolucao: '',
  sintomas: '',
  conduta: '',
  peso: '',
  cintura: '',
  pressao: '',
  doseAtual: '',
  proximaDose: '',
  meta: '',
};

export type ProntuarioFormProps = {
  onSalvar: (values: ProntuarioFormValues) => Promise<void> | void;
};

function temInformacaoClinica(values: ProntuarioFormValues): boolean {
  return [values.evolucao, values.conduta, values.sintomas].some((v) => v.trim().length > 0);
}

export function ProntuarioForm({ onSalvar }: ProntuarioFormProps) {
  const [values, setValues] = useState<ProntuarioFormValues>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const atualizar = (campo: keyof ProntuarioFormValues, valor: string) => {
    setValues((prev) => ({ ...prev, [campo]: valor }));
    setMensagemErro(null);
    setMensagemSucesso(null);
  };

  const handleSalvar = async () => {
    if (!temInformacaoClinica(values)) {
      setMensagemSucesso(null);
      setMensagemErro('Preencha pelo menos uma informação clínica antes de salvar.');
      return;
    }

    setSalvando(true);
    setMensagemErro(null);
    setMensagemSucesso(null);

    try {
      await onSalvar(values);
      setValues(FORM_INICIAL);
      setMensagemSucesso('Registro adicionado ao prontuário.');
    } catch {
      setMensagemErro('Não foi possível salvar o registro. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="space-y-4 min-w-0">
      <div>
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Registrar consulta</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          Adicione uma evolução manual ao prontuário do paciente
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Tipo de registro
          </label>
          <select
            className={inputClass}
            value={values.tipoRegistro}
            onChange={(e) => atualizar('tipoRegistro', e.target.value)}
          >
            <option value="consulta">Consulta médica</option>
            <option value="retorno">Retorno</option>
            <option value="teleconsulta">Teleconsulta</option>
            <option value="intercorrencia">Intercorrência</option>
            <option value="ajuste_dose">Ajuste de dose</option>
            <option value="observacao">Observação rápida</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Data do registro
          </label>
          <input
            type="date"
            className={inputClass}
            value={values.dataRegistro}
            onChange={(e) => atualizar('dataRegistro', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Evolução
          </label>
          <textarea
            rows={3}
            placeholder="Escreva a evolução, conduta, sintomas, adesão e plano..."
            className={`${inputClass} resize-y min-h-[72px]`}
            value={values.evolucao}
            onChange={(e) => atualizar('evolucao', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Sintomas / efeitos adversos
          </label>
          <textarea
            rows={2}
            placeholder="Náusea, constipação, fadiga, hipoglicemia..."
            className={`${inputClass} resize-y min-h-[56px]`}
            value={values.sintomas}
            onChange={(e) => atualizar('sintomas', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Conduta / plano
          </label>
          <textarea
            rows={2}
            placeholder="Orientações, ajustes e próximos passos..."
            className={`${inputClass} resize-y min-h-[56px]`}
            value={values.conduta}
            onChange={(e) => atualizar('conduta', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Peso atual
            </label>
            <input
              type="text"
              placeholder="kg"
              className={inputClass}
              value={values.peso}
              onChange={(e) => atualizar('peso', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Cintura abdominal
            </label>
            <input
              type="text"
              placeholder="cm"
              className={inputClass}
              value={values.cintura}
              onChange={(e) => atualizar('cintura', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Pressão arterial
            </label>
            <input
              type="text"
              placeholder="ex.: 120/80 mmHg"
              className={inputClass}
              value={values.pressao}
              onChange={(e) => atualizar('pressao', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Dose atual
            </label>
            <input
              type="text"
              placeholder="mg"
              className={inputClass}
              value={values.doseAtual}
              onChange={(e) => atualizar('doseAtual', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Próxima dose
            </label>
            <input
              type="text"
              placeholder="mg / data"
              className={inputClass}
              value={values.proximaDose}
              onChange={(e) => atualizar('proximaDose', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Meta até próxima consulta
          </label>
          <input
            type="text"
            placeholder="ex.: Perder 2 kg, manter adesão à medicação..."
            className={inputClass}
            value={values.meta}
            onChange={(e) => atualizar('meta', e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {salvando ? 'Salvando...' : 'Salvar no prontuário'}
        </button>

        {mensagemErro && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {mensagemErro}
          </p>
        )}
        {mensagemSucesso && (
          <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {mensagemSucesso}
          </p>
        )}
      </div>
    </section>
  );
}
