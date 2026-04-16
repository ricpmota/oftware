import type { Firestore } from 'firebase-admin/firestore';
import { criarCalendarioDoses } from './criarCalendarioDoses';
import { ensureAplicacaoPublicUrl } from './ensureAplicacaoPublicLink';

/** Resolve a URL pública /aplicacao/{token} para a semana N do calendário do paciente. */
export async function getAplicacaoPublicUrlForSemana(
  db: Firestore,
  pacienteId: string,
  paciente: { planoTerapeutico?: any; evolucaoSeguimento?: any[] },
  numeroAplicacao: number
): Promise<string> {
  const plano = paciente.planoTerapeutico;
  if (!plano?.startDate || !plano.injectionDayOfWeek) {
    return '';
  }
  const cal = criarCalendarioDoses(plano, paciente.evolucaoSeguimento || []);
  const slot = cal.find((c) => c.semana === numeroAplicacao);
  if (!slot) {
    return '';
  }
  try {
    return await ensureAplicacaoPublicUrl(db, {
      pacienteId,
      data: new Date(slot.data.getTime()),
      semana: slot.semana,
      dose: slot.dose,
    });
  } catch (e) {
    console.error('getAplicacaoPublicUrlForSemana:', e);
    return '';
  }
}
