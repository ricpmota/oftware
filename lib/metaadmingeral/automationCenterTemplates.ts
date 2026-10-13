import { getAutomationDefinitionById } from '@/lib/metaadmingeral/automationCenterCatalog';
import { renderAutomationTemplate } from '@/lib/metaadmingeral/renderAutomationTemplate';
import { DEFAULT_BOAS_VINDAS_TRATAMENTO_BODY } from '@/lib/whatsapp/boasVindasTratamentoMessage';
import {
  DEFAULT_CONSULTA_CONFIRMACAO_BODY,
  DEFAULT_CONSULTA_LEMBRETE_MEDICO_BODY,
  DEFAULT_CONSULTA_LEMBRETE_PACIENTE_BODY,
  DEFAULT_SOLICITACAO_ACOMPANHAMENTO_BODY,
} from '@/lib/metaadmin/agenda/consultaMessageTemplates';
import type { AutomationTemplate } from '@/types/automationCenter';

const SEED_CREATED_AT = '2026-06-01T12:00:00.000Z';
const SEED_UPDATED_AT = '2026-07-07T10:00:00.000Z';
const SYNC_UPDATED_AT = '2026-07-07T14:00:00.000Z';

const PREVIEW_SAMPLE_VALUES: Record<string, string> = {
  nome: 'Maria',
  medico: 'Dra. Ana Silva',
  crm: 'CRM/SP 123456',
  saudacao: 'bem-vinda',
  artigo: 'a',
  contato_medico: 'a sua médica',
  data: '07/07/2026',
  horario: '14:00 às 15:00',
  horario_inicio: '14:00',
  horario_fim: '15:00',
  paciente: 'Maria Silva',
  link: 'https://exemplo.com/aplicacao/abc123',
  dose: '2,5 mg',
  vencimento: '10/07/2026',
  protocolo: 'Protocolo Mestre',
  valor: 'R$ 1.250,00',
  profissional: 'Ana Costa',
  telefone: '(11) 98888-7777',
  titulo: 'Lembrete',
  mensagem: 'Consulta de retorno amanhã às 10h.',
};

// ── Corpos espelhados do sistema em produção ──────────────────────────────────

/**
 * Fonte: lib/aplicacao/buildAplicacaoWhatsAppMessage.ts (ehHoje=true)
 * Usado por: cron WhatsApp automático + ícone WhatsApp do calendário MetaAdmin (dia da aplicação).
 */
const APLICACAO_DIA_WHATSAPP_BODY = `Olá, {nome}! Hoje é dia da sua aplicação. 💉

Depois de aplicar, é só registrar os dados no link abaixo (leva menos de 1 minuto). Assim consigo acompanhar seu tratamento de perto:

{link}

E se estiver gostando do acompanhamento, ao final você pode indicar o tratamento para alguém que também precise. 💙`;

/**
 * Corpo ATIVO da mensagem de conclusão enviada pelo calendário do MetaAdmin
 * (app/metaadmin/page.tsx lê este template via /api/metaadmin/automacoes/message-templates).
 * Editável pelo MetaAdminGeral. Mensagem única (serve tanto no dia quanto fora dele).
 */
const CONCLUSAO_TRATAMENTO_WHATSAPP_BODY = `Parabéns, {nome}! 🎉 Você chegou ao fim do seu ciclo de tratamento.

Para fecharmos com tudo certinho, registre seus dados finais — *peso* e *comprimento abdominal* — no link abaixo (leva menos de 1 minuto):

{link}

E se este acompanhamento fez diferença pra você, deixe também uma avaliação ao final. Vai significar muito. 🙏`;

// ── Corpos dos lembretes automáticos de aplicação (motor cron send-whatsapp-lembretes) ─

/**
 * Corpo ATIVO do lembrete D-1, enviado pelo motor automático na véspera da
 * aplicação prevista. Apenas aviso, sem link. Editável pelo MetaAdminGeral.
 */
const APLICACAO_D1_WHATSAPP_BODY = `Olá, {nome}! Passando só pra lembrar que amanhã é dia da sua aplicação. 😊

Se precisar de qualquer coisa ou tiver alguma dúvida, é só me chamar. Até lá! 💙`;

/**
 * Corpo ATIVO da mensagem de aplicação atrasada, enviada pelo motor automático
 * (cron send-whatsapp-lembretes) no dia seguinte (D+1) e 3 dias depois (D+3).
 * Editável pelo MetaAdminGeral.
 */
