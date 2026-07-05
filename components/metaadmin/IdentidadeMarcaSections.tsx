'use client';

import { useState } from 'react';
import { Globe, Instagram, LayoutTemplate, Palette } from 'lucide-react';
import MedicoInstagramBioSection from '@/components/metaadmin/MedicoInstagramBioSection';
import MedicoWhiteLabelImageEditor from '@/components/metaadmin/MedicoWhiteLabelImageEditor';
import MetaadminWhiteLabelPreview from '@/components/metaadmin/MetaadminWhiteLabelPreview';
import PublicPagesWhiteLabelEditor, {
  type PublicPagesFormValues,
} from '@/components/metaadmin/PublicPagesWhiteLabelEditor';
import { METAADMIN_BROWSER_TITLE_SUFFIX } from '@/lib/metaadmin/metaadminDocumentIdentity';
import type { MeuPerfilMedicoFormFields } from '@/lib/metaadmin/meuPerfilMedicoFormSnapshot';
import type { MetodoImagensTemplate } from '@/lib/metodo/metodoImagens';
import type { MedicoInstagramBio } from '@/types/medicoInstagramBio';

type WhiteLabelPreview = {
  browserTitle: string;
  linkTitle: string;
  linkDescription: string;
  linkImageUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
};

type MedicoPerfilLite = {
  id: string;
  nome: string;
  email?: string;
  genero?: string;
  fotoPerfilUrl?: string | null;
  instagramBio?: MedicoInstagramBio | null;
};

type IdentidadeSubAba = 'navegador' | 'paginas' | 'instagram-bio';

const SUB_ABAS: {
  id: IdentidadeSubAba;
  label: string;
  shortLabel: string;
  icon: typeof Globe;
}[] = [
  { id: 'navegador', label: 'Navegador/PDF', shortLabel: 'Navegador', icon: Globe },
  { id: 'paginas', label: 'Páginas Públicas', shortLabel: 'Páginas', icon: LayoutTemplate },
  { id: 'instagram-bio', label: 'Link da Bio', shortLabel: 'Bio', icon: Instagram },
];

type Props = {
  perfilMedico: MeuPerfilMedicoFormFields;
  onPerfilChange: (patch: Partial<MeuPerfilMedicoFormFields>) => void;
  loadingPerfil: boolean;
  whiteLabelPreview: WhiteLabelPreview;
  publicPagesValues: PublicPagesFormValues;
  onPublicPagesChange: (patch: Partial<PublicPagesFormValues>) => void;
  medicoPerfil: MedicoPerfilLite | null;
  onBioSaved: (bio: MedicoInstagramBio) => void;
  onNotify: (message: string) => void;
  inputClassName: string;
  labelClassName: string;
  /** Médico no padrão Método: imagens fixas, sem upload. */
  metodoImagensLocked?: boolean;
  metodoLockedImageUrls?: Pick<
    MetodoImagensTemplate,
    | 'ogImageUrl'
    | 'faviconUrl'
    | 'pdfLogoUrl'
    | 'drPageLogoUrl'
    | 'aplicacaoPageLogoUrl'
    | 'conclusaoPageLogoUrl'
  > | null;
};

