import {
  NOVOS_MODULOS_EMAIL_DOCS,
  type NovoModuloKey,
} from '@/data/emailConfigNovosModulos';

/** Um botão por módulo (primeira ocorrência em NOVOS_MODULOS_EMAIL_DOCS). */
export function novosModulosOrdenados(): NovoModuloKey[] {
  const seen = new Set<string>();
  const out: NovoModuloKey[] = [];
  for (const d of NOVOS_MODULOS_EMAIL_DOCS) {
    if (!seen.has(d.modulo)) {
      seen.add(d.modulo);
      out.push(d.modulo);
    }
  }
  return out;
}

export const NOVO_MODULO_LABEL: Record<NovoModuloKey, { titulo: string; subtitulo: string }> = {
  leads_nutri: { titulo: 'Leads Nutri', subtitulo: 'Aviso único para admin' },
  solicitado_nutri: { titulo: 'Solicitado Nutri', subtitulo: 'Boas-vindas ao aceitar' },
  em_tratamento_nutri: { titulo: 'Em tratamento Nutri', subtitulo: 'Plano editado' },
  consulta_nutri: { titulo: 'Consulta Nutri', subtitulo: 'Lembrete antes / dia' },
  leads_personal: { titulo: 'Leads Personal', subtitulo: 'Aviso único para admin' },
  solicitado_personal: { titulo: 'Solicitado Personal', subtitulo: 'Boas-vindas ao aceitar' },
  em_tratamento_personal: { titulo: 'Em tratamento Personal', subtitulo: 'Plano editado' },
  treino_personal: { titulo: 'Treino Personal', subtitulo: 'Lembrete antes / dia' },
  nutri_pediu_vinculo: { titulo: 'Nutri pediu vínculo', subtitulo: 'Aviso ao médico' },
  personal_pediu_vinculo: { titulo: 'Personal pediu vínculo', subtitulo: 'Aviso ao médico' },
  novo_lead_para_medico: { titulo: 'Novo lead para médico', subtitulo: 'Paciente selecionou médico' },
  novo_lead_nutri: { titulo: 'Novo lead Nutri', subtitulo: 'Aviso à nutricionista' },
  check_recomendacoes_nutri: { titulo: 'Check rec. Nutri', subtitulo: 'Paciente leu recomendações' },
  agenda_nutri: { titulo: 'Agenda Nutri', subtitulo: 'Semanal / diário' },
  novo_lead_personal: { titulo: 'Novo lead Personal', subtitulo: 'Aviso ao personal' },
  check_presenca_personal: { titulo: 'Presença Personal', subtitulo: 'Aluno confirmou' },
  agenda_personal: { titulo: 'Agenda Personal', subtitulo: 'Semanal / diário' },
  lead_avulso_nutri: { titulo: 'Lead avulso Nutri', subtitulo: 'Admin nutri' },
  lead_avulso_personal: { titulo: 'Lead avulso Personal', subtitulo: 'Admin personal' },
  lead_mentoria: { titulo: 'Lead mentoria', subtitulo: 'Formulário mentoria' },
  bem_vindo_nutri: { titulo: 'Bem-vindo Nutri', subtitulo: 'Cadastro nutricionista' },
  bem_vindo_personal: { titulo: 'Bem-vindo Personal', subtitulo: 'Cadastro personal' },
  aniversariante: { titulo: 'Aniversariante', subtitulo: 'Cron aniversário paciente' },
  conclusao_tratamento: { titulo: 'Conclusão médico', subtitulo: 'Lembrete + parabéns / relatório' },
};

const v = (nome: string, descricao: string) => ({ nome, descricao });