const APLICACAO_ATRASADA_WHATSAPP_BODY = `Olá, {nome}! Passando aqui porque percebi que sua aplicação prevista ainda não foi registrada.

Está tudo bem? Se você já aplicou, é só registrar os dados no link abaixo pra mantermos seu tratamento em dia:

{link}

E se tiver qualquer dúvida ou precisar de ajuda, pode me chamar. Estou por perto. 💙`;

/**
 * Corpo ATIVO do lembrete no dia da aplicação de protocolo injetável.
 * Sem link — o registro/check é feito pelo médico no MetaAdmin.
 */
const INJETAVEL_DIA_WHATSAPP_BODY = `Olá, {nome}! Hoje é dia da sua aplicação de {protocolo}. 💉

Se precisar de qualquer orientação, é só me chamar. Estou por perto. 💙`;

/**
 * Corpo ATIVO do lembrete D-1 de protocolo injetável (véspera).
 */
const INJETAVEL_D1_WHATSAPP_BODY = `Olá, {nome}! Passando só pra lembrar que amanhã é dia da sua aplicação de {protocolo}. 😊

Se precisar de qualquer coisa ou tiver alguma dúvida, é só me chamar. Até lá! 💙`;

/** Template provisório — ainda não existe fluxo real equivalente no WhatsApp. */
const PARCELA_VENCIMENTO_WHATSAPP_BODY_PROVISIONAL = `Olá, {nome}, passando para lembrar que existe uma parcela com vencimento em {vencimento}.

Acesse sua área para mais detalhes:
{link}`;

/**
 * Cobrança avulsa — botão Cobrança no Financeiro (Total em Aberto).
 * Enviada pelo Canal Chat. Sem link (evita bloqueio). Variáveis: nome, valor, medico.
 */
const COBRANCA_AVULSA_WHATSAPP_BODY = `Olá, {nome}!

Passando para lembrar do seu pagamento em aberto conosco.

Valor em aberto: {valor}

Para consultar seu relatório, contate o seu médico, {medico}.`;

/**
 * Cobrança automática — no dia do vencimento da parcela no calendário.
 * Enviada pelo Canal Chat. Sem link (evita bloqueio). Variáveis: nome, valor, data, medico.
 */
const COBRANCA_AUTOMATICA_WHATSAPP_BODY = `Olá, {nome}!

Hoje ({data}) vence a parcela do seu tratamento.

Valor da parcela: {valor}

Para consultar seu relatório, contate o seu médico, {medico}.`;

/**
 * Corpo ATIVO da mensagem de aniversário enviada pelo calendário do MetaAdmin
 * (app/metaadmin/page.tsx lê este template via /api/metaadmin/automacoes/message-templates).
 * Editável pelo MetaAdminGeral. Tom próximo, reforçando disponibilidade do médico.
 */
const ANIVERSARIO_PACIENTE_BODY = `🎉 Feliz aniversário, {nome}!

Passando aqui pra te desejar um dia muito feliz e um novo ano de vida cheio de saúde, leveza e conquistas. 🥳

E fica tranquilo(a): pode contar comigo sempre que precisar. Estou por perto pra cuidar de você e da sua saúde no dia a dia, não só nas consultas. 💙

Aproveite bastante o seu dia!

Um abraço,
{medico}`;

const NUTRI_CHECKIN_SEMANAL_WHATSAPP_BODY = `Olá, {nome}! 👋

Chegou o momento do seu Check-in Semanal de alimentação.

Queremos saber como foi sua semana para acompanhar sua evolução e ajustar seu planejamento quando necessário.

Responda pelo link:
{link}`;

/**
 * Corpo de referência dos lembretes de calendário (Canal Chat → telefoneAviso).
 * O texto enviado em produção monta-se em buildCalendarioLembreteWhatsappMessage;
 * este template documenta o formato editável no hub.
 */
const CALENDARIO_LEMBRETE_WHATSAPP_BODY = `⏰ Lembrete Oftware — {titulo}

{mensagem}

Paciente: {nome}
Data: {data}`;

/**
 * Aviso ao paciente quando aceita compartilhamento com nutri/personal.
 * Espelha o tom de buildMensagemProfissionalAoPaciente.
 */
const COMPARTILHAMENTO_ACEITE_WHATSAPP_BODY = `Olá, {nome}!

Agora estamos conectados por aqui — vinculados pelo {medico}.

A partir de agora, cuido do seu acompanhamento. Pode me chamar neste WhatsApp sempre que precisar.

Um abraço,
{profissional}`;

function buildPreviewBody(body: string, variables: string[]): string {
  const sample: Record<string, string> = {};
  for (const variable of variables) {
    sample[variable] = PREVIEW_SAMPLE_VALUES[variable] ?? `{${variable}}`;
  }
  return renderAutomationTemplate(body, sample);
}

