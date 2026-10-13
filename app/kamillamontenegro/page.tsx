import KamillaHomePage from '@/components/kamilla-montenegro/KamillaHomePage';
import { loadKamillaInstitutionalContent } from '@/lib/kamilla-montenegro/loadInstitutionalContent.server';

export const dynamic = 'force-dynamic';

export default async function KamillaMontenegroPage() {
  const content = await loadKamillaInstitutionalContent();
  return <KamillaHomePage content={content} />;
}
