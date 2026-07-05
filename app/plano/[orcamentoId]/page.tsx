import PlanoTerapeuticoInterativoClient from '@/components/planoTerapeutico/PlanoTerapeuticoInterativoClient';

type Props = {
  params: Promise<{ orcamentoId: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function PlanoPage({ params, searchParams }: Props) {
  const { orcamentoId } = await params;
  const { t } = await searchParams;
  const token = t?.trim() ?? '';

  return <PlanoTerapeuticoInterativoClient orcamentoId={orcamentoId} token={token} />;
}
