import InstagramHubNotActive from '@/components/instagram/InstagramHubNotActive';
import InstagramHubNotFound from '@/components/instagram/InstagramHubNotFound';
import InstagramHubPageClient from '@/components/instagram/InstagramHubPageClient';
import { buildInstagramWhiteLabelHub } from '@/lib/instagram/buildInstagramWhiteLabelHub';
import { isInstagramBioHubActive } from '@/lib/instagram/instagramBioConfig';
import { findMedicoByCrm } from '@/lib/instagram/findMedicoByCrm.server';
import { parseCrmUfParam } from '@/lib/instagram/parseCrmUfParam';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ crmUf: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { crmUf } = await params;
    const parsed = parseCrmUfParam(crmUf);
    if (!parsed) {
      return { title: 'Link não encontrado | Oftware' };
    }

    const medico = await findMedicoByCrm(parsed.uf, parsed.numero);
    if (!medico) {
      return { title: 'Link não encontrado | Oftware' };
    }

    const tratamento = medico.genero === 'F' ? 'Dra.' : 'Dr.';
    return {
      title: `${tratamento} ${medico.nome} | Link da Bio`,
      description:
        'Acompanhamento digital para emagrecimento e saúde metabólica. Escolha como deseja começar.',
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Link da Bio | Oftware' };
  }
}

export default async function InstagramWhiteLabelPage({ params }: PageProps) {
  const { crmUf } = await params;
  const parsed = parseCrmUfParam(crmUf);
  if (!parsed) return <InstagramHubNotFound />;

  let medico = null;
  try {
    medico = await findMedicoByCrm(parsed.uf, parsed.numero);
  } catch {
    return <InstagramHubNotFound />;
  }

  if (!medico) return <InstagramHubNotFound />;

  if (!isInstagramBioHubActive(medico.instagramBio)) {
    return <InstagramHubNotActive />;
  }

  const config = buildInstagramWhiteLabelHub(medico);
  return <InstagramHubPageClient config={config} enableAnalytics analyticsMedicoId={medico.id} />;
}
