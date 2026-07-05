import { getOiValidationSnapshot } from '@/lib/oi/oiValidationSnapshot';
import MetaAdminGeralOiValidationPage from '@/components/metaadmingeral/MetaAdminGeralOiValidationPage';

export default function OiValidationRoutePage() {
  const snapshot = getOiValidationSnapshot();
  return <MetaAdminGeralOiValidationPage snapshot={snapshot} />;
}
