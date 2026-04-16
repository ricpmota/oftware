'use client';

import React, { useEffect, useMemo, useState } from 'react';

type BrandGradient = {
  from: string;
  via?: string;
  to: string;
};

export type SystemColorsTokens = {
  brand: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: BrandGradient;
  };
  surface: {
    background: string;
    card: string;
    modal: string;
    sidebar: string;
    navbar: string;
  };
  text: {
    primary: string;
    secondary: string;
    inverse: string;
  };
  border: {
    default: string;
    focus: string;
  };
  state: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  chart: {
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    c5: string;
  };
};

type SystemColorsMetadata = {
  name: string;
  version: string;
  notes: string;
  updatedAt: string | null;
};

const STORAGE_KEY = 'oftware_system_colors_tokens_v1';

const defaultTokens: SystemColorsTokens = {
  brand: {
    primary: '#16a34a', // Tailwind green-600
    secondary: '#2563eb', // blue-600
    accent: '#7c3aed', // purple-600
    gradient: {
      from: '#7c3aed', // purple-600
      via: '#2563eb', // blue-600
      to: '#f97316', // orange-500
    },
  },
  surface: {
    background: '#ffffff',
    card: '#ffffff',
    modal: '#ffffff',
    sidebar: '#ffffff',
    navbar: '#ffffff',
  },
  text: {
    primary: '#111827', // gray-900
    secondary: '#6b7280', // gray-500/600-ish
    inverse: '#ffffff',
  },
  border: {
    default: '#e5e7eb', // gray-200
    focus: '#22c55e', // green-500
  },
  state: {
    success: '#059669', // teal/emerald-ish
    warning: '#d97706', // amber-600
    danger: '#dc2626', // red-600
    info: '#2563eb', // blue-600
  },
  chart: {
    c1: '#059669',
    c2: '#2563eb',
    c3: '#f59e0b', // amber-500
    c4: '#dc2626',
    c5: '#7c3aed',
  },
};

const defaultMetadata: SystemColorsMetadata = {
  name: 'Osoftware Atual',
  version: '1.0.0',
  notes: '',
  updatedAt: null,
};

function normalizeHex(input: string): string | null {
  const v = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    // Expand shorthand: #abc -> #aabbcc
    const r = v[1] + v[1];
    const g = v[2] + v[2];
    const b = v[3] + v[3];
    return (`#${r}${g}${b}`).toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const v = n.slice(1);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return { r, g, b };
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  if (c <= 0.03928) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const R = srgbToLinear(rgb.r);
  const G = srgbToLinear(rgb.g);
  const B = srgbToLinear(rgb.b);
  // WCAG: relative luminance
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(foregroundHex: string, backgroundHex: string): number | null {
  const L1 = relativeLuminance(foregroundHex);
  const L2 = relativeLuminance(backgroundHex);
  if (L1 == null || L2 == null) return null;
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function formatContrast(ratio: number | null): string {
  if (!ratio) return '--';
  return `${ratio.toFixed(2)}:1`;
}

function contrastGrade(ratio: number | null): { label: string; tone: 'good' | 'warn' | 'bad' } {
  if (!ratio) return { label: 'N/A', tone: 'warn' };
  if (ratio >= 7) return { label: 'AAA', tone: 'good' };
  if (ratio >= 4.5) return { label: 'AA', tone: 'good' };
  if (ratio >= 3) return { label: 'AA (texto grande)', tone: 'warn' };
  return { label: 'Baixo', tone: 'bad' };
}

function avgHex(a: string, b: string): string | null {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return null;
  const r = Math.round((ra.r + rb.r) / 2);
  const g = Math.round((ra.g + rb.g) / 2);
  const bb = Math.round((ra.b + rb.b) / 2);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`.toLowerCase();
}

function colorDistance(a: string, b: string): number | null {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return null;
  const dr = ra.r - rb.r;
  const dg = ra.g - rb.g;
  const db = ra.b - rb.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
}) {
  const [draft, setDraft] = useState(value);
  const normalizedDraft = normalizeHex(draft);
  const valid = normalizedDraft != null;

  useEffect(() => setDraft(value), [value]);

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3">
        <div className="w-[220px]">
          <div className="text-sm font-semibold text-gray-900">{label}</div>
          {hint && <div className="text-xs text-gray-600 mt-1">{hint}</div>}
        </div>

        <div className="flex-1 flex items-center gap-3">
          <input
            type="color"
            value={normalizeHex(value) ?? '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-12 rounded-md p-0 border border-gray-200 bg-white"
            aria-label={`${label} (picker)`}
          />

          <input
            type="text"
            value={draft}
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              const n = normalizeHex(next);
              if (n) onChange(n);
            }}
            className={`flex-1 px-3 py-2 border rounded-md text-gray-900 focus:outline-none focus:ring-2 ${
              valid
                ? 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                : 'border-red-300 focus:ring-red-500 focus:border-red-500'
            }`}
            spellCheck={false}
            aria-label={`${label} hex`}
          />
        </div>
      </div>

      <div className={`text-xs ${valid ? 'text-green-700' : 'text-red-700'} font-medium`}>
        {valid ? 'Hex válido.' : 'Informe um hex no formato #RRGGBB (ou #RGB).'}
      </div>
    </div>
  );
}

function ContrastRow({
  title,
  value,
  grade,
}: {
  title: string;
  value: string;
  grade: { label: string; tone: 'good' | 'warn' | 'bad' };
}) {
  const toneToClass = {
    good: 'bg-green-50 text-green-800 border-green-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    bad: 'bg-rose-50 text-rose-800 border-rose-200',
  } as const;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${toneToClass[grade.tone]}`}>
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="flex items-center gap-3">
        <div className="text-sm font-bold text-gray-900">{value}</div>
        <div className="text-xs font-semibold">{grade.label}</div>
      </div>
    </div>
  );
}

