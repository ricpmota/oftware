import WhiteLabelLeadPageClient from '@/components/whitelabel/WhiteLabelLeadPageClient';
import { parseWhiteLabelProfissao } from '@/lib/whiteLabel/profissao';
import type { WhiteLabelLeadFlowMode } from '@/lib/whiteLabel/whiteLabelInstagramFlow';

type Props = {
  searchParams: Promise<{ profissao?: string; origem?: string }>;
};

export default async function WhiteLabelPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialProfissao = params.profissao
    ? parseWhiteLabelProfissao(params.profissao, 'medico')
    : undefined;
  const flowMode: WhiteLabelLeadFlowMode =
    params.origem === 'instagram' ? 'instagram' : 'default';

  return (
    <WhiteLabelLeadPageClient initialProfissao={initialProfissao} flowMode={flowMode} />
  );
}
