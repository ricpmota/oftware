'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Copy,
  ExternalLink,
  Instagram,
  Link2,
  Loader2,
  RotateCcw,
  Save,
} from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import InstagramBioStatsModal from '@/components/metaadmin/InstagramBioStatsModal';
import MedicoWhiteLabelImageEditor from '@/components/metaadmin/MedicoWhiteLabelImageEditor';
import { MedicoService } from '@/services/medicoService';
import type { MedicoInstagramBio, MedicoInstagramBioFormState } from '@/types/medicoInstagramBio';
import {
  applyInstagramBioNomeTemplate,
  buildInstagramBioPublicUrl,
  instagramBioDefaultTextFormState,
  instagramBioFormFromStored,
  instagramBioFormToPayload,
  INSTAGRAM_BIO_TEXT_DEFAULTS,
  normalizeInstagramBioWhatsApp,
  validateInstagramBioForm,
} from '@/lib/instagram/instagramBioConfig';
import { ORGANIZACAO_METODO_PUBLIC_ORIGIN } from '@/lib/tenant/organizacaoPublicOrigin';

type Props = {
  medicoId: string;
  medicoNome: string;
  medicoGenero?: 'M' | 'F';
  medicoEmail?: string;
  crmEstado: string;
  crmNumero: string;
  defaultTelefone?: string;
  initialBio?: MedicoInstagramBio | null;
  onSaved?: (bio: MedicoInstagramBio) => void;
  onNotify?: (message: string) => void;
  inputClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
};

