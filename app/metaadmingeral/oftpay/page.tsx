'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { OFTPAY_OWNER_EMAIL } from '@/types/oftpayAccess';
import { metaAdminGeralAcessarUrl } from '@/lib/metaadmin/metaAdminGeralLogin';

/**
 * Redireciona para o Meta Admin Geral com o menu OftPay ativo.
 * A lista de usuários e liberação de cursos ficam na própria página do Meta Admin Geral (aba OftPay), igual a Médicos, Nutricionistas e Personal.
 */
export default function MetaAdminGeralOftPayRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.replace(metaAdminGeralAcessarUrl('/metaadmingeral?menu=oftpay'));
        return;
      }
      if (firebaseUser.email?.trim().toLowerCase() !== OFTPAY_OWNER_EMAIL.trim().toLowerCase()) {
        router.replace('/meta');
        return;
      }
      router.replace('/metaadmingeral?menu=oftpay');
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
    </div>
  );
}
