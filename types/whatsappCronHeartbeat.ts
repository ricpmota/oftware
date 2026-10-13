export type WhatsappCronHeartbeatDto = {
  ranAt: string;
  brasilDateKey: string;
  brasilHhmm: string;
  host?: string;
  skipped: boolean;
  skipReason?: string;
  skipMessage?: string;
  medicos: number;
  enviados: number;
  falhas: number;
  minutosAtras?: number;
};
