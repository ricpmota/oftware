import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  ensureImcOnMedidasIniciais,
  type MedidasIniciaisLike,
} from '@/lib/meta/medidasIniciaisImc';
import {
  getPerfilMetabolicoBotText,
  isPerfilMetabolicoChatStep,
} from '@/lib/meta/perfilMetabolicoV3Chat';
import {
  CHAT_BOT_TEXTS,
  META_CHAT_STEP_PERFIL_COMPLETO,
  RISK_QUESTIONS,
  type RiskOption,
  TEXTO_PESQUISA_MEDICO,
} from './constants';

export function isIntroSessionDone(introKey: string): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(introKey) === '1';
}

export function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, (_, a) => (a ? `(${a}` : ''));
  return digits.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? '-' + c : ''}`);
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => [a, b, c].filter(Boolean).join('.') + (d ? `-${d}` : ''));
}

/** Converte input de altura para cm: se tiver ponto ou vírgula = metros; senão = cm. */
export function parseAlturaToCm(raw: string): number | undefined {
  const s = raw.replace(',', '.').trim();
  if (!s) return undefined;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return undefined;
  const isMeters = raw.includes(',') || raw.includes('.');
  if (isMeters) return Math.round(n * 100);
  return Math.round(n);
}

/** Converte input circunferência para cm: ponto ou vírgula = metros; senão = cm. */
export function parseCircToCm(raw: string): number | undefined {
  const s = raw.replace(',', '.').trim();
  if (!s) return undefined;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return undefined;
  const isMeters = raw.includes(',') || raw.includes('.');
  if (isMeters) return Math.round(n * 100);
  return Math.round(n);
}

export function patchMedidasIniciais(
  base: PacienteCompleto['dadosClinicos']['medidasIniciais'] | undefined,
  patch: MedidasIniciaisLike
) {
  return ensureImcOnMedidasIniciais({
    peso: base?.peso ?? 0,
    altura: base?.altura ?? 0,
    imc: base?.imc ?? 0,
    circunferenciaAbdominal: base?.circunferenciaAbdominal ?? 0,
    circunferenciaNaoInformada: base?.circunferenciaNaoInformada,
    ...patch,
  });
}

export function filterRiskQuestionsForSexo(sexo: string | undefined) {
  return RISK_QUESTIONS.filter((r) =>
    r.key === 'gestacao' || r.key === 'lactacao' ? sexo === 'F' || sexo === 'Outro' : true
  );
}

export function riskOptionLabel(opt: RiskOption | string): string {
  if (opt === 'nao') return 'Não';
  if (opt === 'sim') return 'Sim';
  return 'Desconheço';
}

/** Índice na lista filtrada por sexo da primeira pergunta de risco ainda sem resposta (passo 11). */
export function getFirstUnansweredRiskIndex(p: PacienteCompleto): number {
  const sexo = p.dadosIdentificacao?.sexoBiologico;
  const riskList = filterRiskQuestionsForSexo(sexo);
  if (riskList.length === 0) return 0;
  const riscos = p.dadosClinicos?.riscos as Record<string, string> | undefined;
  const idx = riskList.findIndex((r) => {
    const v = riscos?.[r.key];
    return v == null || String(v).trim() === '';
  });
  return idx < 0 ? 0 : idx;
}

export function splitStepText(text: string): { title: string; hint?: string } {
  const parts = text.split('\n\n');
  return { title: parts[0] ?? text, hint: parts[1] };
}

export function getInitialBotTextForStep(step: number): string | null {
  if (step === 0) return null;
  if (step === META_CHAT_STEP_PERFIL_COMPLETO) return null;
  const perfilText = getPerfilMetabolicoBotText(step);
  if (perfilText) return perfilText;
  if (step >= 15) return TEXTO_PESQUISA_MEDICO;
  return CHAT_BOT_TEXTS[step - 1] ?? null;
}

export function getStepTitleAndHint(step: number): { title: string; hint?: string } | null {
  const raw = getInitialBotTextForStep(step);
  if (!raw) return null;
  return splitStepText(raw);
}

/** Só médicos verificados entram na busca por UF/cidade do chat inicial. */
export function medicoElegivelListaPaciente(m: Medico): boolean {
  return m.isVerificado === true && !!(m.cidades?.length);
}

export function getMedicoChatDisplayName(medico: Pick<Medico, 'nome' | 'genero'>): string {
  const cap = (s: string) => (s.charAt(0).toUpperCase() + (s.slice(1) || '').toLowerCase()).trim();
  const parts = (medico.nome || '').trim().split(/\s+/).filter(Boolean);
  const nomeCurto =
    parts.length <= 1
      ? cap(parts[0] || medico.nome || '')
      : `${cap(parts[0])} ${cap(parts[parts.length - 1])}`;
  return `${medico.genero === 'F' ? 'Dra.' : 'Dr.'} ${nomeCurto}`.trim();
}

export function isMetaChatAnamneseStep(step: number): boolean {
  return step >= 1 && step <= 14;
}

export function isMetaChatMedicoStep(step: number): boolean {
  return step === 15 || step === 16;
}

export function isMetaChatTerminalStep(step: number): boolean {
  return step === META_CHAT_STEP_PERFIL_COMPLETO || step === 18;
}

export function isPerfilMetabolicoStep(step: number): boolean {
  return isPerfilMetabolicoChatStep(step);
}