function PresetButton({
  name,
  onClick,
}: {
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
    >
      {name}
    </button>
  );
}

function TokensToCssVariables(tokens: SystemColorsTokens) {
  // Future consumption: map this output to `:root { --brand-primary: ... }`
  // or to Tailwind `@theme inline { ... }`.
  return {
    '--brand-primary': tokens.brand.primary,
    '--brand-secondary': tokens.brand.secondary,
    '--brand-accent': tokens.brand.accent,
    '--brand-gradient-from': tokens.brand.gradient.from,
    '--brand-gradient-via': tokens.brand.gradient.via ?? tokens.brand.gradient.from,
    '--brand-gradient-to': tokens.brand.gradient.to,

    '--surface-background': tokens.surface.background,
    '--surface-card': tokens.surface.card,
    '--surface-modal': tokens.surface.modal,
    '--surface-sidebar': tokens.surface.sidebar,
    '--surface-navbar': tokens.surface.navbar,

    '--text-primary': tokens.text.primary,
    '--text-secondary': tokens.text.secondary,
    '--text-inverse': tokens.text.inverse,

    '--border-default': tokens.border.default,
    '--border-focus': tokens.border.focus,

    '--state-success': tokens.state.success,
    '--state-warning': tokens.state.warning,
    '--state-danger': tokens.state.danger,
    '--state-info': tokens.state.info,

    '--chart-1': tokens.chart.c1,
    '--chart-2': tokens.chart.c2,
    '--chart-3': tokens.chart.c3,
    '--chart-4': tokens.chart.c4,
    '--chart-5': tokens.chart.c5,
  };
}

