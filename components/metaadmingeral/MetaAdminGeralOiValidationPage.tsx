'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';
import { metaAdminGeralAcessarUrl } from '@/lib/metaadmin/metaAdminGeralLogin';
import { META_ADMIN_GERAL_BRANDING, META_ADMIN_GERAL_SHELL } from '@/lib/metaadmin/metaAdminGeralBranding';
import { MetaAdminGeralLoadingScreen } from '@/components/metaadmingeral/MetaAdminGeralBrandMark';
import OiValidationPanel from '@/components/metaadmingeral/OiValidationPanel';
import type { OiValidationSnapshot } from '@/lib/oi/oiValidationSnapshot';

type MetaAdminGeralOiValidationPageProps = {
  snapshot: OiValidationSnapshot;
};

export default function MetaAdminGeralOiValidationPage({ snapshot }: MetaAdminGeralOiValidationPageProps) {
  const router = useRouter();
  const [userLoading, setUserLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserLoading(false);
      if (!u) {
        router.replace(metaAdminGeralAcessarUrl('/metaadmingeral/oi-validation'));
        return;
      }
      if (u.email?.trim().toLowerCase() !== METAADMIN_GERAL_EMAIL.trim().toLowerCase()) {
        router.replace('/meta');
        return;
      }
      setAuthorized(true);
    });
    return () => unsub();
  }, [router]);

  if (userLoading || !authorized) {
    return <MetaAdminGeralLoadingScreen />;
  }

  return (
    <div className={`${META_ADMIN_GERAL_SHELL.page} min-h-screen`}>
      <header className="shrink-0 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => router.push('/metaadmingeral?menu=platform-patrimonio')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          MetaAdminGeral · {META_ADMIN_GERAL_BRANDING.productName}
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <OiValidationPanel snapshot={snapshot} />
      </main>
    </div>
  );
}
