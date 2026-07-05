import type { Medico } from '@/types/medico';
import { META_MEDICO_CHAT_INTRO_SESSION_KEY, META_MEDICO_STEP_COMPLETO } from './constants';
import { isIntroMedicoSessionDone } from './helpers';

export function getFirstIncompleteMedicoStep(
  m: Medico | null | undefined,
  introSessionKey: string = META_MEDICO_CHAT_INTRO_SESSION_KEY
): number {
  if (!m) return 0;
  if (!isIntroMedicoSessionDone(introSessionKey)) return 0;
  if (!(m.nome || '').trim()) return 1;
  const tel = (m.telefone || '').replace(/\D/g, '');
  if (tel.length < 10) return 2;
  if (m.genero !== 'M' && m.genero !== 'F') return 3;
  const cpf = (m.cpfPessoal || '').replace(/\D/g, '');
  if (cpf.length !== 11) return 4;
  if (!(m.crm?.numero || '').trim() || !(m.crm?.estado || '').trim()) return 5;
  if (!(m.localizacao?.endereco || '').trim()) return 6;
  if (!m.cidades?.length) return 7;
  if (!(m.docVerificacaoCnhUrl || '').trim()) return 8;
  if (!(m.docVerificacaoSelfieUrl || '').trim()) return 9;
  if (!(m.docVerificacaoCrmUrl || '').trim()) return 10;
  return META_MEDICO_STEP_COMPLETO;
}

export function isMedicoVerificacaoWizardCompleto(m: Medico | null | undefined): boolean {
  return getFirstIncompleteMedicoStep(m) === META_MEDICO_STEP_COMPLETO;
}
