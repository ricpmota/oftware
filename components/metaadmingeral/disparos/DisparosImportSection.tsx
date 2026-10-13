'use client';

import { useState } from 'react';
import type { DisparoColumnMapping } from '@/lib/disparos/types';
import { DisparosSectionTitle, DisparosSoftCard } from '@/components/metaadmingeral/disparos/disparosUi';

type Props = {
  fileName: string | null;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  mapping: DisparoColumnMapping;
  error: string | null;
  optOutText: string;
  defaultDdd: string;
  listName: string;
  saving: boolean;
  onFile: (file: File) => void;
  onMapping: (mapping: DisparoColumnMapping) => void;
  onOptOutText: (value: string) => void;
  onDefaultDdd: (value: string) => void;
  onListName: (value: string) => void;
  onApply: () => void;
};

function ColumnSelect({
  label,
  value,
  headers,
  optional,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  optional?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#E8EDED]">
        {label}
        {optional ? <span className="ml-2 text-xs font-normal text-[#E8EDED]/45">opcional</span> : null}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-[#E8EDED]"
      >
        <option value="">{optional ? 'Não usar' : 'Selecione a coluna'}</option>
        {headers.map((header) => (
          <option key={header} value={header}>
            {header}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function DisparosImportSection({
  fileName,
  headers,
  sampleRows,
  totalRows,
  mapping,
  error,
  optOutText,
  defaultDdd,
  listName,
  saving,
  onFile,
  onMapping,
  onOptOutText,
  onDefaultDdd,
  onListName,
  onApply,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const canApply = Boolean(mapping.nome && mapping.telefone1);

  function takeFile(file: File | undefined) {
    if (file) onFile(file);
  }

  return (
    <DisparosSoftCard>
      <DisparosSectionTitle
        title="Importar contatos"
        hint="O CSV é normalizado aqui e gravado na base de Disparos. Ela continua depois de atualizar a página."
      />

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          takeFile(event.dataTransfer.files?.[0]);
        }}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition ${
          dragOver ? 'border-[#4CCB7A] bg-[#4CCB7A]/10' : 'border-white/15 bg-white/[0.03] hover:border-[#4CCB7A]/40'
        }`}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            takeFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <span className="text-sm font-medium text-[#E8EDED]">Clique para selecionar ou solte o CSV aqui</span>
        <span className="mt-1 text-xs text-[#E8EDED]/50">
          {fileName ? fileName : 'Apenas .csv'}
        </span>
      </label>

      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

      {headers.length > 0 ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-[#E8EDED]">Configuração dos telefones</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#E8EDED]/45">País</p>
                <p className="mt-2 text-sm text-[#E8EDED]">Brasil (+55)</p>
              </div>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-[#E8EDED]/45">
                  DDD padrão para números sem DDD
                </span>
                <input
                  inputMode="numeric"
                  maxLength={2}
                  value={defaultDdd}
                  onChange={(event) => onDefaultDdd(event.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="mt-2 w-24 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-[#E8EDED]"
                  aria-label="DDD padrão para números sem DDD"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-[#E8EDED]/50">
              O DDD padrão entra só quando o número não traz DDD. Se o campo ficar vazio, esses números ficam como
              Falta DDD.
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[#E8EDED]">Nome da lista</span>
            <input
              value={listName}
              onChange={(event) => onListName(event.target.value)}
              placeholder="Servidores PMJP - Outubro 2026"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-[#E8EDED]"
            />
          </label>
          <p className="text-sm text-[#E8EDED]/70">Diga qual coluna do arquivo corresponde a cada campo.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <ColumnSelect
              label="Nome"
              value={mapping.nome}
              headers={headers}
              onChange={(nome) => onMapping({ ...mapping, nome })}
            />
            <ColumnSelect
              label="Telefone 1"
              value={mapping.telefone1}
              headers={headers}
              onChange={(telefone1) => onMapping({ ...mapping, telefone1 })}
            />
            <ColumnSelect
              label="Telefone 2"
              value={mapping.telefone2}
              headers={headers}
              optional
              onChange={(telefone2) => onMapping({ ...mapping, telefone2 })}
            />
          </div>

          {sampleRows.length > 0 ? (
            <div className="overflow-x-auto">
              <p className="text-sm font-medium text-[#E8EDED]">Prévia do arquivo</p>
              <p className="mt-1 mb-2 text-xs text-[#E8EDED]/50">
                Amostra de {sampleRows.length.toLocaleString('pt-BR')} de {totalRows.toLocaleString('pt-BR')} linhas.
                Aplicar o mapeamento processa o arquivo inteiro.
              </p>
              <table className="min-w-full text-left text-xs text-[#E8EDED]/70">
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="whitespace-nowrap px-2 py-1 font-medium text-[#E8EDED]/45">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, index) => (
                    <tr key={index}>
                      {headers.map((header, cellIndex) => (
                        <td key={header} className="whitespace-nowrap px-2 py-1">
                          {row[cellIndex] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <details className="rounded-xl border border-white/10 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-[#E8EDED]">Lista de opt-out</summary>
            <p className="mt-2 text-xs text-[#E8EDED]/55">
              Números que não devem receber campanha, um por linha. Clique em aplicar de novo para atualizar. Eles
              entram na campanha como ignorados.
            </p>
            <textarea
              value={optOutText}
              onChange={(event) => onOptOutText(event.target.value)}
              rows={3}
              placeholder="5511999998888"
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-[#E8EDED]"
            />
          </details>

          <button
            type="button"
            onClick={onApply}
            disabled={!canApply || saving}
            className="rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#062015] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Salvando base…' : 'Aplicar mapeamento'}
          </button>
        </div>
      ) : null}
    </DisparosSoftCard>
  );
}
