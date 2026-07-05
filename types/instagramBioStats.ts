export type InstagramBioStatsProfileKey =
  | 'emagrecer'
  | 'nutricionista'
  | 'personal'
  | 'fundador'
  | 'medico';

export type InstagramBioStatsDailyEntry = {
  views: number;
  clicks: number;
  whatsapp: number;
};

export type InstagramBioStatsByProfile = Record<InstagramBioStatsProfileKey, number>;

/** Documento agregado: `instagramBioStats/{medicoId}` */
export type InstagramBioStatsDoc = {
  views: number;
  clicks: number;
  whatsappClicks: number;
  byProfile: InstagramBioStatsByProfile;
  /** Chave `YYYY-MM-DD` — mantém só os últimos 7 dias na escrita. */
  daily: Record<string, InstagramBioStatsDailyEntry>;
  updatedAt?: unknown;
};

export type InstagramBioStatsDailyPoint = {
  date: string;
  label: string;
  views: number;
  clicks: number;
  whatsapp: number;
};

export type InstagramBioStatsApiResponse = {
  totals: {
    views: number;
    clicks: number;
    whatsappClicks: number;
    conversionRate: number;
  };
  last7Days: {
    views: number;
    clicks: number;
    whatsappClicks: number;
    conversionRate: number;
  };
  byProfile: InstagramBioStatsByProfile;
  chart: InstagramBioStatsDailyPoint[];
  insights: string[];
};
