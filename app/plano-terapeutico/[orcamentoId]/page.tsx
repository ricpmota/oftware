import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ orcamentoId: string }>;
  searchParams: Promise<{ t?: string }>;
};

/** Compat — links antigos em /plano-terapeutico redirecionam para /plano. */
export default async function PlanoTerapeuticoLegacyRedirect({ params, searchParams }: Props) {
  const { orcamentoId } = await params;
  const { t } = await searchParams;
  const qs = t?.trim() ? `?t=${encodeURIComponent(t.trim())}` : '';
  redirect(`/plano/${encodeURIComponent(orcamentoId)}${qs}`);
}