export function buildAutomationTemplatePreviewBody(body: string, variables: string[]): string {
  return buildPreviewBody(body, variables);
}

function templateBase(
  partial: Omit<AutomationTemplate, 'channel' | 'category' | 'previewBody'> & {
    previewBody?: string;
  },
): AutomationTemplate {
  const automation = getAutomationDefinitionById(partial.automationId);
  const previewBody = partial.previewBody ?? buildPreviewBody(partial.body, partial.variables);

  return {
    ...partial,
    previewBody,
    channel: automation?.channel ?? 'whatsapp',
    category: automation?.category ?? 'jornada',
  };
}

/** Biblioteca global — fallback em memória quando não há documento no Firestore. */
export const AUTOMATION_CENTER_TEMPLATES_SEED: AutomationTemplate[] = [
  // ── Espelhados do sistema atual ───────────────────────────────────────────
  templateBase({
    id: 'aplicacao_dia_whatsapp_v1',
    name: 'Lembrete de aplicação no dia — v1',
    description:
      'Espelhado de lib/aplicacao/buildAplicacaoWhatsAppMessage.ts (envio automático WhatsApp e calendário MetaAdmin).',
    status: 'published',
    automationId: 'aplicacao_dia_whatsapp',
    variables: ['nome', 'link'],
    body: APLICACAO_DIA_WHATSAPP_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: SYNC_UPDATED_AT,
  }),
  templateBase({
    id: 'conclusao_tratamento_whatsapp_v1',
    name: 'Conclusão de tratamento — v1',
    description:
      'Mensagem enviada pelo médico no calendário do MetaAdmin ao concluir o tratamento. Editável aqui — o texto salvo é o que o paciente recebe. Publica automaticamente quando a automação está ativa.',
    status: 'planned',
    automationId: 'conclusao_tratamento_whatsapp',
    variables: ['nome', 'link'],
    body: CONCLUSAO_TRATAMENTO_WHATSAPP_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: SYNC_UPDATED_AT,
  }),

  // ── Provisórios / futuros ───────────────────────────────────────────────────
  templateBase({
    id: 'aplicacao_d1_whatsapp_v1',
    name: 'Lembrete de aplicação D-1 — v1',
    description:
      'Aviso enviado automaticamente na véspera da aplicação. Editável aqui — o texto salvo é o que o paciente recebe. Publica automaticamente quando a automação está ativa.',
    status: 'draft',
    automationId: 'aplicacao_d1_whatsapp',
    variables: ['nome'],
    body: APLICACAO_D1_WHATSAPP_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: SYNC_UPDATED_AT,
  }),
  templateBase({
    id: 'aplicacao_atrasada_whatsapp_v1',
    name: 'Aplicação atrasada — v1',
    description:
      'Enviado automaticamente quando a aplicação prevista não foi registrada (no dia seguinte e 3 dias depois). Editável aqui — o texto salvo é o que o paciente recebe. Publica automaticamente quando a automação está ativa.',
    status: 'draft',
    automationId: 'aplicacao_atrasada_whatsapp',
    variables: ['nome', 'link'],
    body: APLICACAO_ATRASADA_WHATSAPP_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: SYNC_UPDATED_AT,
  }),
  templateBase({
    id: 'injetavel_dia_whatsapp_v1',
    name: 'Lembrete de injetável no dia — v1',
    description:
      'Aviso no dia da aplicação de protocolo injetável. Sem link — o check é feito pelo médico. Editável aqui.',
    status: 'published',
    automationId: 'injetavel_dia_whatsapp',
    variables: ['nome', 'protocolo'],
    body: INJETAVEL_DIA_WHATSAPP_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-07-24T12:00:00.000Z',
  }),
  templateBase({
    id: 'injetavel_d1_whatsapp_v1',
    name: 'Lembrete de injetável D-1 — v1',
    description:
      'Aviso na véspera da aplicação de protocolo injetável. Editável aqui — o texto salvo é o que o paciente recebe.',
    status: 'published',
    automationId: 'injetavel_d1_whatsapp',
    variables: ['nome', 'protocolo'],
    body: INJETAVEL_D1_WHATSAPP_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-07-24T12:00:00.000Z',
  }),
  templateBase({
    id: 'boas_vindas_paciente_whatsapp_v1',
    name: 'Boas-vindas ao tratamento',
    description:
      'Enviada pelo Canal Chat quando o médico aceita a solicitação. Pede para salvar o contato, deixa claro que o número é o canal oficial de notificações e pede resposta OK para confirmar o canal. Variáveis: {nome}, {saudacao}, {artigo}, {medico}, {crm}, {contato_medico}.',
    status: 'published',
    automationId: 'boas_vindas_paciente_whatsapp',
    variables: ['nome', 'saudacao', 'artigo', 'medico', 'crm', 'contato_medico'],
    body: DEFAULT_BOAS_VINDAS_TRATAMENTO_BODY,
    version: 5,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-08-23T21:00:00.000Z',
  }),
  templateBase({
    id: 'consulta_confirmacao_whatsapp_v1',
    name: 'Confirmação de consulta',
    description:
      'Enviada ao paciente ao confirmar o horário (aceite da solicitação ou novo agendamento). Variáveis: {nome}, {medico}, {data}, {horario}, {horario_inicio}, {horario_fim}.',
    status: 'published',
    automationId: 'consulta_confirmacao_whatsapp',
    variables: ['nome', 'medico', 'data', 'horario', 'horario_inicio', 'horario_fim'],
    body: DEFAULT_CONSULTA_CONFIRMACAO_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-09-01T12:00:00.000Z',
  }),
  templateBase({
    id: 'consulta_lembrete_paciente_whatsapp_v1',
    name: 'Lembrete de consulta (paciente)',
    description:
      'Canal Chat → paciente, 30 minutos antes. Variáveis: {nome}, {medico}, {data}, {horario_inicio}.',
    status: 'published',
    automationId: 'consulta_lembrete_paciente_whatsapp',
    variables: ['nome', 'medico', 'data', 'horario_inicio'],
    body: DEFAULT_CONSULTA_LEMBRETE_PACIENTE_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-09-01T12:00:00.000Z',
  }),
  templateBase({
    id: 'consulta_lembrete_medico_whatsapp_v1',
    name: 'Lembrete de consulta (médico)',
    description:
      'Canal Chat → médico, 30 minutos antes. Variáveis: {paciente}, {horario}.',
    status: 'published',
    automationId: 'consulta_lembrete_medico_whatsapp',
    variables: ['paciente', 'horario'],
    body: DEFAULT_CONSULTA_LEMBRETE_MEDICO_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-09-01T12:00:00.000Z',
  }),
  templateBase({
    id: 'solicitacao_acompanhamento_whatsapp_v1',
    name: 'Nova solicitação de acompanhamento',
    description:
      'Canal Chat → médico quando o paciente solicita acompanhamento. Variáveis: {medico}, {paciente}, {link}.',
    status: 'published',
    automationId: 'solicitacao_acompanhamento_whatsapp',
    variables: ['medico', 'paciente', 'link'],
    body: DEFAULT_SOLICITACAO_ACOMPANHAMENTO_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-09-01T12:00:00.000Z',
  }),
  templateBase({
    id: 'parcela_vencimento_whatsapp_v1',
    name: 'Parcela a vencer — v1',
    description: 'Template provisório — ainda não existe fluxo real equivalente no WhatsApp.',
    status: 'planned',
    automationId: 'parcela_vencimento_whatsapp',
    variables: ['nome', 'vencimento', 'link'],
    body: PARCELA_VENCIMENTO_WHATSAPP_BODY_PROVISIONAL,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: SYNC_UPDATED_AT,
  }),
  templateBase({
    id: 'cobranca_avulsa_whatsapp_v1',
    name: 'Cobrança avulsa',
    description:
      'Template do botão Cobrança no Financeiro (metaadmin). Enviado pelo Canal Chat, sem link — o paciente deve contatar o médico para o relatório. Editável em Automações → Canal Chat.',
    status: 'published',
    automationId: 'cobranca_avulsa_whatsapp',
    variables: ['nome', 'valor', 'medico'],
    body: COBRANCA_AVULSA_WHATSAPP_BODY,
    version: 2,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-08-20T12:00:00.000Z',
  }),
  templateBase({
    id: 'cobranca_automatica_whatsapp_v1',
    name: 'Cobrança Automática',
    description:
      'Template da automação Cobrança automática. Enviado pelo Canal Chat no dia do vencimento, sem link — o paciente deve contatar o médico para o relatório. Editável em Automações → Canal Chat.',
    status: 'published',
    automationId: 'cobranca_automatica_whatsapp',
    variables: ['nome', 'valor', 'data', 'medico'],
    body: COBRANCA_AUTOMATICA_WHATSAPP_BODY,
    version: 2,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-08-20T12:00:00.000Z',
  }),
  templateBase({
    id: 'aniversario_paciente_whatsapp_v1',
    name: 'Aniversário do paciente — v1',
    description:
      'Mensagem enviada pelo médico no calendário do MetaAdmin no aniversário do paciente. Editável aqui — o texto salvo é o que o paciente recebe. Publica automaticamente quando a automação está ativa.',
    status: 'planned',
    automationId: 'aniversario_paciente_whatsapp',
    variables: ['nome', 'medico', 'crm'],
    body: ANIVERSARIO_PACIENTE_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: SYNC_UPDATED_AT,
  }),
  templateBase({
    id: 'nutri_checkin_semanal_whatsapp_v1',
    name: 'Check-in Semanal Nutri — v1',
    description:
      'Mensagem enviada no dia e horário do cronograma nutricional de cada paciente, com o link público /checkin-nutri/{token}.',
    status: 'published',
    automationId: 'nutri_checkin_semanal_whatsapp',
    variables: ['nome', 'link'],
    body: NUTRI_CHECKIN_SEMANAL_WHATSAPP_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-08-17T12:00:00.000Z',
  }),
  templateBase({
    id: 'calendario_lembrete_whatsapp_v1',
    name: 'Lembretes do calendário — v1',
    description:
      'Referência do aviso enviado pelo Canal Chat no horário do lembrete (telefoneAviso). O motor usa o texto montado a partir do lembrete cadastrado.',
    status: 'published',
    automationId: 'calendario_lembrete_whatsapp',
    variables: ['titulo', 'mensagem', 'nome', 'data'],
    body: CALENDARIO_LEMBRETE_WHATSAPP_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-08-11T12:00:00.000Z',
  }),
  templateBase({
    id: 'compartilhamento_aceite_whatsapp_v1',
    name: 'Envio Automático de Relacionamento — v1',
    description:
      'Mensagem do nutri/personal ao paciente quando o compartilhamento com o médico é aceito.',
    status: 'published',
    automationId: 'compartilhamento_aceite_whatsapp',
    variables: ['nome', 'medico', 'profissional'],
    body: COMPARTILHAMENTO_ACEITE_WHATSAPP_BODY,
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: '2026-08-11T12:00:00.000Z',
  }),
];

