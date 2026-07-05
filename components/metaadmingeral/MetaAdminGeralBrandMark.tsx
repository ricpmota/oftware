import {
  META_ADMIN_GERAL_BRANDING,
  META_ADMIN_GERAL_SHELL,
} from '@/lib/metaadmin/metaAdminGeralBranding';

type MetaAdminGeralBrandMarkProps = {
  collapsed?: boolean;
  /** sidebar = logo + tagline; mobile = logo compacto */
  variant?: 'sidebar' | 'mobile';
};

export default function MetaAdminGeralBrandMark({
  collapsed = false,
  variant = 'sidebar',
}: MetaAdminGeralBrandMarkProps) {
  const { logoFullSrc, logoFullAlt, logoIconSrc, logoIconAlt, productName } =
    META_ADMIN_GERAL_BRANDING;

  if (collapsed) {
    return (
      <img
        src={logoIconSrc}
        alt={logoIconAlt}
        title={productName}
        className="h-9 w-9 object-contain"
      />
    );
  }

  const logoHeight = variant === 'mobile' ? 'h-8' : 'h-9';

  return (
    <div className="flex min-w-0 flex-col">
      <img
        src={logoFullSrc}
        alt={logoFullAlt}
        className={`${logoHeight} w-auto max-w-[140px] object-contain`}
      />
    </div>
  );
}

export function MetaAdminGeralLoadingScreen({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className={`flex min-h-screen items-center justify-center ${META_ADMIN_GERAL_SHELL.page}`}>
      <div className="text-center">
        <MetaAdminGeralBrandMark variant="mobile" />
        <div
          className={`mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-b-2 ${META_ADMIN_GERAL_SHELL.spinner}`}
        />
        <p className="mt-4 text-sm text-[#E8EDED]/70">{label}</p>
      </div>
    </div>
  );
}
