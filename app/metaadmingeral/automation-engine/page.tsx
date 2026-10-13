import { redirect } from 'next/navigation';

/** Compatibilidade — abre dentro do shell MetaAdmin Geral. */
export default function AutomationEngineRedirectPage() {
  redirect('/metaadmingeral?menu=automation-ops');
}
