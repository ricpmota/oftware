import { criarCalendarioDoses } from '@/lib/aplicacao/criarCalendarioDoses';

/**
 * Data do card "Conclusão" no calendário: última aplicação planejada (cron doses) + 7 dias.
 * Alinhado ao cron de e-mails de aplicação (sem datasAplicacaoIndividuais — mesma limitação).
 */
export function dataConclusaoPrevisaoPaciente(planoTerapeutico: any, evolucaoSeguimento: any[]): Date | null {
  const cal = criarCalendarioDoses(planoTerapeutico, evolucaoSeguimento || []);
  if (cal.length === 0) return null;
  const ultima = cal[cal.length - 1];
  const d = new Date(ultima.data.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 7);
  return d;
}