export default function SystemColorsTab() {
  const [tokens, setTokens] = useState<SystemColorsTokens>(defaultTokens);
  const [metadata, setMetadata] = useState<SystemColorsMetadata>(defaultMetadata);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      // Backward-compatible parsing:
      // - v1: stored only tokens
      // - v2: stored { metadata, tokens }
      const maybeTokens = (parsed as any)?.tokens ?? parsed;
      const maybeMetadata = (parsed as any)?.metadata ?? defaultMetadata;

      // Minimal schema sanity check
      if (maybeTokens?.brand?.primary && maybeTokens?.surface?.background && maybeTokens?.text?.primary) {
        setTokens(maybeTokens as SystemColorsTokens);
        setMetadata(maybeMetadata as SystemColorsMetadata);
        setSavedAt('Carregado do navegador');
      }
    } catch {
      // Ignore invalid stored data
    }
  }, []);

  const cssVarsPreview = useMemo(() => TokensToCssVariables(tokens), [tokens]);

  // Technical validation: contrasts
  const contrastTextPrimaryOnBackground = useMemo(() => contrastRatio(tokens.text.primary, tokens.surface.background), [tokens]);
  const contrastTextInverseOnPrimary = useMemo(() => {
    // Primary button background is conceptually gradient; use avg of gradient endpoints.
    const bg = avgHex(tokens.brand.gradient.from, tokens.brand.gradient.to) ?? tokens.brand.primary;
    return contrastRatio(tokens.text.inverse, bg);
  }, [tokens]);
  const contrastTextSecondaryOnCard = useMemo(() => contrastRatio(tokens.text.secondary, tokens.surface.card), [tokens]);

  const semanticSimilarityWarnings = useMemo(() => {
    const pairs: Array<{ a: string; b: string; label: string; dist: number | null }> = [];
    const s = tokens.state;
    const add = (label: string, a: string, b: string) => {
      pairs.push({ label, a, b, dist: colorDistance(a, b) });
    };
    add('success vs warning', s.success, s.warning);
    add('success vs danger', s.success, s.danger);
    add('success vs info', s.success, s.info);
    add('warning vs danger', s.warning, s.danger);
    add('warning vs info', s.warning, s.info);
    add('danger vs info', s.danger, s.info);

    // Threshold tuned for "very similar"; adjust if needed.
    const SIMILAR_THRESHOLD = 45;
    const problematic = pairs.filter((p) => p.dist != null && p.dist < SIMILAR_THRESHOLD);
    return problematic;
  }, [tokens]);

  const save = () => {
    // Validate all hex values before saving
    const allHex = [
      tokens.brand.primary,
      tokens.brand.secondary,
      tokens.brand.accent,
      tokens.brand.gradient.from,
      tokens.brand.gradient.via ?? tokens.brand.gradient.from,
      tokens.brand.gradient.to,
      tokens.surface.background,
      tokens.surface.card,
      tokens.surface.modal,
      tokens.surface.sidebar,
      tokens.surface.navbar,
      tokens.text.primary,
      tokens.text.secondary,
      tokens.text.inverse,
      tokens.border.default,
      tokens.border.focus,
      tokens.state.success,
      tokens.state.warning,
      tokens.state.danger,
      tokens.state.info,
      tokens.chart.c1,
      tokens.chart.c2,
      tokens.chart.c3,
      tokens.chart.c4,
      tokens.chart.c5,
    ];

    const invalid = allHex.find((v) => !normalizeHex(v));
    if (invalid) {
      alert('Existe um campo de cor com hex inválido. Verifique os inputs.');
      return;
    }

    // If semantic colors are too similar, block saving to protect usability.
    if (semanticSimilarityWarnings.length > 0) {
      alert(
        `Atenção: algumas cores semânticas estão muito parecidas (${semanticSimilarityWarnings
          .map((p) => p.label)
          .join(', ')}). Ajuste para garantir distinção em UI e gráficos.`
      );
      return;
    }

    const config = {
      metadata: {
        ...metadata,
        updatedAt: new Date().toISOString(),
      },
      tokens,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSavedAt(new Date().toLocaleString('pt-BR'));
  };

  const reset = () => {
    setTokens(defaultTokens);
    setMetadata(defaultMetadata);
    setSavedAt(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportJson = async () => {
    const config = {
      metadata: {
        ...metadata,
        updatedAt: metadata.updatedAt ?? null,
      },
      tokens,
    };
    const text = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      alert('Tokens exportados e copiados para a área de transferência.');
    } catch {
      setImportText(text);
      alert('Não foi possível copiar automaticamente. Use o campo Importar.');
    }
  };

  const applyImport = () => {
    try {
      const parsed = JSON.parse(importText) as { metadata?: SystemColorsMetadata; tokens?: SystemColorsTokens } | SystemColorsTokens;
      const maybeTokens = (parsed as any)?.tokens ?? (parsed as any);
      const maybeMetadata = (parsed as any)?.metadata ?? defaultMetadata;

      if (!maybeTokens?.brand?.primary || !maybeTokens?.surface?.background || !maybeTokens?.text?.primary) {
        alert('JSON inválido para o schema esperado.');
        return;
      }
      setTokens(maybeTokens as SystemColorsTokens);
      setMetadata(maybeMetadata as SystemColorsMetadata);
      setSavedAt('Importado (ainda não salvo)');
    } catch {
      alert('Não foi possível interpretar o JSON. Verifique o formato.');
    }
  };

  // Preview helpers
  const brandGradient = `linear-gradient(120deg, ${tokens.brand.gradient.from} 0%, ${tokens.brand.gradient.via ?? tokens.brand.gradient.from} 45%, ${tokens.brand.gradient.to} 100%)`;

  const presets = useMemo(() => {
    // Premium Saúde: “saúde” com azul/ciano + verdes suaves.
    const premiumSaude: SystemColorsTokens = {
      ...defaultTokens,
      brand: {
        primary: '#06b6d4', // cyan-500
        secondary: '#2563eb', // blue-600
        accent: '#22c55e', // green-500
        gradient: { from: '#06b6d4', via: '#2563eb', to: '#22c55e' },
      },
      surface: {
        background: '#ffffff',
        card: '#ffffff',
        modal: '#ffffff',
        sidebar: '#f8fafc',
        navbar: '#ffffff',
      },
      text: { primary: '#0f172a', secondary: '#475569', inverse: '#ffffff' },
      border: { default: '#e2e8f0', focus: '#06b6d4' },
      state: { success: '#16a34a', warning: '#f59e0b', danger: '#ef4444', info: '#2563eb' },
      chart: { c1: '#16a34a', c2: '#2563eb', c3: '#f59e0b', c4: '#ef4444', c5: '#06b6d4' },
    };

    // Corporativo Sóbrio: neutros + azul institucional.
    const corporativoSobrio: SystemColorsTokens = {
      ...defaultTokens,
      brand: {
        primary: '#1d4ed8', // blue-700
        secondary: '#0f766e', // teal-700
        accent: '#334155', // slate-700
        gradient: { from: '#1d4ed8', via: '#0f766e', to: '#334155' },
      },
      surface: { background: '#ffffff', card: '#ffffff', modal: '#ffffff', sidebar: '#f1f5f9', navbar: '#ffffff' },
      text: { primary: '#0b1220', secondary: '#475569', inverse: '#ffffff' },
      border: { default: '#e2e8f0', focus: '#1d4ed8' },
      state: { success: '#16a34a', warning: '#f59e0b', danger: '#dc2626', info: '#1d4ed8' },
      chart: { c1: '#16a34a', c2: '#1d4ed8', c3: '#f59e0b', c4: '#dc2626', c5: '#0f766e' },
    };

    // Alto Contraste: preto/branco + acento magenta para leitura.
    const altoContraste: SystemColorsTokens = {
      ...defaultTokens,
      brand: {
        primary: '#ff00c8', // magenta
        secondary: '#00e5ff', // cyan
        accent: '#ffffff',
        gradient: { from: '#000000', via: '#ff00c8', to: '#00e5ff' },
      },
      surface: {
        background: '#0b0b0f',
        card: '#111827',
        modal: '#0f172a',
        sidebar: '#0f172a',
        navbar: '#0b0b0f',
      },
      text: { primary: '#ffffff', secondary: '#cbd5e1', inverse: '#0b0b0f' },
      border: { default: '#334155', focus: '#ff00c8' },
      state: { success: '#00e5ff', warning: '#ffd400', danger: '#ff4d4d', info: '#00e5ff' },
      chart: { c1: '#00e5ff', c2: '#ff4d4d', c3: '#ffd400', c4: '#00e5ff', c5: '#ff00c8' },
    };

    return [
      { id: 'software-atual', name: 'Osoftware Atual', tokens: defaultTokens, metadata: { name: 'Osoftware Atual', version: '1.0.0', notes: '', updatedAt: null } },
      { id: 'premium-saude', name: 'Premium Saúde', tokens: premiumSaude, metadata: { name: 'Premium Saúde', version: '1.0.0', notes: 'Preset premium com contraste otimizado.', updatedAt: null } },
      { id: 'corporativo-sobrio', name: 'Corporativo Sóbrio', tokens: corporativoSobrio, metadata: { name: 'Corporativo Sóbrio', version: '1.0.0', notes: 'Preset neutro e corporativo.', updatedAt: null } },
      { id: 'alto-contraste', name: 'Alto Contraste', tokens: altoContraste, metadata: { name: 'Alto Contraste', version: '1.0.0', notes: 'Preset para máxima legibilidade.', updatedAt: null } },
    ];
  }, []);

  const applyPreset = (presetId: string) => {
    const p = presets.find((x) => x.id === presetId);
    if (!p) return;
    setTokens(p.tokens);
    setMetadata(p.metadata);
    setSavedAt(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cores do Sistema</h2>
          <p className="text-gray-600 mt-1">
            Ferramenta executiva de identidade visual: defina tokens, valide contraste e simule telas (sem alterar o sistema inteiro).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={save}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Salvar
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Reset
          </button>
          <button
            onClick={exportJson}
            className="px-4 py-2 bg-white text-gray-800 text-sm font-medium border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Exportar JSON
          </button>
        </div>
      </div>

      {savedAt && (
        <div className="text-sm text-gray-600">
          Última ação: <span className="font-medium text-gray-900">{savedAt}</span>
        </div>
      )}

      {/* Governança */}
      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Governança da Paleta</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">Nome da paleta</label>
            <input
              value={metadata.name}
              onChange={(e) => setMetadata((m) => ({ ...m, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex.: Premium Saúde"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">Versão</label>
            <input
              value={metadata.version}
              onChange={(e) => setMetadata((m) => ({ ...m, version: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex.: 1.0.0"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <label className="text-sm font-semibold text-gray-900">Observações</label>
          <textarea
            value={metadata.notes}
            onChange={(e) => setMetadata((m) => ({ ...m, notes: e.target.value }))}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={3}
            placeholder="Notas executivas (ex.: objetivos de marca, regras de contraste, etc.)"
          />
          <div className="text-xs text-gray-600">
            Última atualização (ISO): <span className="font-semibold text-gray-900">{metadata.updatedAt ?? '—'}</span>
          </div>
        </div>
      </section>

      {/* Validação */}
      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Validação Técnica</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ContrastRow
            title="Texto principal × fundo principal"
            value={formatContrast(contrastTextPrimaryOnBackground)}
            grade={contrastGrade(contrastTextPrimaryOnBackground)}
          />
          <ContrastRow
            title="Texto secundário × superfície card"
            value={formatContrast(contrastTextSecondaryOnCard)}
            grade={contrastGrade(contrastTextSecondaryOnCard)}
          />
          <ContrastRow
            title="Texto inverse × botão primário"
            value={formatContrast(contrastTextInverseOnPrimary)}
            grade={contrastGrade(contrastTextInverseOnPrimary)}
          />
        </div>

        {semanticSimilarityWarnings.length > 0 && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-4">
            <div className="text-sm font-semibold text-rose-900">Alerta: cores semânticas muito parecidas</div>
            <div className="text-sm text-rose-900 mt-2">
              Ajuste para garantir distinção visual em badges, alerts e gráficos. Pares afetados:
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {semanticSimilarityWarnings.map((p) => (
                <span key={p.label} className="px-2 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Presets */}
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-900">Presets de Paleta</h3>
          <div className="flex gap-2 flex-wrap">
            {presets.map((p) => (
              <PresetButton key={p.id} name={p.name} onClick={() => applyPreset(p.id)} />
            ))}
          </div>
        </div>
        <div className="text-sm text-gray-600 mt-3">
          Clique para preencher os tokens automaticamente no preview. Não aplica no sistema inteiro.
        </div>
      </section>

      {/* Tabs by groups (simple stacking; no app-wide layout changes) */}
      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">1) Brand (identidade e destaque)</h3>
        <div className="space-y-4">
          <ColorField
            label="Primary"
            hint="Usada em ações principais, destaque e botões/links fortes."
            value={tokens.brand.primary}
            onChange={(v) => setTokens((t) => ({ ...t, brand: { ...t.brand, primary: v } }))}
          />
          <ColorField
            label="Secondary"
            hint="Usada como cor secundária em CTAs, elementos de suporte e variações."
            value={tokens.brand.secondary}
            onChange={(v) => setTokens((t) => ({ ...t, brand: { ...t.brand, secondary: v } }))}
          />
          <ColorField
            label="Accent"
            hint="Usada para chamar atenção (badges, ícones e sinais de contexto)."
            value={tokens.brand.accent}
            onChange={(v) => setTokens((t) => ({ ...t, brand: { ...t.brand, accent: v } }))}
          />
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">Gradient (para hero e camadas visuais)</div>
            <div className="space-y-3">
              <ColorField
                label="Gradient from"
                hint="Ponto inicial do gradiente (hero, highlights)."
                value={tokens.brand.gradient.from}
                onChange={(v) => setTokens((t) => ({ ...t, brand: { ...t.brand, gradient: { ...t.brand.gradient, from: v } } }))}
              />
              <ColorField
                label="Gradient via"
                hint="Transição intermediária do gradiente."
                value={tokens.brand.gradient.via ?? tokens.brand.gradient.from}
                onChange={(v) => setTokens((t) => ({ ...t, brand: { ...t.brand, gradient: { ...t.brand.gradient, via: v } } }))}
              />
              <ColorField
                label="Gradient to"
                hint="Ponto final do gradiente."
                value={tokens.brand.gradient.to}
                onChange={(v) => setTokens((t) => ({ ...t, brand: { ...t.brand, gradient: { ...t.brand.gradient, to: v } } }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Preview Brand</div>
              <div className="text-xs text-gray-500 mt-1">chips/hero somente no preview</div>
            </div>
            <div
              className="h-10 px-4 rounded-md flex items-center text-sm font-semibold shadow-sm"
              style={{
                background: brandGradient,
                color: tokens.text.inverse,
              }}
            >
              Osoftware
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: tokens.brand.primary, color: tokens.text.inverse }}>
              primary
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: tokens.brand.secondary, color: tokens.text.inverse }}>
              secondary
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: tokens.brand.accent, color: tokens.text.inverse }}>
              accent
            </span>
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">2) Surface (fundos e superfícies)</h3>
        <div className="space-y-4">
          <ColorField
            label="Background"
            hint="Fundo principal do app/página."
            value={tokens.surface.background}
            onChange={(v) => setTokens((t) => ({ ...t, surface: { ...t.surface, background: v } }))}
          />
          <ColorField
            label="Card"
            hint="Fundo de cards, seções e containers."
            value={tokens.surface.card}
            onChange={(v) => setTokens((t) => ({ ...t, surface: { ...t.surface, card: v } }))}
          />
          <ColorField
            label="Modal"
            hint="Fundo de modais/overlays."
            value={tokens.surface.modal}
            onChange={(v) => setTokens((t) => ({ ...t, surface: { ...t.surface, modal: v } }))}
          />
          <ColorField
            label="Sidebar"
            hint="Fundo da navegação lateral."
            value={tokens.surface.sidebar}
            onChange={(v) => setTokens((t) => ({ ...t, surface: { ...t.surface, sidebar: v } }))}
          />
          <ColorField
            label="Navbar"
            hint="Fundo do topo (header)."
            value={tokens.surface.navbar}
            onChange={(v) => setTokens((t) => ({ ...t, surface: { ...t.surface, navbar: v } }))}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
          {(
            [
              ['background', tokens.surface.background],
              ['card', tokens.surface.card],
              ['modal', tokens.surface.modal],
              ['sidebar', tokens.surface.sidebar],
              ['navbar', tokens.surface.navbar],
            ] as const
          ).map(([k, c]) => (
            <div key={k} className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs font-medium text-gray-700">{k}</div>
              <div className="mt-3 h-16 rounded-md" style={{ background: c, border: `1px solid ${tokens.border.default}` }} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">3) Text (hierarquia tipográfica)</h3>
        <div className="space-y-4">
          <ColorField
            label="Primary"
            hint="Texto principal (títulos e corpo) sobre superfícies neutras."
            value={tokens.text.primary}
            onChange={(v) => setTokens((t) => ({ ...t, text: { ...t.text, primary: v } }))}
          />
          <ColorField
            label="Secondary"
            hint="Texto secundário (subtítulos, legendas e placeholders)."
            value={tokens.text.secondary}
            onChange={(v) => setTokens((t) => ({ ...t, text: { ...t.text, secondary: v } }))}
          />
          <ColorField
            label="Inverse"
            hint="Texto sobre botões/camadas coloridas (ex.: botão primário)."
            value={tokens.text.inverse}
            onChange={(v) => setTokens((t) => ({ ...t, text: { ...t.text, inverse: v } }))}
          />
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium" style={{ color: tokens.text.primary }}>
            Exemplo de título
          </div>
          <div className="text-sm mt-1" style={{ color: tokens.text.secondary }}>
            Exemplo de corpo/legenda com contraste confortável.
          </div>
          <div className="mt-4 inline-flex items-center px-3 py-2 rounded-md text-sm font-semibold" style={{ background: tokens.brand.primary, color: tokens.text.inverse }}>
            Botão primário (preview)
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">4) Border (contorno e foco)</h3>
        <div className="space-y-4">
          <ColorField
            label="Default"
            hint="Bordas padrão (cards, tabelas, separadores)."
            value={tokens.border.default}
            onChange={(v) => setTokens((t) => ({ ...t, border: { ...t.border, default: v } }))}
          />
          <ColorField
            label="Focus ring"
            hint="Contorno de foco (acessibilidade) em inputs e botões."
            value={tokens.border.focus}
            onChange={(v) => setTokens((t) => ({ ...t, border: { ...t.border, focus: v } }))}
          />
        </div>

        <div className="mt-6 flex items-start gap-4">
          <div className="rounded-lg border p-4" style={{ borderColor: tokens.border.default, background: tokens.surface.card, minWidth: 220 }}>
            <div className="text-xs font-medium text-gray-700">default border</div>
            <div className="mt-3 text-sm" style={{ color: tokens.text.secondary }}>
              Card de referência
            </div>
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: tokens.border.focus, background: tokens.surface.card, minWidth: 220, boxShadow: `0 0 0 3px ${tokens.border.focus}33` }}>
            <div className="text-xs font-medium text-gray-700">focus ring (sim)</div>
            <div className="mt-3 text-sm" style={{ color: tokens.text.secondary }}>
              Estado de foco para inputs/ações
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">5) State (semânticos)</h3>
        <div className="space-y-4">
          <ColorField
            label="Success"
            hint="Mensagens de sucesso, estado positivo e confirmação."
            value={tokens.state.success}
            onChange={(v) => setTokens((t) => ({ ...t, state: { ...t.state, success: v } }))}
          />
          <ColorField
            label="Warning"
            hint="Alertas de atenção e estados intermediários."
            value={tokens.state.warning}
            onChange={(v) => setTokens((t) => ({ ...t, state: { ...t.state, warning: v } }))}
          />
          <ColorField
            label="Danger"
            hint="Erros, falhas e estados críticos."
            value={tokens.state.danger}
            onChange={(v) => setTokens((t) => ({ ...t, state: { ...t.state, danger: v } }))}
          />
          <ColorField
            label="Info"
            hint="Informações, dicas e contextos neutros."
            value={tokens.state.info}
            onChange={(v) => setTokens((t) => ({ ...t, state: { ...t.state, info: v } }))}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          {(
            [
              ['success', tokens.state.success],
              ['warning', tokens.state.warning],
              ['danger', tokens.state.danger],
              ['info', tokens.state.info],
            ] as const
          ).map(([k, c]) => (
            <div key={k} className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs font-medium text-gray-700">{k}</div>
              <div className="mt-3 rounded-md px-3 py-2 text-sm font-semibold" style={{ background: `${c}22`, color: c, border: `1px solid ${c}55` }}>
                Exemplo
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">6) Chart (séries / gráficos)</h3>
        <div className="space-y-4">
          <ColorField label="Serie 1" hint="Linha/barra 1 no preview de gráficos." value={tokens.chart.c1} onChange={(v) => setTokens((t) => ({ ...t, chart: { ...t.chart, c1: v } }))} />
          <ColorField label="Serie 2" hint="Linha/barra 2 no preview de gráficos." value={tokens.chart.c2} onChange={(v) => setTokens((t) => ({ ...t, chart: { ...t.chart, c2: v } }))} />
          <ColorField label="Serie 3" hint="Linha/barra 3 no preview de gráficos." value={tokens.chart.c3} onChange={(v) => setTokens((t) => ({ ...t, chart: { ...t.chart, c3: v } }))} />
          <ColorField label="Serie 4" hint="Linha/barra 4 no preview de gráficos." value={tokens.chart.c4} onChange={(v) => setTokens((t) => ({ ...t, chart: { ...t.chart, c4: v } }))} />
          <ColorField label="Serie 5" hint="Linha/barra 5 no preview de gráficos." value={tokens.chart.c5} onChange={(v) => setTokens((t) => ({ ...t, chart: { ...t.chart, c5: v } }))} />
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-900">Preview gráfico (barras)</div>
          <div className="mt-3 h-36 flex items-end gap-2">
            {[tokens.chart.c1, tokens.chart.c2, tokens.chart.c3, tokens.chart.c4, tokens.chart.c5].map((c, idx) => (
              <div key={c} className="flex-1">
                <div
                  className="rounded-md"
                  style={{
                    height: `${45 + idx * 7}%`,
                    background: c,
                  }}
                />
                <div className="mt-2 text-[10px] text-center text-gray-500">c{idx + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview geral (tela real simulada)</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Desktop-like */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div
              className="h-14 flex items-center px-4"
              style={{
                background: tokens.surface.navbar,
                borderBottom: `1px solid ${tokens.border.default}`,
              }}
            >
              <div className="h-9 w-9 rounded-md" style={{ background: brandGradient }} />
              <div className="ml-3">
                <div className="text-sm font-bold" style={{ color: tokens.text.primary }}>
                  Osoftware
                </div>
                <div className="text-xs" style={{ color: tokens.text.secondary }}>
                  Meta Admin Geral (preview)
                </div>
              </div>
            </div>
            <div className="flex">
              <div className="w-64 p-4" style={{ background: tokens.surface.sidebar, borderRight: `1px solid ${tokens.border.default}` }}>
                <div className="text-xs font-semibold" style={{ color: tokens.text.secondary }}>
                  Sidebar
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-10 rounded-md" style={{ background: `${tokens.brand.primary}12`, border: `1px solid ${tokens.brand.primary}33`, color: tokens.brand.primary }} />
                  <div className="h-10 rounded-md" style={{ background: 'transparent', border: `1px solid ${tokens.border.default}` }} />
                  <div className="h-10 rounded-md" style={{ background: 'transparent', border: `1px solid ${tokens.border.default}` }} />
                </div>
              </div>
              <div className="flex-1 p-6" style={{ background: tokens.surface.background }}>
                <div className="rounded-xl p-5" style={{ background: tokens.surface.card, border: `1px solid ${tokens.border.default}` }}>
                  <div className="text-sm font-semibold" style={{ color: tokens.text.primary }}>
                    Card com botões e estado
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      className="px-4 py-2 rounded-md text-sm font-semibold"
                      style={{
                        background: brandGradient,
                        border: `1px solid ${tokens.brand.primary}33`,
                        color: tokens.text.inverse,
                      }}
                    >
                      Ação primária
                    </button>
                    <button
                      className="px-4 py-2 rounded-md text-sm font-semibold"
                      style={{
                        background: 'transparent',
                        border: `1px solid ${tokens.border.default}`,
                        color: tokens.text.primary,
                      }}
                    >
                      Ação secundária
                    </button>
                  </div>
                  <div className="mt-4 rounded-lg p-3" style={{ background: `${tokens.state.info}22`, border: `1px solid ${tokens.state.info}55` }}>
                    <div className="text-sm font-semibold" style={{ color: tokens.state.info }}>
                      Info
                    </div>
                    <div className="text-sm" style={{ color: tokens.text.secondary }}>
                      Estado semântica usando token de info.
                    </div>
                  </div>

                    {/* Form preview (mais realista) */}
                    <div className="mt-4 rounded-lg p-3" style={{ background: tokens.surface.modal, border: `1px solid ${tokens.border.default}` }}>
                      <div className="text-sm font-semibold" style={{ color: tokens.text.primary }}>
                        Formulário (preview)
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-semibold" style={{ color: tokens.text.secondary }}>Campo de texto</div>
                        <input
                          value="Ex.: João da Silva"
                          readOnly
                          className="w-full rounded-md px-3 py-2 text-sm"
                          style={{ background: tokens.surface.background, border: `1px solid ${tokens.border.default}`, color: tokens.text.primary, outline: 'none' }}
                        />
                        <div className="text-xs font-semibold" style={{ color: tokens.text.secondary }}>Selecionar</div>
                        <div
                          className="w-full rounded-md px-3 py-2 text-sm flex items-center"
                          style={{ background: tokens.surface.background, border: `1px solid ${tokens.border.default}`, color: tokens.text.secondary }}
                        >
                          Opção 1
                        </div>
                        <button
                          className="w-full mt-2 px-4 py-2 rounded-md text-sm font-semibold"
                          style={{ background: brandGradient, color: tokens.text.inverse, border: `1px solid ${tokens.brand.primary}33` }}
                        >
                          Enviar
                        </button>
                      </div>
                    </div>

                    {/* Dashboard preview */}
                    <div className="mt-4 rounded-lg p-3" style={{ background: tokens.surface.card, border: `1px solid ${tokens.border.default}` }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Dashboard</div>
                        <div className="text-xs font-semibold" style={{ color: tokens.text.secondary }}>Resumo executivo</div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { label: 'Sucesso', value: '98%', color: tokens.state.success },
                          { label: 'Avisos', value: '12', color: tokens.state.warning },
                          { label: 'Erros', value: '3', color: tokens.state.danger },
                        ].map((k) => (
                          <div key={k.label} className="rounded-md p-3" style={{ border: `1px solid ${tokens.border.default}`, background: tokens.surface.background }}>
                            <div className="text-xs font-semibold" style={{ color: tokens.text.secondary }}>{k.label}</div>
                            <div className="mt-2 text-lg font-bold" style={{ color: k.color }}>{k.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Table preview */}
                    <div className="mt-4 rounded-lg overflow-hidden" style={{ border: `1px solid ${tokens.border.default}` }}>
                      <div style={{ background: tokens.surface.card, borderBottom: `1px solid ${tokens.border.default}` }} className="px-3 py-2">
                        <div className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Tabela</div>
                      </div>
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-xs uppercase font-semibold" style={{ color: tokens.text.secondary, borderBottom: `1px solid ${tokens.border.default}` }}>Item</th>
                            <th className="px-3 py-2 text-xs uppercase font-semibold" style={{ color: tokens.text.secondary, borderBottom: `1px solid ${tokens.border.default}` }}>Status</th>
                            <th className="px-3 py-2 text-xs uppercase font-semibold" style={{ color: tokens.text.secondary, borderBottom: `1px solid ${tokens.border.default}` }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { item: 'Card de marca', status: 'Ok', color: tokens.state.success, value: 'Aprovado' },
                            { item: 'QA contraste', status: 'Atenção', color: tokens.state.warning, value: 'Em revisão' },
                            { item: 'Alertas', status: 'Crítico', color: tokens.state.danger, value: 'Ajustar' },
                          ].map((row, idx) => (
                            <tr key={row.item}>
                              <td className="px-3 py-2 text-sm" style={{ color: tokens.text.primary, borderBottom: idx === 2 ? 'none' : `1px solid ${tokens.border.default}` }}>{row.item}</td>
                              <td className="px-3 py-2 text-sm" style={{ color: row.color, borderBottom: idx === 2 ? 'none' : `1px solid ${tokens.border.default}` }}>{row.status}</td>
                              <td className="px-3 py-2 text-sm" style={{ color: tokens.text.secondary, borderBottom: idx === 2 ? 'none' : `1px solid ${tokens.border.default}` }}>{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-like */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div
              className="h-14 flex items-center px-4"
              style={{
                background: tokens.surface.navbar,
                borderBottom: `1px solid ${tokens.border.default}`,
              }}
            >
              <div className="h-9 w-9 rounded-md" style={{ background: brandGradient }} />
              <div className="ml-3">
                <div className="text-sm font-bold" style={{ color: tokens.text.primary }}>
                  Menu
                </div>
                <div className="text-xs" style={{ color: tokens.text.secondary }}>
                  Mobile preview
                </div>
              </div>
            </div>
            <div className="relative" style={{ background: tokens.surface.background, minHeight: 300 }}>
              <div className="p-4">
                <div className="rounded-xl p-4" style={{ background: tokens.surface.card, border: `1px solid ${tokens.border.default}` }}>
                  <div className="text-sm font-semibold" style={{ color: tokens.text.primary }}>
                    Layout de cartão
                  </div>
                  <div className="mt-3 h-3 rounded bg-gray-100" style={{ background: `${tokens.border.default}55` }} />
                  <div className="mt-2 h-3 rounded bg-gray-100" style={{ background: `${tokens.border.default}55` }} />
                  <div className="mt-4">
                    <div
                      className="h-10 rounded-md flex items-center justify-center text-sm font-semibold"
                      style={{
                        background: `${tokens.brand.primary}22`,
                        border: `1px solid ${tokens.brand.primary}55`,
                        color: tokens.brand.primary,
                      }}
                    >
                      Primário (preview)
                    </div>
                  </div>

                  {/* Badge states */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: `${tokens.state.success}22`, color: tokens.state.success, border: `1px solid ${tokens.state.success}55` }}>
                      Sucesso
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: `${tokens.state.warning}22`, color: tokens.state.warning, border: `1px solid ${tokens.state.warning}55` }}>
                      Aviso
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: `${tokens.state.danger}22`, color: tokens.state.danger, border: `1px solid ${tokens.state.danger}55` }}>
                      Erro
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: `${tokens.state.info}22`, color: tokens.state.info, border: `1px solid ${tokens.state.info}55` }}>
                      Info
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-around px-3"
                style={{
                  background: tokens.surface.card,
                  borderTop: `1px solid ${tokens.border.default}`,
                }}
              >
                {['A', 'B', 'C', 'D'].map((k, idx) => (
                  <div
                    key={k}
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-xs font-semibold"
                    style={{
                      background: idx === 0 ? `${tokens.brand.primary}22` : 'transparent',
                      border: `1px solid ${idx === 0 ? `${tokens.brand.primary}55` : tokens.border.default}`,
                      color: idx === 0 ? tokens.brand.primary : tokens.text.secondary,
                    }}
                  >
                    {k}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Consumo futuro (como virar tokens globais)</h3>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Nesta etapa, a configuração é usada apenas no preview. Em uma próxima etapa, o mesmo schema será mapeado para variáveis CSS (ex.: `--brand-primary`, `--surface-card`, etc.) e consumido por Tailwind/`app/globals.css` e componentes que hoje usam cores fixas.
          </p>

          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-900 mb-2">Export (CSS variables)</div>
            <pre className="text-xs overflow-auto max-h-56 whitespace-pre-wrap text-gray-800">
              {Object.entries(cssVarsPreview)
                .map(([k, v]) => `${k}: ${v};`)
                .join('\n')}
            </pre>
            <div className="text-xs text-gray-600 mt-2">
              Também existe export/import completo em JSON com metadados via botão “Exportar JSON”.
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-900 mb-2">Import (JSON tokens)</div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Cole aqui o JSON exportado do schema SystemColorsTokens"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={6}
            />
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={applyImport}
                className="px-4 py-2 bg-white text-gray-900 text-sm font-medium border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Aplicar Import
              </button>
              <button
                onClick={() => {
                  setImportText(JSON.stringify(defaultTokens, null, 2));
                  setSavedAt(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium border border-gray-200 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Colocar exemplo (default)
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

