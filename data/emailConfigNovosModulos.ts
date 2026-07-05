/**
 * Mapeamento dos novos módulos de e-mail para documentos no Firestore (collection emails).
 * Usado pela API email-config para GET/POST e pelo EmailManagement para saber quais chaves existem.
 */

import { EmailTemplate } from '@/types/emailConfig';

export type NovoModuloKey =
  | 'leads_nutri' | 'solicitado_nutri' | 'em_tratamento_nutri' | 'consulta_nutri'
  | 'leads_personal' | 'solicitado_personal' | 'em_tratamento_personal' | 'treino_personal'
  | 'nutri_pediu_vinculo' | 'personal_pediu_vinculo'
  | 'novo_lead_para_medico'
  | 'novo_lead_nutri' | 'check_recomendacoes_nutri' | 'agenda_nutri'
  | 'novo_lead_personal' | 'check_presenca_personal' | 'agenda_personal'
  | 'lead_avulso_nutri' | 'lead_avulso_personal' | 'lead_mentoria' | 'bem_vindo_nutri' | 'bem_vindo_personal'
  | 'aniversariante'
  | 'conclusao_tratamento';

export interface DocEmailConfig {
  modulo: NovoModuloKey;
  templateKey: string;
  docId: string; // ID do documento na collection emails
  defaultTemplate: EmailTemplate;
}

const defaultTemplate = (assunto: string, corpoHtml: string): EmailTemplate => ({
  assunto,
  corpoHtml,
});

