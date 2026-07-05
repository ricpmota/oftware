'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Image as ImageIcon,
  Loader2,
  Palette,
  RefreshCw,
  Save,
} from 'lucide-react';
import type {
  OrganizationBrandingApiResponse,
  OrganizationBrandingStored,
} from '@/lib/organization/organizationBrandingTypes';
import { ORGANIZATION_METODO_OG_FALLBACK_SRC } from '@/lib/organization/organizationBrandingDefaults';
import { META_ADMIN_GERAL_ACTIVE_ORG } from '@/components/metaadmingeral/metaAdminGeralNavConfig';

type OrganizationBrandingPanelProps = {
  user: User;
  organizationId?: string;
};

const SOURCE_LAYER_LABELS: Record<string, string> = {
  firestore: 'organizations/{id}.branding (oficial)',
  platformSettings: 'platformSettings/metodoImagens (fallback)',
  sourceMedico: 'medicos.whiteLabel conta fonte (fallback)',
  hardcoded: 'Defaults hardcoded (fallback)',
};

function inputClass() {
  return 'w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:border-[#4CCB7A]/50 focus:outline-none focus:ring-1 focus:ring-[#4CCB7A]/30';
}

function labelClass() {
  return 'block text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50 mb-1.5';
}

function ImageField({
  label,
  value,
  onChange,
  onUpload,
  uploading = false,
  readOnly = false,
  hint,
}: {
  label: string;
  value: string | null | undefined;
  onChange?: (v: string | null) => void;
  onUpload?: (file: File) => Promise<void>;
  uploading?: boolean;
  readOnly?: boolean;
  hint?: string;
}) {
  const url = value?.trim() || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
      <p className={labelClass()}>{label}</p>
      {url ? (
        <div className="flex min-h-[64px] items-center justify-center rounded-lg bg-[#0A1F44]/40 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="max-h-14 max-w-full object-contain" />
        </div>
      ) : (
        <p className="text-xs text-[#E8EDED]/40">Sem URL configurada</p>
      )}
      {readOnly ? (
        <p className="break-all font-mono text-xs text-[#E8EDED]/60">{url || '—'}</p>
      ) : (
        <>
          <input
            type="text"
            value={url}
            onChange={(e) => onChange?.(e.target.value.trim() || null)}
            className={inputClass()}
            placeholder="https://... ou /caminho-publico.jpg"
          />
          {onUpload ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-[#4CCB7A]/40 bg-[#4CCB7A]/15 px-3 py-1.5 text-xs font-medium text-[#4CCB7A] hover:bg-[#4CCB7A]/25 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                Enviar arquivo
              </button>
              {url ? (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => onChange?.(null)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-[#E8EDED]/70 hover:bg-white/10 disabled:opacity-50"
                >
                  Remover
                </button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/x-icon"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
          ) : null}
        </>
      )}
      {hint ? <p className="text-xs text-[#E8EDED]/45">{hint}</p> : null}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      <p className={labelClass()}>{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-white/20 bg-transparent"
        />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass()} />
      </div>
    </div>
  );
}

function brandingToForm(b: OrganizationBrandingStored): OrganizationBrandingStored {
  return JSON.parse(JSON.stringify(b)) as OrganizationBrandingStored;
}

export default function OrganizationBrandingPanel({
  user,
  organizationId = META_ADMIN_GERAL_ACTIVE_ORG.id,
}: OrganizationBrandingPanelProps) {
  const [data, setData] = useState<OrganizationBrandingApiResponse | null>(null);
  const [form, setForm] = useState<OrganizationBrandingStored | null>(null);
  const [savedForm, setSavedForm] = useState<OrganizationBrandingStored | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSaveOk(false);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/metaadmingeral/organizations/${organizationId}/branding`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Falha ao carregar Marca da Organização');
      }
      const payload = json as OrganizationBrandingApiResponse;
      setData(payload);
      const next = brandingToForm(payload.branding);
      setForm(next);
      setSavedForm(brandingToForm(payload.branding));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setData(null);
      setForm(null);
      setSavedForm(null);
    } finally {
      setLoading(false);
    }
  }, [organizationId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const isDirty = useMemo(() => {
    if (!form || !savedForm) return false;
    return JSON.stringify(form) !== JSON.stringify(savedForm);
  }, [form, savedForm]);

  const patchForm = useCallback((patch: Partial<OrganizationBrandingStored>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaveOk(false);
  }, []);

  const uploadBrandingImage = useCallback(
    async (tipo: string, file: File, applyUrl: (url: string) => void) => {
      setUploadingField(tipo);
      setError('');
      try {
        const token = await user.getIdToken();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', tipo);
        const res = await fetch(
          `/api/metaadmingeral/organizations/${organizationId}/branding/upload`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Falha ao enviar imagem');
        }
        applyUrl(String(json.url));
        setSaveOk(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao enviar imagem');
      } finally {
        setUploadingField(null);
      }
    },
    [organizationId, user],
  );

  const save = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    setSaveOk(false);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/metaadmingeral/organizations/${organizationId}/branding`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branding: form }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Falha ao salvar');
      }
      await load();
      setSaveOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }, [form, load, organizationId, user]);

  const branding = data?.branding;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-6 w-6 text-[#4CCB7A]" />
            <h2 className="text-2xl font-bold text-[#E8EDED]">Marca da Organização</h2>
          </div>
          <p className="mt-1 text-sm text-[#E8EDED]/60">
            Proprietária oficial: <span className="font-mono">organizations/{organizationId}.branding</span>
            {' · '}
            {META_ADMIN_GERAL_ACTIVE_ORG.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-[#E8EDED] hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!isDirty || saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#4CCB7A] px-4 py-2 text-sm font-semibold text-[#0A1F44] hover:bg-[#45b86d] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Marca
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#4CCB7A]/25 bg-[#4CCB7A]/10 px-4 py-3 text-sm text-[#E8EDED]/90">
        Edição salva em <strong>organizations/metodo.branding</strong>. Use <strong>Enviar arquivo</strong> ou
        cole a URL, depois clique em <strong>Salvar Marca</strong>. Imagens sobem para o Storage da plataforma.
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {saveOk ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#4CCB7A]/30 bg-[#4CCB7A]/10 px-4 py-3 text-sm text-[#4CCB7A]">
          <CheckCircle2 className="h-4 w-4" />
          Marca da Organização salva com sucesso.
        </div>
      ) : null}

      {loading && !form ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#4CCB7A]" />
        </div>
      ) : null}

      {form && branding ? (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            {data?.consolidatedNow ? (
              <span className="rounded-full bg-[#4CCB7A]/20 px-3 py-1 text-[#4CCB7A]">
                Consolidado da fonte legada nesta sessão (Etapa 11.1)
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[#E8EDED]/70">
              Resolver: {SOURCE_LAYER_LABELS[branding.sourceLayer] ?? branding.sourceLayer}
            </span>
            {data?.legacySources ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[#E8EDED]/50">
                Fallback legado: platformSettings={data.legacySources.hasPlatformMetodoImagens ? 'sim' : 'não'}
                {' · '}
                ricpmota WL={data.legacySources.hasSourceMedicoWhiteLabel ? 'sim' : 'não'}
              </span>
            ) : null}
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#4CCB7A]" />
              <h3 className="text-lg font-semibold text-[#E8EDED]">Institucional</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass()}>Nome da Organização</label>
                <input
                  value={form.publicName}
                  onChange={(e) => patchForm({ publicName: e.target.value })}
                  className={inputClass()}
                />
                <p className="mt-1 text-xs text-[#E8EDED]/45">
                  Institucional (ex: Método Emagrecer). Não é o nome do médico — cada médico usa Dr./Dra. + nome
                  próprio nas páginas /dr.
                </p>
              </div>
              <div>
                <label className={labelClass()}>Domínio (siteUrl)</label>
                <input
                  value={form.siteUrl}
                  onChange={(e) => patchForm({ siteUrl: e.target.value })}
                  className={inputClass()}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass()}>Descrição padrão (OG / links)</label>
                <textarea
                  value={form.defaultDescription}
                  onChange={(e) => patchForm({ defaultDescription: e.target.value })}
                  rows={3}
                  className={inputClass()}
                />
              </div>
              <div>
                <label className={labelClass()}>Razão social (opcional)</label>
                <input
                  value={form.legalName ?? ''}
                  onChange={(e) => patchForm({ legalName: e.target.value.trim() || null })}
                  className={inputClass()}
                />
              </div>
              <div>
                <label className={labelClass()}>Slogan (opcional)</label>
                <input
                  value={form.slogan ?? ''}
                  onChange={(e) => patchForm({ slogan: e.target.value.trim() || null })}
                  className={inputClass()}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-[#4CCB7A]" />
              <h3 className="text-lg font-semibold text-[#E8EDED]">Logos e imagens institucionais</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ImageField
                label="Logo principal"
                value={form.logoMainUrl}
                onChange={(v) => patchForm({ logoMainUrl: v })}
                uploading={uploadingField === 'logo-main'}
                onUpload={(file) =>
                  uploadBrandingImage('logo-main', file, (url) => patchForm({ logoMainUrl: url }))
                }
              />
              <ImageField
                label="Logo clara"
                value={form.logoLightUrl}
                onChange={(v) => patchForm({ logoLightUrl: v })}
                uploading={uploadingField === 'logo-light'}
                onUpload={(file) =>
                  uploadBrandingImage('logo-light', file, (url) => patchForm({ logoLightUrl: url }))
                }
                hint="Opcional — exibir em fundos escuros"
              />
              <ImageField
                label="Logo escura"
                value={form.logoDarkUrl}
                onChange={(v) => patchForm({ logoDarkUrl: v })}
                uploading={uploadingField === 'logo-dark'}
                onUpload={(file) =>
                  uploadBrandingImage('logo-dark', file, (url) => patchForm({ logoDarkUrl: url }))
                }
                hint="Opcional — exibir em fundos claros"
              />
              <ImageField
                label="Favicon"
                value={form.faviconUrl}
                onChange={(v) => patchForm({ faviconUrl: v })}
                uploading={uploadingField === 'favicon'}
                onUpload={(file) =>
                  uploadBrandingImage('favicon', file, (url) => patchForm({ faviconUrl: url }))
                }
              />
              <ImageField
                label="Ícone"
                value={form.iconUrl}
                onChange={(v) => patchForm({ iconUrl: v })}
                uploading={uploadingField === 'icon'}
                onUpload={(file) =>
                  uploadBrandingImage('icon', file, (url) => patchForm({ iconUrl: url }))
                }
              />
              <ImageField
                label="Open Graph — site e compartilhamento"
                value={form.ogImageUrl}
                onChange={(v) => patchForm({ ogImageUrl: v })}
                uploading={uploadingField === 'og'}
                onUpload={(file) =>
                  uploadBrandingImage('og', file, (url) => patchForm({ ogImageUrl: url }))
                }
                hint={`Preview ao compartilhar ${form.siteUrl || 'www.ometodoemagrecer.com.br'}. Padrão: ${ORGANIZATION_METODO_OG_FALLBACK_SRC}`}
              />
              <ImageField
                label="Logo PDF"
                value={form.pdfLogoUrl}
                onChange={(v) => patchForm({ pdfLogoUrl: v })}
                uploading={uploadingField === 'pdf'}
                onUpload={(file) =>
                  uploadBrandingImage('pdf', file, (url) => patchForm({ pdfLogoUrl: url }))
                }
              />
              <ImageField
                label="Watermark institucional"
                value={form.watermarkUrl}
                onChange={(v) => patchForm({ watermarkUrl: v })}
                uploading={uploadingField === 'watermark'}
                onUpload={(file) =>
                  uploadBrandingImage('watermark', file, (url) => patchForm({ watermarkUrl: url }))
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[#E8EDED]">Cores</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ColorField
                label="Primária"
                value={form.primaryColor}
                onChange={(v) => patchForm({ primaryColor: v })}
              />
              <ColorField
                label="Secundária"
                value={form.secondaryColor}
                onChange={(v) => patchForm({ secondaryColor: v })}
              />
              <ColorField
                label="Accent"
                value={form.accentColor ?? '#30f278'}
                onChange={(v) => patchForm({ accentColor: v })}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-[#E8EDED]">Páginas públicas</h3>
            {(['dr', 'aplicacao', 'conclusao'] as const).map((kind) => {
              const titles = {
                dr: 'Meu Link (/dr)',
                aplicacao: 'Aplicações (/aplicacao)',
                conclusao: 'Conclusão (/conclusao)',
              };
              const page = form.publicPages[kind];
              return (
                <div key={kind} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-[#E8EDED]">{titles[kind]}</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ColorField
                      label="Fundo"
                      value={page.backgroundColor}
                      onChange={(v) =>
                        patchForm({
                          publicPages: {
                            ...form.publicPages,
                            [kind]: { ...page, backgroundColor: v },
                          },
                        })
                      }
                    />
                    <ColorField
                      label="Texto"
                      value={page.textColor}
                      onChange={(v) =>
                        patchForm({
                          publicPages: {
                            ...form.publicPages,
                            [kind]: { ...page, textColor: v },
                          },
                        })
                      }
                    />
                  </div>
                  <ImageField
                    label="Logo da página"
                    value={page.logoUrl}
                    onChange={(v) =>
                      patchForm({
                        publicPages: {
                          ...form.publicPages,
                          [kind]: { ...page, logoUrl: v },
                        },
                      })
                    }
                    uploading={uploadingField === `public-page-${kind}`}
                    onUpload={(file) =>
                      uploadBrandingImage(`public-page-${kind}`, file, (url) =>
                        patchForm({
                          publicPages: {
                            ...form.publicPages,
                            [kind]: { ...page, logoUrl: url },
                          },
                        }),
                      )
                    }
                  />
                </div>
              );
            })}
            <ImageField
              label="Relatórios (/relatorio) — somente leitura"
              value="/icones/oftware.png"
              readOnly
              hint="Runtime ainda usa ícone Oftware fixo; campo reservado para etapa futura"
            />
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-[#E8EDED]">Instagram / Bio — padrões institucionais</h3>
            <div className="grid gap-4">
              <div>
                <label className={labelClass()}>Headline</label>
                <input
                  value={form.instagramBioDefaults.headline}
                  onChange={(e) =>
                    patchForm({
                      instagramBioDefaults: {
                        ...form.instagramBioDefaults,
                        headline: e.target.value,
                      },
                    })
                  }
                  className={inputClass()}
                />
              </div>
              <div>
                <label className={labelClass()}>Subtítulo</label>
                <input
                  value={form.instagramBioDefaults.subtitle}
                  onChange={(e) =>
                    patchForm({
                      instagramBioDefaults: {
                        ...form.instagramBioDefaults,
                        subtitle: e.target.value,
                      },
                    })
                  }
                  className={inputClass()}
                />
              </div>
              <div>
                <label className={labelClass()}>Botão de contato</label>
                <input
                  value={form.instagramBioDefaults.contactButtonLabel}
                  onChange={(e) =>
                    patchForm({
                      instagramBioDefaults: {
                        ...form.instagramBioDefaults,
                        contactButtonLabel: e.target.value,
                      },
                    })
                  }
                  className={inputClass()}
                />
              </div>
              <div>
                <label className={labelClass()}>Link emagrecimento (institucional)</label>
                <input
                  value={form.instagramBioDefaults.emagrecimentoUrl}
                  onChange={(e) =>
                    patchForm({
                      instagramBioDefaults: {
                        ...form.instagramBioDefaults,
                        emagrecimentoUrl: e.target.value,
                      },
                    })
                  }
                  className={inputClass()}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showPoweredByOftware}
                onChange={(e) => patchForm({ showPoweredByOftware: e.target.checked })}
                className="mt-1 h-4 w-4 rounded"
              />
              <span className="text-sm text-[#E8EDED]/85">Exibir &quot;Powered by Oftware&quot; nas páginas públicas</span>
            </label>
          </section>
        </>
      ) : null}
    </div>
  );
}
