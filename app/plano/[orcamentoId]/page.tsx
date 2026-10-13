import PlanoTerapeuticoInterativoClient from '@/components/planoTerapeutico/PlanoTerapeuticoInterativoClient';
import { resolverAcessoPublicoPlano } from '@/lib/server/planoTerapeuticoInterativoStore';
import { normalizePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';

type Props = {
  params: Promise<{ orcamentoId: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function PlanoPage({ params, searchParams }: Props) {
  const { orcamentoId: pathId } = await params;
  const { t } = await searchParams;
  const queryToken = t?.trim() ?? '';

  if (queryToken) {
    return (
      <PlanoTerapeuticoInterativoClient
        orcamentoId={pathId}
        token={normalizePublicLinkToken(queryToken)}
      />
    );
  }

  const acesso = await resolverAcessoPublicoPlano(pathId, null);

  return (
    <PlanoTerapeuticoInterativoClient
      orcamentoId={acesso?.orcamentoId ?? ''}
      token={acesso?.token ?? ''}
    />
  );
}
