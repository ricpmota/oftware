import { RICARDO_MOTA_EMAIL } from '@/lib/instagram/instagramBioStatsConstants';
import type { InstagramBioStatsByProfile, InstagramBioStatsProfileKey } from '@/types/instagramBioStats';

type InsightInput = {
  last7Days: { views: number; clicks: number; whatsappClicks: number };
  byProfile: InstagramBioStatsByProfile;
  medicoEmail?: string;
};

const PROFILE_LABELS: Record<InstagramBioStatsProfileKey, string> = {
  emagrecer: 'Quero Emagrecer',
  nutricionista: 'Nutricionista',
  personal: 'Personal',
  fundador: 'Falar com Médico',
  medico: 'Sou Médico',
};

export function buildInstagramBioInsights(input: InsightInput): string[] {
  const insights: string[] = [];
  const { last7Days, byProfile, medicoEmail } = input;
  const isRicardo = medicoEmail?.trim().toLowerCase() === RICARDO_MOTA_EMAIL;

  if (last7Days.views > 0) {
    insights.push(
      `Seu link foi visualizado ${last7Days.views.toLocaleString('pt-BR')} ${last7Days.views === 1 ? 'vez' : 'vezes'} nos últimos 7 dias.`,
    );
  }

  const clickTotal = Object.values(byProfile).reduce((sum, n) => sum + n, 0);
  if (clickTotal > 0) {
    const ranked = (Object.entries(byProfile) as [InstagramBioStatsProfileKey, number][])
      .filter(([key, count]) => count > 0 && (isRicardo || key !== 'medico'))
      .sort((a, b) => b[1] - a[1]);

    if (ranked.length > 0) {
      const [topKey, topCount] = ranked[0];
      const label =
        topKey === 'fundador' && isRicardo ? 'Falar com Dr. Ricardo' : PROFILE_LABELS[topKey];
      const pct = Math.round((topCount / clickTotal) * 100);
      insights.push(`Seu botão ${label} recebeu ${pct}% dos cliques.`);
    }
  }

  if (last7Days.whatsappClicks > 0) {
    insights.push(
      `${last7Days.whatsappClicks.toLocaleString('pt-BR')} ${last7Days.whatsappClicks === 1 ? 'pessoa iniciou' : 'pessoas iniciaram'} contato pelo WhatsApp.`,
    );
  }

  if (last7Days.views > 0 && last7Days.clicks > 0) {
    const ctr = Math.round((last7Days.clicks / last7Days.views) * 100);
    insights.push(`${ctr}% dos visitantes clicaram em algum botão do seu link.`);
  }

  if (insights.length === 0) {
    insights.push(
      'Ainda não há dados suficientes. Compartilhe seu Link da Bio para começar a acompanhar o funil.',
    );
  }

  return insights.slice(0, 4);
}