export default function MedicoInstagramBioSection({
  medicoId,
  medicoNome,
  medicoGenero,
  medicoEmail,
  crmEstado,
  crmNumero,
  defaultTelefone,
  initialBio,
  onSaved,
  onNotify,
  inputClassName = 'block w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900/80 px-4 py-2.5 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-shadow',
  labelClassName = 'flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200',
  disabled = false,
}: Props) {
  const buildInitialForm = useCallback(() => {
    const base = instagramBioFormFromStored(initialBio);
    if (!base.whatsapp && defaultTelefone?.trim()) {
      base.whatsapp = normalizeInstagramBioWhatsApp(defaultTelefone);
    }
    return base;
  }, [initialBio, defaultTelefone]);

  const [form, setForm] = useState(buildInitialForm);
  const [savedForm, setSavedForm] = useState(buildInitialForm);
  const [saving, setSaving] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const next = buildInitialForm();
    setForm(next);
    setSavedForm(next);
  }, [medicoId]); // eslint-disable-line react-hooks/exhaustive-deps -- recarrega só ao trocar médico

  const notify = useCallback(
    (message: string) => {
      onNotify?.(message);
    },
    [onNotify],
  );

  const persistInstagramBio = useCallback(
    async (
      nextForm: MedicoInstagramBioFormState,
      options?: { skipValidation?: boolean; successMessage?: string },
    ) => {
      if (!options?.skipValidation) {
        const validationError = validateInstagramBioForm(nextForm);
        if (validationError) {
          setFormError(validationError);
          notify(validationError);
          throw new Error(validationError);
        }
      }

      setFormError(null);
      const payload = instagramBioFormToPayload(nextForm);
      await MedicoService.updateMedico(medicoId, {
        instagramBio: {
          ...payload,
          updatedAt: serverTimestamp(),
        },
      });
      setSavedForm(nextForm);
      onSaved?.(payload);
      if (options?.successMessage) {
        notify(options.successMessage);
      }
      return payload;
    },
    [medicoId, notify, onSaved],
  );

  const handleLogoUrlChange = useCallback(
    async (logoUrl: string | null) => {
      let nextForm!: MedicoInstagramBioFormState;
      setForm((prev) => {
        nextForm = { ...prev, logoUrl };
        return nextForm;
      });

      setLogoSaving(true);
      try {
        await persistInstagramBio(nextForm, {
          skipValidation: true,
          successMessage: logoUrl ? 'Logo salva com sucesso.' : 'Logo removida.',
        });
      } catch {
        notify('Erro ao salvar logo. Tente novamente.');
      } finally {
        setLogoSaving(false);
      }
    },
    [notify, persistInstagramBio],
  );

  const publicUrl = useMemo(
    () => buildInstagramBioPublicUrl(crmEstado, crmNumero),
    [crmEstado, crmNumero],
  );

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  const handleCopyLink = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      notify('Link copiado para a área de transferência.');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      notify('Não foi possível copiar o link.');
    }
  }, [publicUrl, notify]);

  const handleRestoreDefaults = useCallback(() => {
    setForm((prev) => instagramBioDefaultTextFormState(prev));
    setFormError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await persistInstagramBio(form, { successMessage: 'Link da Bio salvo com sucesso!' });
    } catch {
      if (!formError) {
        notify('Erro ao salvar Link da Bio.');
      }
    } finally {
      setSaving(false);
    }
  }, [form, formError, notify, persistInstagramBio]);

  return (
    <section className="rounded-2xl border border-violet-200/80 dark:border-violet-900/40 bg-gradient-to-br from-violet-50/80 via-white to-emerald-50/40 dark:from-violet-950/20 dark:via-gray-900/20 dark:to-emerald-950/10 p-5 sm:p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 mb-1">
          <Instagram className="h-5 w-5" />
          <h4 className="text-base font-bold text-gray-900 dark:text-white">Link da Bio</h4>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Personalize a página que ficará no link da sua bio do Instagram.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900/40 p-4 sm:p-5 space-y-3 shadow-sm shadow-emerald-500/10">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <Link2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold text-gray-900 dark:text-white">Seu link para colar na bio</p>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Formato: <span className="font-mono">{ORGANIZACAO_METODO_PUBLIC_ORIGIN}/instagram/&#123;UF&#125;&#123;CRM&#125;</span>
        </p>
        {publicUrl ? (
          <>
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 bg-white dark:bg-gray-950/60 px-3 py-3">
              <p className="text-xs sm:text-sm font-mono font-medium text-emerald-800 dark:text-emerald-200 break-all">
                {publicUrl}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                {linkCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copiar link
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir link
              </a>
              <button
                type="button"
                onClick={() => setStatsOpen(true)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-4 py-2.5 text-sm font-semibold text-violet-800 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                📊 Ver Desempenho do Link
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              CRM {crmEstado.toUpperCase()} {crmNumero.replace(/\D/g, '')}
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Cadastre seu CRM e UF para gerar o link da bio.
          </p>
        )}
      </div>

      <InstagramBioStatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        medicoEmail={medicoEmail}
      />

      <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-900/30 p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
          disabled={disabled || saving}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>
          <span className="block text-sm font-semibold text-gray-900 dark:text-white">Ativar Link da Bio</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Quando desativado, visitantes verão que o link ainda não está ativo.
          </span>
        </span>
      </label>

      <div className="space-y-2">
        <label className={labelClassName}>Logo do Link da Bio</label>
        <MedicoWhiteLabelImageEditor
          currentUrl={form.logoUrl}
          onUrlChange={(url) => void handleLogoUrlChange(url)}
          disabled={disabled || saving || logoSaving}
          uploadTipo="instagram-bio"
          previewClassName="max-h-24"
          emptyLabel="Clique para enviar logo"
          hint="Salva automaticamente ao enviar. Se vazio, usamos sua foto de perfil ou identidade visual. Recomendado PNG com fundo transparente."
        />
        {logoSaving ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Salvando logo…
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2 md:col-span-2">
          <label className={labelClassName} htmlFor="instagramBioWhatsapp">
            WhatsApp principal *
          </label>
          <input
            id="instagramBioWhatsapp"
            type="tel"
            inputMode="numeric"
            value={form.whatsapp}
            onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '') }))}
            disabled={disabled || saving}
            className={inputClassName}
            placeholder="Ex: 5583999999999"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Apenas números, com DDI 55. Usado nos botões de contato e parceria.
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className={labelClassName} htmlFor="instagramBioEmagrecimentoUrl">
            Link do programa de emagrecimento
          </label>
          <input
            id="instagramBioEmagrecimentoUrl"
            type="url"
            value={form.emagrecimentoUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, emagrecimentoUrl: e.target.value }))}
            disabled={disabled || saving}
            className={inputClassName}
            placeholder={`${ORGANIZACAO_METODO_PUBLIC_ORIGIN}/dr/seu-nome ou /dr/seu-nome`}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClassName} htmlFor="instagramBioHeadline">
            Headline
          </label>
          <input
            id="instagramBioHeadline"
            type="text"
            value={form.headline}
            onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))}
            disabled={disabled || saving}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClassName} htmlFor="instagramBioSubtitle">
            Subheadline
          </label>
          <input
            id="instagramBioSubtitle"
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
            disabled={disabled || saving}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className={labelClassName} htmlFor="instagramBioContactLabel">
            Texto do botão de contato
          </label>
          <input
            id="instagramBioContactLabel"
            type="text"
            value={form.contactButtonLabel}
            onChange={(e) => setForm((prev) => ({ ...prev, contactButtonLabel: e.target.value }))}
            disabled={disabled || saving}
            className={inputClassName}
            placeholder={INSTAGRAM_BIO_TEXT_DEFAULTS.contactButtonLabel}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use {'{nomeMedico}'} para inserir seu nome. Ex.: Falar com Dr(a). {'{nomeMedico}'}
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className={labelClassName} htmlFor="instagramBioContactModal">
            Texto do modal de contato
          </label>
          <textarea
            id="instagramBioContactModal"
            rows={5}
            value={form.contactModalText}
            onChange={(e) => setForm((prev) => ({ ...prev, contactModalText: e.target.value }))}
            disabled={disabled || saving}
            className={`${inputClassName} resize-y min-h-[120px]`}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            Resumo na prévia:{' '}
            <span className="text-gray-600 dark:text-gray-300">
              {applyInstagramBioNomeTemplate(form.contactModalText, medicoNome, medicoGenero).slice(0, 120)}
              {form.contactModalText.length > 120 ? '…' : ''}
            </span>
          </p>
        </div>
      </div>

      {formError ? <p className="text-sm text-red-600 dark:text-red-400">{formError}</p> : null}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={disabled || saving || !isDirty}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Link da Bio
        </button>
        <button
          type="button"
          onClick={handleRestoreDefaults}
          disabled={disabled || saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar textos padrão
        </button>
      </div>
    </section>
  );
}
