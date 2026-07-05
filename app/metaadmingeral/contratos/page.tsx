'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';
import { metaAdminGeralAcessarUrl } from '@/lib/metaadmin/metaAdminGeralLogin';

export default function MetaAdminGeralContratosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.replace(metaAdminGeralAcessarUrl('/metaadmingeral?menu=contratos'));
        return;
      }

      if (firebaseUser.email?.trim().toLowerCase() !== METAADMIN_GERAL_EMAIL.trim().toLowerCase()) {
        router.replace('/meta');
        return;
      }

      router.replace('/metaadmingeral?menu=contratos');
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1F44]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4CCB7A]" />
    </div>
  );
}