export default function IdentidadeMarcaSections({
  perfilMedico,
  onPerfilChange,
  loadingPerfil,
  whiteLabelPreview,
  publicPagesValues,
  onPublicPagesChange,
  medicoPerfil,
  onBioSaved,
  onNotify,
  inputClassName,
  labelClassName,
  metodoImagensLocked = false,
  metodoLockedImageUrls = null,
}: Props) {
  const [subAba, setSubAba] = useState<IdentidadeSubAba>('navegador');

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2" aria-label="Subpastas da identidade visual">
        {SUB_ABAS.map(({ id, label, shortLabel, icon: Icon }) => {
          const active = subAba === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSubAba(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {subAba === 'navegador' ? (
        <div className="space-y-6">
          {metodoImagensLocked ? (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-sm text-emerald-900 dark:text-emerald-100">
              Você está no <strong>padrão Método</strong>. As imagens de compartilhamento, favicon e logo dos PDFs
              são definidas pela plataforma e não podem ser alteradas aqui.
            </div>
          ) : null}
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="whiteLabelBrandName">
              <Palette className="h-4 w-4 text-emerald-600" />
              Nome na aba do navegador
            </label>
            <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500">
              <input
                id="whiteLabelBrandName"
                type="text"
                value={perfilMedico.whiteLabelBrandName}
                maxLength={60}
                onChange={(e) => onPerfilChange({ whiteLabelBrandName: e.target.value })}
                className="flex-1 min-w-0 px-4 py-2.5 text-sm bg-transparent border-0 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-0"
                placeholder="Ex: Instituto Ricardo Mota, Clínica Metabólica Prime"
              />
              <span className="hidden sm:inline-flex items-center px-3 text-xs text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 shrink-0">
                | {METAADMIN_BROWSER_TITLE_SUFFIX}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {perfilMedico.whiteLabelBrandName.length}/60 caracteres. Também usado nos links compartilhados.
              {perfilMedico.whiteLabelBrandName.trim().length === 0
                ? ' Se vazio, usamos Dr./Dra. + seu nome.'
                : null}
            </p>
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Prévia da aba: {whiteLabelPreview.browserTitle}
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Descrição pública para links</label>
            <textarea
              value={perfilMedico.whiteLabelDescription}
              maxLength={160}
              rows={3}
              onChange={(e) => onPerfilChange({ whiteLabelDescription: e.target.value })}
              className={`${inputClassName} resize-y min-h-[88px]`}
              placeholder="Ex: Acompanhamento médico em obesidade e medicina metabólica com equipe multidisciplinar integrada."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {perfilMedico.whiteLabelDescription.length}/160 caracteres
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-4">
            <div className="space-y-2">
              <label className={labelClassName}>Imagem de compartilhamento dos links</label>
              <MedicoWhiteLabelImageEditor
                currentUrl={
                  metodoImagensLocked
                    ? metodoLockedImageUrls?.ogImageUrl ?? whiteLabelPreview.linkImageUrl
                    : perfilMedico.whiteLabelOgImageUrl
                }
                onUrlChange={(url) => onPerfilChange({ whiteLabelOgImageUrl: url })}
                disabled={loadingPerfil}
                readOnly={metodoImagensLocked}
                hint="Essa imagem e descrição aparecem quando seus links são enviados pelo WhatsApp."
              />
            </div>

            <div className="space-y-2">
              <label className={labelClassName}>Ícone da aba (Favicon)</label>
              <MedicoWhiteLabelImageEditor
                currentUrl={
                  metodoImagensLocked
                    ? metodoLockedImageUrls?.faviconUrl ?? whiteLabelPreview.faviconUrl
                    : perfilMedico.whiteLabelFaviconUrl
                }
                onUrlChange={(url) => onPerfilChange({ whiteLabelFaviconUrl: url })}
                disabled={loadingPerfil}
                readOnly={metodoImagensLocked}
                uploadTipo="favicon"
                allowedTypes={[
                  'image/png',
                  'image/jpeg',
                  'image/jpg',
                  'image/webp',
                  'image/svg+xml',
                  'image/x-icon',
                  'image/vnd.microsoft.icon',
                ]}
                maxSizeBytes={1024 * 1024}
                previewClassName="h-16 w-16 max-h-none aspect-square mx-auto"
                emptyLabel="Clique para enviar favicon"
                hint="Este ícone aparecerá na aba do navegador quando você acessar sua plataforma. PNG, JPG, SVG, ICO ou WebP · máx. 1MB · recomendado 256×256."
              />
            </div>

            <div className="space-y-2">
              <label className={labelClassName}>Logo nos PDFs (prescrições e exames)</label>
              <MedicoWhiteLabelImageEditor
                currentUrl={
                  metodoImagensLocked
                    ? metodoLockedImageUrls?.pdfLogoUrl ?? perfilMedico.whiteLabelPdfLogoUrl
                    : perfilMedico.whiteLabelPdfLogoUrl
                }
                onUrlChange={(url) => onPerfilChange({ whiteLabelPdfLogoUrl: url })}
                disabled={loadingPerfil}
                readOnly={metodoImagensLocked}
                uploadTipo="pdf"
                allowedTypes={['image/png', 'image/jpeg', 'image/jpg']}
                previewClassName="max-h-32"
                emptyLabel="Clique para enviar logo"
                hint="Aparece no canto superior direito das impressões de prescrição e requisição de exames. PNG ou JPG, fundo transparente recomendado. Se não enviar, usamos o logotipo padrão."
              />
            </div>
          </div>

          <MetaadminWhiteLabelPreview
            browserTitle={whiteLabelPreview.browserTitle}
            linkTitle={whiteLabelPreview.linkTitle}
            linkDescription={whiteLabelPreview.linkDescription}
            linkImageUrl={whiteLabelPreview.linkImageUrl}
            faviconUrl={whiteLabelPreview.faviconUrl}
            primaryColor={whiteLabelPreview.primaryColor}
          />
        </div>
      ) : null}

      {subAba === 'paginas' ? (
        <div className="space-y-6">
          {metodoImagensLocked ? (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-sm text-emerald-900 dark:text-emerald-100">
              Logos das páginas públicas (Meu Link, Aplicações e Conclusão) seguem o <strong>padrão Método</strong>.
              Você ainda pode personalizar cores e demais opções.
            </div>
          ) : null}
          <PublicPagesWhiteLabelEditor
            brandName={whiteLabelPreview.linkTitle}
            disabled={loadingPerfil}
            inputClassName={inputClassName}
            labelClassName={labelClassName}
            values={publicPagesValues}
            onChange={onPublicPagesChange}
            metodoLogoLocked={metodoImagensLocked}
            metodoLockedLogos={
              metodoLockedImageUrls
                ? {
                    dr: metodoLockedImageUrls.drPageLogoUrl,
                    aplicacao: metodoLockedImageUrls.aplicacaoPageLogoUrl,
                    conclusao: metodoLockedImageUrls.conclusaoPageLogoUrl,
                  }
                : null
            }
          />

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/30 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={perfilMedico.whiteLabelShowPoweredByOftware}
              onChange={(e) => onPerfilChange({ whiteLabelShowPoweredByOftware: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Exibir &quot;Powered by Oftware&quot; nas páginas enviadas aos pacientes
            </span>
          </label>
        </div>
      ) : null}

      {subAba === 'instagram-bio' && medicoPerfil ? (
        <MedicoInstagramBioSection
          medicoId={medicoPerfil.id}
          medicoNome={medicoPerfil.nome}
          medicoEmail={medicoPerfil.email}
          medicoGenero={
            medicoPerfil.genero === 'M' || medicoPerfil.genero === 'F' ? medicoPerfil.genero : undefined
          }
          crmEstado={perfilMedico.crmEstado}
          crmNumero={perfilMedico.crmNumero}
          defaultTelefone={perfilMedico.telefone}
          initialBio={medicoPerfil.instagramBio}
          disabled={loadingPerfil}
          inputClassName={inputClassName}
          labelClassName={labelClassName}
          onNotify={onNotify}
          onSaved={onBioSaved}
        />
      ) : null}

      {subAba === 'instagram-bio' && !medicoPerfil ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando dados do médico…</p>
      ) : null}
    </div>
  );
}