/** Variáveis sugeridas no editor (referência rápida). */
export function getVariaveisNovoModulo(
  modulo: NovoModuloKey,
  templateKey?: string
): { variaveis: Array<{ nome: string; descricao: string }> } {
  const nome = v('{nome}', 'Nome da pessoa');
  const medico = v('{medico}', 'Médico');
  const nutri = v('{nutricionista}', 'Nutricionista');
  const personal = v('{personal}', 'Personal trainer');
  const inicio = v('{inicio}', 'Data de início');
  const semanas = v('{semanas}', 'Duração em semanas');
  const agendaHtml = v('{agendaHtml}', 'HTML da agenda');
  const di = v('{dataInicio}', 'Início do período');
  const df = v('{dataFim}', 'Fim do período');
  const dh = v('{dataHoje}', 'Data de hoje');
  const fotoRegistro = v('{foto_registro}', 'URL da foto do registro profissional');
  const selfie = v('{selfie}', 'URL da selfie enviada');
  const cnh = v('{cnh}', 'URL da foto da CNH');
  const leadEmail = v('{lead_email}', 'E-mail do lead');

  if (modulo === 'conclusao_tratamento' && templateKey === 'lembrete_conclusao') {
    return {
      variaveis: [
        nome,
        medico,
        v('{conclusao}', 'Link página de conclusão (dados finais / depoimento)'),
        v('{data_conclusao}', 'Data prevista (pt-BR)'),
      ],
    };
  }
  if (modulo === 'conclusao_tratamento') {
    return {
      variaveis: [
        nome,
        medico,
        v('{peso_inicial}', 'Peso inicial (kg)'),
        v('{peso_final}', 'Peso final (kg)'),
        v('{peso_perdido}', 'Peso perdido (kg)'),
        v('{percentual_perda}', 'Percentual de perda'),
        v('{duracao_tratamento}', 'Texto, ex.: "4 semanas"'),
        v('{relatorio}', 'Link do relatório final'),
      ],
    };
  }

  switch (modulo) {
    case 'leads_nutri':
    case 'leads_personal':
      return { variaveis: [nome, leadEmail, fotoRegistro, selfie, cnh] };
    case 'solicitado_nutri':
      return { variaveis: [nome, nutri, inicio, semanas] };
    case 'solicitado_personal':
      return { variaveis: [nome, personal, inicio, semanas] };
    case 'em_tratamento_nutri':
    case 'consulta_nutri':
      return { variaveis: [nome, nutri] };
    case 'em_tratamento_personal':
    case 'treino_personal':
      return { variaveis: [nome, personal] };
    case 'nutri_pediu_vinculo':
      return { variaveis: [medico, nutri, nome] };
    case 'personal_pediu_vinculo':
      return { variaveis: [medico, personal, nome] };
    case 'novo_lead_para_medico':
      return { variaveis: [medico, nome, leadEmail] };
    case 'novo_lead_nutri':
    case 'check_recomendacoes_nutri':
      return modulo === 'novo_lead_nutri'
        ? { variaveis: [nutri, nome, fotoRegistro, selfie, cnh] }
        : { variaveis: [nutri, nome] };
    case 'agenda_nutri':
      return { variaveis: [nutri, di, df, dh, agendaHtml] };
    case 'novo_lead_personal':
    case 'check_presenca_personal':
      return modulo === 'novo_lead_personal'
        ? { variaveis: [personal, nome, fotoRegistro, selfie, cnh] }
        : { variaveis: [personal, nome] };
    case 'agenda_personal':
      return { variaveis: [personal, di, df, dh, agendaHtml] };
    case 'lead_avulso_nutri':
    case 'lead_avulso_personal':
      return { variaveis: [nome] };
    case 'lead_mentoria':
      return {
        variaveis: [
          nome,
          v('{email}', 'E-mail'),
          v('{telefone}', 'Telefone'),
          v('{cidade}', 'Cidade'),
          v('{estado}', 'Estado'),
          v('{faturamento}', 'Qualificação / faturamento'),
          v('{objetivo}', 'Objetivo'),
          v('{atende_online}', 'Atende online'),
          v('{prazo}', 'Prazo'),
          v('{travamento}', 'Travamento'),
        ],
      };
    case 'bem_vindo_nutri':
    case 'bem_vindo_personal':
      return { variaveis: [nome] };
    case 'aniversariante':
      return { variaveis: [nome, medico] };
    default:
      return { variaveis: [nome] };
  }
}

export function templatesDoNovoModulo(modulo: NovoModuloKey) {
  return NOVOS_MODULOS_EMAIL_DOCS.filter((d) => d.modulo === modulo);
}

export function isNovoModuloKey(m: string): m is NovoModuloKey {
  return novosModulosOrdenados().includes(m as NovoModuloKey);
}
