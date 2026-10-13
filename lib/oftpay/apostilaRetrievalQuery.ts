/**
 * Reformulação determinística só para o retrieval.
 * A mensagem exibida ao usuário não muda.
 * Não chama modelo.
 */

const FOLLOW_UP_MAX_WORDS = 6;

const QUESTION_PREFIX =
  /^(?:por favor[, ]+)?(?:me )?(?:quais são|quais|qual é|qual o|qual a|qual|o que é|o que são|o que|como é|como são|como|fale sobre|fala sobre|me fale sobre|explique|descreva)\s+/i;

const ASPECT_PREFIX =
  /^(?:causas?|tratamentos?|sintomas?|diagn[oó]sticos?|classifica[cç][aã]o|fisiopatologia|complica[cç][oõ]es|preven[cç][aã]o|quadro cl[ií]nico|conduta|defini[cç][aã]o|manifesta[cç][oõ]es|caracter[ií]sticas|tipos?|sinais)\s+(?:de|do|da|dos|das)\s+/i;

const PRODUCT_QUESTION =
  /\b(oftware|oftpay|oftreview|login|senha|conta|assinatura|acesso|cronograma|planejador|dashboard|aplicativo|\bapp\b|interface|exportar|importar|resetar|bot[aã]o|player|v[ií]deos?|como (eu )?uso|onde (fica|est[aá]|acho)|aba do|menu)\b/i;

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function isFollowUpQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^continu(?:e|a|ar)?\b/i.test(trimmed)) return true;
  if (/^e\b/i.test(trimmed)) return true;
  return words(trimmed).length <= FOLLOW_UP_MAX_WORDS;
}

function stripFollowUpLead(text: string): string {
  return text
    .trim()
    .replace(/[?!.…]+$/g, '')
    .replace(/^e\s+/i, '')
    .replace(/^(?:qual|quais|como)\s+/i, '')
    .replace(/^(?:o|a|os|as)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractApostilaTopic(text: string): string {
  let topic = text.trim().replace(/[?!.…]+$/g, '').replace(/\s+/g, ' ');
  topic = topic.replace(QUESTION_PREFIX, '');
  topic = topic.replace(/^(?:as|os|a|o|um|uma)\s+/i, '');
  topic = topic.replace(/^principais?\s+/i, '');
  topic = topic.replace(ASPECT_PREFIX, '');
  return topic.trim();
}

/**
 * Pergunta sobre o produto, a interface ou a conta.
 * O restante, no chatbot das apostilas, é tratado como conteúdo clínico.
 */
export function isApostilaProductQuestion(text: string): boolean {
  return PRODUCT_QUESTION.test(text);
}

export function buildApostilaRetrievalQuery(message: string, priorUserMessages: string[] = []): string {
  const current = message.trim();
  const prior = priorUserMessages.map((item) => item.trim()).filter(Boolean).slice(-4);
  if (!current || !isFollowUpQuestion(current) || prior.length === 0) return current;

  if (/^continu(?:e|a|ar)?\b/i.test(current)) {
    const last = prior[prior.length - 1];
    return buildApostilaRetrievalQuery(last, prior.slice(0, -1));
  }

  let anchorIndex = 0;
  for (let i = prior.length - 1; i >= 0; i -= 1) {
    if (!isFollowUpQuestion(prior[i])) {
      anchorIndex = i;
      break;
    }
  }

  const topic = extractApostilaTopic(prior[anchorIndex]);
  const currentCore = stripFollowUpLead(current);
  if (!topic) return current;

  const bridges = prior
    .slice(anchorIndex + 1)
    .map(stripFollowUpLead)
    .filter(Boolean);

  if (bridges.length === 0) return `${currentCore} de ${topic}`.replace(/\s+/g, ' ').trim();
  return `${bridges.join(' ')} de ${topic} ${currentCore}`.replace(/\s+/g, ' ').trim();
}
