'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, Globe, Loader2, Search } from 'lucide-react';
import {
  formatDomainPreview,
  parseFqdnToSlugAndExt,
} from '@/lib/whiteLabel/cadastroMedicoConstants';
import type { DomainSearchRow } from '@/lib/whiteLabel/cadastroMedicoDomainCheck';
import { FieldGrid, FieldLabel, StepHint, inputClassName } from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import type { DominioStatus } from '@/types/cadastroMedicoWhiteLabel';

type FormState = Record<string, string>;

const STATUS_LABEL: Record<DominioStatus, string> = {
  disponivel: 'Disponível',
  em_analise: 'Em análise',
  indisponivel: 'Indisponível',
};

const STATUS_CLASS: Record<DominioStatus, string> = {
  disponivel: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  em_analise: 'bg-amber-50 text-amber-800 border-amber-200',
  indisponivel: 'bg-slate-100 text-slate-500 border-slate-200',
};

type Props = {
  form: FormState;
  updateField: (key: string, value: string) => void;
  nome: string;
  sobrenome: string;
  nomeMarca: string;
  onError: (msg: string) => void;
};

function DomainResultRow({
  row,
  selected,
  onSelect,
}: {
  row: DomainSearchRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        selected
          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <Globe
          className={`w-5 h-5 shrink-0 mt-0.5 ${selected ? 'text-emerald-600' : 'text-slate-400'}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold text-slate-900 break-all leading-snug">
            {row.wwwUrl}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {row.label} · {row.group}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span
          className={`inline-flex w-fit items-center text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_CLASS[row.status]}`}
        >
          {STATUS_LABEL[row.status]}
        </span>

        {row.selectable ? (
          <button
            type="button"
            onClick={onSelect}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              selected
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {selected ? (
              <>
                <Check className="w-4 h-4" />
                Selecionado
              </>
            ) : (
              'Selecionar este domínio'
            )}
          </button>
        ) : (
          <span className="text-xs text-slate-400 sm:text-right">Indisponível para registro</span>
        )}
      </div>
    </div>
  );
}

export default function CadastroMedicoDomainStep({
  form,
  updateField,
  nome,
  sobrenome,
  nomeMarca,
  onError,
}: Props) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DomainSearchRow[]>([]);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const slug = form.dominioDesejado.trim();
  const hasSelection = Boolean(form.statusDominio && form.extensaoDominio);

  const livePreview = useMemo(() => {
    if (hasSelection) return formatDomainPreview(slug, form.extensaoDominio);
    if (slug) return `www.${slug}`;
    return 'www.seudominio';
  }, [form.extensaoDominio, hasSelection, slug]);

  const previewHint = useMemo(() => {
    if (hasSelection) return 'Extensão escolhida por você na lista de disponibilidade.';
    if (hasSearched) return 'Toque em “Selecionar este domínio” na extensão desejada.';
    if (slug) return 'Busque abaixo para ver quais extensões (.com, .com.br, etc.) estão disponíveis.';
    return 'Digite o nome e busque — a extensão será escolhida na lista de resultados.';
  }, [hasSearched, hasSelection, slug]);

  const selectedPreview = hasSelection
    ? formatDomainPreview(slug, form.extensaoDominio)
    : '';

  const groupedResults = useMemo(() => {
    const brasil = results.filter((r) => r.group === 'Brasil');
    const internacional = results.filter((r) => r.group === 'Internacional');
    return { brasil, internacional };
  }, [results]);

  const resetSelection = useCallback(() => {
    updateField('statusDominio', '');
    updateField('extensaoDominio', '');
  }, [updateField]);

  const handleSearch = useCallback(async () => {
    if (!slug) {
      onError('Informe o nome desejado para buscar.');
      return;
    }
    setSearching(true);
    onError('');
    resetSelection();
    try {
      const res = await fetch('/api/whitelabel/cadastromedico/verificar-dominio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dominioDesejado: slug,
          nome,
          sobrenome,
          nomeMarca,
          searchAll: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        results?: DomainSearchRow[];
        alternatives?: string[];
      };
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar domínios.');
      setResults(data.results || []);
      setAlternatives(data.alternatives || []);
      setHasSearched(true);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }, [nome, nomeMarca, onError, resetSelection, slug, sobrenome]);

  const selectDomain = useCallback(
    (row: DomainSearchRow) => {
      const rowSlug = row.fqdn.slice(0, row.fqdn.length - row.ext.length);
      updateField('dominioDesejado', rowSlug);
      updateField('extensaoDominio', row.ext);
      updateField('statusDominio', row.status);
      onError('');
    },
    [onError, updateField]
  );

  const applyAlternative = useCallback(
    (wwwPreview: string) => {
      const parsed = parseFqdnToSlugAndExt(wwwPreview);
      if (!parsed) return;
      updateField('dominioDesejado', parsed.slug);
      resetSelection();
      setResults([]);
      setAlternatives([]);
      setHasSearched(false);
      onError('');
    },
    [onError, resetSelection, updateField]
  );

  const selectedFqdn =
    slug && form.extensaoDominio ? `${slug}${form.extensaoDominio}` : '';

  return (
    <FieldGrid>
      <StepHint>
        Digite o nome do site, busque e escolha a extensão disponível na lista (.com, .com.br e
        outras).
      </StepHint>

      <div>
        <FieldLabel>Nome desejado</FieldLabel>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
            www.
          </span>
          <input
            className={`${inputClassName} pl-14`}
            value={form.dominioDesejado}
            onChange={(e) => {
              updateField('dominioDesejado', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              resetSelection();
              setHasSearched(false);
              setResults([]);
              setAlternatives([]);
            }}
            placeholder="joaosilva"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">
          Prévia do endereço
        </p>
        <p className="text-lg sm:text-xl font-semibold text-slate-900 break-all">
          {livePreview}
          {!hasSelection && slug ? (
            <span className="text-slate-400 font-normal"> + extensão</span>
          ) : null}
        </p>
        <p className="text-xs text-slate-500 mt-1.5">{previewHint}</p>
      </div>

      <button
        type="button"
        onClick={() => void handleSearch()}
        disabled={searching || !slug}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-70"
      >
        {searching ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Buscando domínios...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Buscar disponibilidade
          </>
        )}
      </button>

      {hasSelection && selectedPreview && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <p className="text-xs font-medium text-emerald-700 mb-0.5">Domínio selecionado</p>
          <p className="text-base font-semibold text-emerald-900 break-all">{selectedPreview}</p>
          <p className="text-xs text-emerald-700 mt-1">
            {form.extensaoDominio} · {STATUS_LABEL[form.statusDominio as DominioStatus]}
          </p>
        </div>
      )}

      {hasSearched && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-800">
            Escolha a extensão do seu domínio
          </p>

          {groupedResults.brasil.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">
                Brasil — Registro.br
              </p>
              <div className="space-y-2.5">
                {groupedResults.brasil.map((row) => (
                  <DomainResultRow
                    key={row.fqdn}
                    row={row}
                    selected={selectedFqdn === row.fqdn}
                    onSelect={() => selectDomain(row)}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedResults.internacional.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">
                Internacional
              </p>
              <div className="space-y-2.5">
                {groupedResults.internacional.map((row) => (
                  <DomainResultRow
                    key={row.fqdn}
                    row={row}
                    selected={selectedFqdn === row.fqdn}
                    onSelect={() => selectDomain(row)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">Outras sugestões de nome</p>
          <p className="text-xs text-slate-500">
            Toque em uma sugestão para buscar novamente com outro nome.
          </p>
          <div className="flex flex-wrap gap-2">
            {alternatives.map((alt) => (
              <button
                key={alt}
                type="button"
                onClick={() => applyAlternative(alt)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all break-all text-left"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}
    </FieldGrid>
  );
}