/** Lista de documentos de e-mail dos novos módulos (Firestore collection emails). */
export const NOVOS_MODULOS_EMAIL_DOCS: DocEmailConfig[] = [
  // Pacientes - Nutri
  { modulo: 'leads_nutri', templateKey: 'email1', docId: 'leads_nutri_email1', defaultTemplate: defaultTemplate('Novo lead nutri', '<p>Novo lead Nutri: {nome}</p><p>E-mail do lead: {lead_email}</p><p><strong>Registro:</strong> {foto_registro}<br/><strong>Selfie:</strong> {selfie}<br/><strong>CNH:</strong> {cnh}</p>') },
  { modulo: 'solicitado_nutri', templateKey: 'boas_vindas', docId: 'solicitado_nutri_boas_vindas', defaultTemplate: defaultTemplate('Bem-vindo ao acompanhamento nutricional!', '<p>Olá {nome},</p><p>Parabéns! Você foi aceito(a) por {nutricionista}.</p><p>Início: {inicio}. Duração: {semanas}.</p>') },
  { modulo: 'em_tratamento_nutri', templateKey: 'plano_editado', docId: 'em_tratamento_nutri_plano_editado', defaultTemplate: defaultTemplate('Seu plano foi atualizado', '<p>Olá {nome},</p><p>{nutricionista} atualizou seu plano. Acesse o painel para ver.</p>') },
  { modulo: 'consulta_nutri', templateKey: 'consulta_antes', docId: 'consulta_nutri_consulta_antes', defaultTemplate: defaultTemplate('Lembrete: consulta amanhã', '<p>Olá {nome},</p><p>Sua consulta com {nutricionista} é amanhã.</p>') },
  { modulo: 'consulta_nutri', templateKey: 'consulta_dia', docId: 'consulta_nutri_consulta_dia', defaultTemplate: defaultTemplate('Lembrete: consulta hoje', '<p>Olá {nome},</p><p>Hoje você tem consulta com {nutricionista}.</p>') },
  // Pacientes - Personal
  { modulo: 'leads_personal', templateKey: 'email1', docId: 'leads_personal_email1', defaultTemplate: defaultTemplate('Novo lead personal', '<p>Novo lead Personal: {nome}</p><p>E-mail do lead: {lead_email}</p><p><strong>Registro:</strong> {foto_registro}<br/><strong>Selfie:</strong> {selfie}<br/><strong>CNH:</strong> {cnh}</p>') },
  { modulo: 'solicitado_personal', templateKey: 'boas_vindas', docId: 'solicitado_personal_boas_vindas', defaultTemplate: defaultTemplate('Bem-vindo ao acompanhamento com personal!', '<p>Olá {nome},</p><p>Parabéns! Você foi aceito(a) por {personal}. Início: {inicio}. Duração: {semanas}.</p>') },
  { modulo: 'em_tratamento_personal', templateKey: 'plano_editado', docId: 'em_tratamento_personal_plano_editado', defaultTemplate: defaultTemplate('Seu plano de treinos foi atualizado', '<p>Olá {nome},</p><p>{personal} atualizou seu plano. Acesse o painel.</p>') },
  { modulo: 'treino_personal', templateKey: 'treino_antes', docId: 'treino_personal_treino_antes', defaultTemplate: defaultTemplate('Lembrete: treino amanhã', '<p>Olá {nome},</p><p>Amanhã você tem treino com {personal}.</p>') },
  { modulo: 'treino_personal', templateKey: 'treino_dia', docId: 'treino_personal_treino_dia', defaultTemplate: defaultTemplate('Lembrete: treino hoje', '<p>Olá {nome},</p><p>Hoje é dia de treino com {personal}!</p>') },
  // Médicos
  { modulo: 'nutri_pediu_vinculo', templateKey: 'aviso_medico', docId: 'nutri_pediu_vinculo_aviso_medico', defaultTemplate: defaultTemplate('Nutricionista solicitou vínculo', '<p>Olá Dr(a). {medico},</p><p>O(a) nutricionista {nutricionista} solicitou vínculo relacionado ao paciente {nome}. Acesse o painel.</p>') },
  { modulo: 'personal_pediu_vinculo', templateKey: 'aviso_medico', docId: 'personal_pediu_vinculo_aviso_medico', defaultTemplate: defaultTemplate('Personal solicitou vínculo', '<p>Olá Dr(a). {medico},</p><p>O personal {personal} solicitou vínculo relacionado ao paciente {nome}. Acesse o painel.</p>') },
  { modulo: 'novo_lead_para_medico', templateKey: 'novo_lead', docId: 'novo_lead_para_medico_novo_lead', defaultTemplate: defaultTemplate('Novo lead selecionou você', '<p>Olá Dr(a). {medico},</p><p>Um novo lead selecionou você como médico responsável.</p><p><strong>Nome:</strong> {nome}<br/><strong>E-mail:</strong> {lead_email}</p><p>Acesse o painel para avaliar a solicitação.</p>') },
  // Nutricionistas
  { modulo: 'novo_lead_nutri', templateKey: 'novo_lead', docId: 'novo_lead_nutri_novo_lead', defaultTemplate: defaultTemplate('Novo lead/paciente', '<p>Olá {nutricionista},</p><p>Um novo lead/paciente ({nome}) solicitou acompanhamento. Acesse o painel.</p><p><strong>Registro:</strong> {foto_registro}<br/><strong>Selfie:</strong> {selfie}<br/><strong>CNH:</strong> {cnh}</p>') },
  { modulo: 'check_recomendacoes_nutri', templateKey: 'recomendacoes_lidas', docId: 'check_recomendacoes_nutri_recomendacoes_lidas', defaultTemplate: defaultTemplate('Paciente leu suas recomendações', '<p>Olá {nutricionista},</p><p>O paciente {nome} leu suas recomendações no painel.</p>') },
  { modulo: 'agenda_nutri', templateKey: 'agenda_semanal', docId: 'agenda_nutri_agenda_semanal', defaultTemplate: defaultTemplate('Sua agenda semanal', '<p>Olá {nutricionista},</p><p>Agenda de {dataInicio} a {dataFim}:</p>{agendaHtml}') },
  { modulo: 'agenda_nutri', templateKey: 'agenda_diario', docId: 'agenda_nutri_agenda_diario', defaultTemplate: defaultTemplate('Sua agenda de hoje', '<p>Olá {nutricionista},</p><p>Agenda para {dataHoje}:</p>{agendaHtml}') },
  // Personal
  { modulo: 'novo_lead_personal', templateKey: 'novo_lead', docId: 'novo_lead_personal_novo_lead', defaultTemplate: defaultTemplate('Novo lead/aluno', '<p>Olá {personal},</p><p>Um novo lead/aluno ({nome}) solicitou acompanhamento. Acesse o painel.</p><p><strong>Registro:</strong> {foto_registro}<br/><strong>Selfie:</strong> {selfie}<br/><strong>CNH:</strong> {cnh}</p>') },
  { modulo: 'check_presenca_personal', templateKey: 'presenca_confirmada', docId: 'check_presenca_personal_presenca_confirmada', defaultTemplate: defaultTemplate('Aluno confirmou presença', '<p>Olá {personal},</p><p>O aluno {nome} confirmou presença.</p>') },
  { modulo: 'agenda_personal', templateKey: 'agenda_semanal', docId: 'agenda_personal_agenda_semanal', defaultTemplate: defaultTemplate('Sua semana de treinos', '<p>Olá {personal},</p><p>Agenda de {dataInicio} a {dataFim}:</p>{agendaHtml}') },
  { modulo: 'agenda_personal', templateKey: 'agenda_diario', docId: 'agenda_personal_agenda_diario', defaultTemplate: defaultTemplate('Seu dia de treinos', '<p>Olá {personal},</p><p>Agenda para {dataHoje}:</p>{agendaHtml}') },
  // Geral
  { modulo: 'lead_avulso_nutri', templateKey: 'novo_lead', docId: 'lead_avulso_nutri_novo_lead', defaultTemplate: defaultTemplate('Novo lead (nutri)', '<p>Novo lead cadastrado: {nome}</p>') },
  { modulo: 'lead_avulso_personal', templateKey: 'novo_lead', docId: 'lead_avulso_personal_novo_lead', defaultTemplate: defaultTemplate('Novo lead (personal)', '<p>Novo lead cadastrado: {nome}</p>') },
  { modulo: 'lead_mentoria', templateKey: 'novo_lead', docId: 'mentoria_lead', defaultTemplate: defaultTemplate('Novo lead - Mentoria Método Emagrecer', '<p>Novo lead da mentoria:</p><p><strong>Dados básicos:</strong><br/>Nome: {nome}<br/>Cidade: {cidade} / {estado}<br/>E-mail: {email}<br/>Telefone: {telefone}</p><p><strong>Qualificação:</strong> {faturamento}</p><p><strong>Objetivo:</strong> {objetivo}</p><p><strong>Atende online:</strong> {atende_online}</p><p><strong>Prazo:</strong> {prazo}</p><p><strong>Travamento:</strong> {travamento}</p>') },
  { modulo: 'bem_vindo_nutri', templateKey: 'bem_vindo_nutricionista', docId: 'bem_vindo_nutri_bem_vindo_nutricionista', defaultTemplate: defaultTemplate('Bem-vindo ao Oftware!', '<p>Olá {nome},</p><p>Bem-vindo! Seu perfil de nutricionista foi criado. Acesse o painel.</p>') },
  { modulo: 'bem_vindo_personal', templateKey: 'bem_vindo_personal', docId: 'bem_vindo_personal_bem_vindo_personal', defaultTemplate: defaultTemplate('Bem-vindo ao Oftware!', '<p>Olá {nome},</p><p>Bem-vindo! Seu perfil de personal foi criado. Acesse o painel.</p>') },
  { modulo: 'aniversariante', templateKey: 'parabenizar', docId: 'aniversariante_parabenizar', defaultTemplate: defaultTemplate('Feliz aniversário! 🎂', '<p>Olá {nome},</p><p>Seu médico, Dr(a). {medico}, enviou esta mensagem para parabenizá-lo(a) pelo seu aniversário!</p><p>Parabéns pelo seu dia! Desejamos muita saúde, alegria e sucesso na sua jornada.</p><p>Que este novo ano de vida seja repleto de conquistas e momentos especiais.</p><p>Feliz aniversário!</p><p>Com carinho,<br/>Dr(a). {medico}</p>') },
  // Dia do card de conclusão no calendário (cron diário) — link para preencher dados finais / depoimento
  {
    modulo: 'conclusao_tratamento',
    templateKey: 'lembrete_conclusao',
    docId: 'conclusao_tratamento_lembrete_conclusao',
    defaultTemplate: defaultTemplate(
      'Conclusão do tratamento — preencha seus dados',
      '<p>Olá {nome},</p><p>Hoje ({data_conclusao}) é o dia previsto para a conclusão do seu ciclo com Dr(a). {medico}.</p><p>Use o link abaixo para registrar seus dados finais e, se quiser, avaliar seu médico.</p><p><a href="{conclusao}">Abrir página de conclusão</a></p><p>Atenciosamente,<br/>Equipe Oftware</p>'
    ),
  },
  // Enviado quando o médico conclui o tratamento no painel (peso final) — parabéns + relatório
  {
    modulo: 'conclusao_tratamento',
    templateKey: 'conclusao_tratamento',
    docId: 'conclusao_tratamento_conclusao_tratamento',
    defaultTemplate: defaultTemplate(
      'Parabéns! Você concluiu seu tratamento 🎉',
      '<p>Olá {nome},</p><p>Parabéns por concluir seu tratamento!</p><p>Seu médico, Dr(a). {medico}, registrou os seguintes resultados:</p><ul><li>Peso inicial: {peso_inicial} kg</li><li>Peso final: {peso_final} kg</li><li>Peso perdido: {peso_perdido} kg</li><li>Percentual de perda: {percentual_perda}%</li><li>Duração do tratamento: {duracao_tratamento}</li></ul><p>Seu relatório completo está disponível aqui: <a href="{relatorio}">abrir relatório</a></p><p>Desejamos que você mantenha os bons hábitos e a saúde em dia.</p><p>Com carinho,<br/>Dr(a). {medico}</p>'
    ),
  },
];

/** Agrupa por módulo para montar o objeto de config. */
export function agruparPorModulo(docs: DocEmailConfig[]): Record<string, Record<string, EmailTemplate>> {
  const out: Record<string, Record<string, EmailTemplate>> = {};
  for (const d of docs) {
    if (!out[d.modulo]) out[d.modulo] = {};
    out[d.modulo][d.templateKey] = d.defaultTemplate;
  }
  return out;
}