/** @deprecated Use AUTOMATION_CENTER_TEMPLATES_SEED */
export const AUTOMATION_CENTER_TEMPLATES = AUTOMATION_CENTER_TEMPLATES_SEED;

function templateUpdatedAtMs(template: AutomationTemplate): number {
  const ms = Date.parse(template.updatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Prefere o seed quando ele é mais novo, ou quando o texto salvo ainda tem `{link}`
 * e o seed já removeu — evita reenviar URL de relatório em templates de cobrança.
 */
export function resolveEffectiveAutomationTemplate(
  seed: AutomationTemplate | undefined,
  stored: AutomationTemplate | undefined,
): AutomationTemplate | undefined {
  if (!stored) return seed;
  if (!seed) return stored;
  if (templateUpdatedAtMs(seed) > templateUpdatedAtMs(stored)) return seed;
  if (/\{link\}/.test(stored.body) && !/\{link\}/.test(seed.body)) return seed;
  return stored;
}

export function mergeAutomationTemplates(firestoreTemplates: AutomationTemplate[]): AutomationTemplate[] {
  const byId = new Map<string, AutomationTemplate>();

  for (const seed of AUTOMATION_CENTER_TEMPLATES_SEED) {
    byId.set(seed.id, seed);
  }

  for (const row of firestoreTemplates) {
    const seed = byId.get(row.id);
    const effective = resolveEffectiveAutomationTemplate(seed, row);
    if (effective) byId.set(row.id, effective);
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function listAutomationTemplates(): AutomationTemplate[] {
  return [...AUTOMATION_CENTER_TEMPLATES_SEED];
}

export function getAutomationTemplateSeedById(id: string): AutomationTemplate | undefined {
  return AUTOMATION_CENTER_TEMPLATES_SEED.find((item) => item.id === id);
}

export function getAutomationTemplateById(id: string): AutomationTemplate | undefined {
  return getAutomationTemplateSeedById(id);
}

export function listTemplatesByAutomationId(automationId: string): AutomationTemplate[] {
  return AUTOMATION_CENTER_TEMPLATES_SEED.filter((item) => item.automationId === automationId);
}

export function getAutomationNameForTemplate(automationId: string): string {
  return getAutomationDefinitionById(automationId)?.name ?? automationId;
}

export { renderAutomationTemplate } from '@/lib/metaadmingeral/renderAutomationTemplate';
