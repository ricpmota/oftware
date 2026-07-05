'use client';

import { useState } from 'react';
import { Link2, Syringe, Flag } from 'lucide-react';
import MedicoWhiteLabelImageEditor from '@/components/metaadmin/MedicoWhiteLabelImageEditor';
import PublicPageThemePreview from '@/components/metaadmin/PublicPageThemePreview';
import { DEFAULT_WHITE_LABEL_PRIMARY_COLOR } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import {
  PUBLIC_PAGE_DEFAULT_BACKGROUNDS,
  PUBLIC_PAGE_DEFAULT_TEXT_COLORS,
  PUBLIC_PAGE_LABELS,
  type PublicPageKind,
} from '@/lib/whiteLabel/publicPagesTheme';

export type PublicPagesFormValues = {
  drPageBackgroundColor: string;
  drPageTextColor: string;
  drPageLogoUrl: string | null;
  aplicacaoPageBackgroundColor: string;
  aplicacaoPageTextColor: string;
  aplicacaoPageLogoUrl: string | null;
  conclusaoPageBackgroundColor: string;
  conclusaoPageTextColor: string;
  conclusaoPageLogoUrl: string | null;
  primaryColor: string;
  showPoweredByOftware: boolean;
};

type Props = {
  values: PublicPagesFormValues;
  brandName: string;
  disabled?: boolean;
  onChange: (patch: Partial<PublicPagesFormValues>) => void;
  inputClassName: string;
  labelClassName: string;
  metodoLogoLocked?: boolean;
  metodoLockedLogos?: {
    dr: string | null;
    aplicacao: string | null;
    conclusao: string | null;
  } | null;
};

const TABS: { id: PublicPageKind; icon: typeof Link2; hint: string }[] = [
  {
    id: 'dr',
    icon: Link2,
    hint: 'Página pública do seu link (/dr/...). Logo no rodapé.',
  },
  {
    id: 'aplicacao',
    icon: Syringe,
    hint: 'Formulário de aplicação enviado ao paciente. Logo no topo.',
  },
  {
    id: 'conclusao',
    icon: Flag,
    hint: 'Formulário de conclusão do tratamento. Logo no topo.',
  },
];

function fieldKeys(kind: PublicPageKind): {
  bg: keyof PublicPagesFormValues;
  text: keyof PublicPagesFormValues;
  logo: keyof PublicPagesFormValues;
} {
  if (kind === 'dr') {
    return {
      bg: 'drPageBackgroundColor',
      text: 'drPageTextColor',
      logo: 'drPageLogoUrl',
    };
  }
  if (kind === 'aplicacao') {
    return {
      bg: 'aplicacaoPageBackgroundColor',
      text: 'aplicacaoPageTextColor',
      logo: 'aplicacaoPageLogoUrl',
    };
  }
  return {
    bg: 'conclusaoPageBackgroundColor',
    text: 'conclusaoPageTextColor',
    logo: 'conclusaoPageLogoUrl',
  };
}

function ColorField({
  label,
  value,
  defaultValue,
  disabled,
  onChange,
  inputClassName,
  labelClassName,
  ariaLabel,
}: {
  label: string;
  value: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  inputClassName: string;
  labelClassName: string;
  ariaLabel: string;
}) {
  return (
    <div className="space-y-2">
      <label className={labelClassName}>{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 bg-white p-1 disabled:opacity-50"
          aria-label={ariaLabel}
        />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} max-w-[140px] font-mono text-sm`}
          placeholder={defaultValue}
        />
      </div>
      {defaultValue ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Padrão: <span className="font-mono">{defaultValue}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function PublicPagesWhiteLabelEditor({
  values,
  brandName,
  disabled,
  onChange,
  inputClassName,
  labelClassName,
  metodoLogoLocked = false,
  metodoLockedLogos = null,
}: Props) {
  const [aba, setAba] = useState<PublicPageKind>('dr');
  const tab = TABS.find((t) => t.id === aba)!;
  const keys = fieldKeys(aba);
  const bgValue = String(values[keys.bg]);
  const textValue = String(values[keys.text]);
  const logoValue = values[keys.logo] as string | null;
  const lockedLogoForTab =
    metodoLogoLocked && metodoLockedLogos
      ? aba === 'dr'
        ? metodoLockedLogos.dr
        : aba === 'aplicacao'
          ? metodoLockedLogos.aplicacao
          : metodoLockedLogos.conclusao
      : null;
  const displayLogoUrl = metodoLogoLocked ? lockedLogoForTab ?? logoValue : logoValue;
  const primaryValue = values.primaryColor;
  const defaultBg = PUBLIC_PAGE_DEFAULT_BACKGROUNDS[aba];
  const defaultText = PUBLIC_PAGE_DEFAULT_TEXT_COLORS[aba];

  const previewTheme = {
    backgroundColor: bgValue,
    textColor: textValue,
    logoUrl: displayLogoUrl,
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/30 p-5 space-y-5">
      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Páginas públicas</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Personalize cores, logo e destaques de cada página enviada ao paciente.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, icon: Icon, hint }) => {
          const active = aba === id;
          return (
            <button
              key={id}
              type="button"
              title={hint}
              onClick={() => setAba(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {PUBLIC_PAGE_LABELS[id]}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">{tab.hint}</p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 xl:gap-6 items-start">
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-5 space-y-4">
          <ColorField
            label="Cor de fundo"
            value={bgValue}
            defaultValue={defaultBg}
            disabled={disabled}
            onChange={(v) => onChange({ [keys.bg]: v })}
            inputClassName={inputClassName}
            labelClassName={labelClassName}
            ariaLabel={`Cor de fundo — ${PUBLIC_PAGE_LABELS[aba]}`}
          />
          <ColorField
            label="Cor da fonte"
            value={textValue}
            defaultValue={defaultText}
            disabled={disabled}
            onChange={(v) => onChange({ [keys.text]: v })}
            inputClassName={inputClassName}
            labelClassName={labelClassName}
            ariaLabel={`Cor da fonte — ${PUBLIC_PAGE_LABELS[aba]}`}
          />
          <ColorField
            label="Cor principal (destaques e botões)"
            value={primaryValue}
            defaultValue={DEFAULT_WHITE_LABEL_PRIMARY_COLOR}
            disabled={disabled}
            onChange={(v) => onChange({ primaryColor: v })}
            inputClassName={inputClassName}
            labelClassName={labelClassName}
            ariaLabel="Cor principal — destaques e botões"
          />
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-5 space-y-2">
            <label className={labelClassName}>Logo da página</label>
            <MedicoWhiteLabelImageEditor
              currentUrl={displayLogoUrl}
              onUrlChange={(url) => onChange({ [keys.logo]: url })}
              disabled={disabled}
              readOnly={metodoLogoLocked}
              uploadTipo="public-logo"
              allowedTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
              previewClassName={`max-h-24 ${aba === 'dr' ? 'bg-[#0A1F44]/10' : 'bg-gray-100'}`}
              emptyLabel="Clique para enviar logo"
              hint="PNG, JPG ou WebP. Só a logo enviada aparece na página (sem logotipo padrão duplicado)."
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Pré-visualização — {PUBLIC_PAGE_LABELS[aba]}
            </p>
            <PublicPageThemePreview
              key={`${aba}-${displayLogoUrl ?? 'default'}-${bgValue}-${textValue}-${primaryValue}`}
              kind={aba}
              theme={previewTheme}
              brandName={brandName}
              primaryColor={primaryValue}
              showPoweredBy={values.showPoweredByOftware}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
