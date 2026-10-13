import type { ReactNode } from 'react';
import { shouldShowOrganizationLogoInMobileHeader } from '@/lib/organization/resolveOrganizationShellLogoUrl';

type OrganizationShellMobileMarkProps = {
  organizationId?: string | null;
  logoSrc?: string | null;
  alt: string;
  className?: string;
  children: ReactNode;
};

/** Troca só o ícone profissional pela logo da organização. O Método segue com o ícone atual. */
export default function OrganizationShellMobileMark({
  organizationId,
  logoSrc,
  alt,
  className = 'h-6 w-6 shrink-0 object-contain',
  children,
}: OrganizationShellMobileMarkProps) {
  if (shouldShowOrganizationLogoInMobileHeader(organizationId, logoSrc) && logoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoSrc} alt={alt} className={className} />
    );
  }
  return children;
}
