export type RecomendacaoConsentStep = 'aplicacao';

export type RecomendacaoConsentRecord = {
  id?: string;
  patientId: string;
  acceptedAt: Date;
  termVersion: string;
  step: RecomendacaoConsentStep;
  topicsCompleted: readonly ['alimentacao', 'exercicios', 'aplicacao'];
  ip?: string | null;
  userAgent?: string | null;
};
