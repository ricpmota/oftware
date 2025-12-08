import React from 'react';
import { Users, Stethoscope, DollarSign, Edit, Pill, Shield, UtensilsCrossed } from 'lucide-react';

// Interface para itens de FAQ
export interface FAQItem {
  question: string;
  answer: string;
}

// FAQ - Plataforma (Médico)
export const faqMedicoPlataforma: FAQItem[] = [
  {
    question: "Quais são os benefícios da plataforma para mim como médico?",
    answer: "A plataforma é 100% gratuita e oferece: gestão completa de pacientes em um só lugar, sistema de leads que traz pacientes direto para você, organização automática de dados clínicos em 9 pastas, gráficos e alertas automáticos que facilitam o acompanhamento, comunicação integrada com pacientes, prescrições pré-configuradas que economizam tempo, e estatísticas detalhadas do seu trabalho. Tudo isso sem custos, aumentando sua produtividade e organização."
  },
  {
    question: "Como a plataforma me ajuda a conseguir mais pacientes?",
    answer: "Ao cadastrar suas cidades de atendimento no perfil, pacientes interessados em tratamento com Tirzepatida podem encontrá-lo na busca por localização. Eles enviam solicitações de contato diretamente pela plataforma, criando um pipeline de leads organizado. Você recebe notificações de novas solicitações e pode gerenciar todo o processo de conversão em leads até transformá-los em pacientes em tratamento."
  },
  {
    question: "Como a plataforma economiza meu tempo?",
    answer: "A plataforma automatiza muitas tarefas: cálculo automático de dosagens de prescrições baseadas no peso, alertas automáticos quando exames estão fora do normal, gráficos gerados automaticamente da evolução do paciente, prescrições padrão pré-configuradas (Whey, Creatina), e organização automática de dados em pastas. Isso reduz significativamente o tempo de preenchimento e análise, permitindo que você foque no que realmente importa: o cuidado com o paciente."
  },
  {
    question: "Como organizar as informações do paciente?",
    answer: "Após cadastrar um paciente, clique em 'Editar' na lista. Um modal abre com 9 abas (pastas):\n\n1. Dados de Identificação\n2. Dados Clínicos (peso inicial, medidas)\n3. Estilo de Vida\n4. Exames Laboratoriais\n5. Plano Terapêutico (doses de Tirzepatida)\n6. Evolução/Seguimento Semanal\n7. Alertas e Recomendações\n8. Comunicação e Registro\n9. Prescrições\n\nPreencha conforme a evolução do tratamento!"
  },
  {
    question: "Como ver estatísticas gerais?",
    answer: "No menu 'Estatísticas', você vê um resumo completo: total de pacientes, leads por status, pacientes em tratamento, concluídos ou que abandonaram. Há também gráficos de evolução coletiva e indicadores de adesão ao tratamento. Use os filtros para analisar períodos específicos."
  },
  {
    question: "Como cadastrar minhas cidades de atendimento?",
    answer: "No menu 'Perfil', você pode cadastrar as cidades onde atende. Isso permite que pacientes encontrem você na busca por localização. Quanto mais cidades cadastrar, mais visibilidade você terá na plataforma. Pacientes podem filtrar médicos por cidade e estado."
  },
  {
    question: "Como me comunicar com pacientes?",
    answer: "A plataforma possui mensagens integradas. Na pasta 8 (Comunicação), você pode enviar mensagens, lembretes sobre consultas e exames, e receber mensagens dos pacientes. Tudo fica registrado e organizado. Você também pode enviar recomendações que o paciente pode marcar como lidas."
  }
];

// FAQ - Leads
export const faqMedicoLeads: FAQItem[] = [
  {
    question: "Como gerenciar meus Leads?",
    answer: "Na seção 'Leads', você encontra todos os pacientes que solicitaram contato. O sistema organiza os leads em um pipeline visual com 5 status: 'Não qualificado', 'Enviado contato', 'Contato Feito', 'Em tratamento' e 'Excluído'. Você pode arrastar os cards entre as colunas para atualizar o status. Cada lead mostra nome, cidade, data de solicitação e um ícone do WhatsApp para contato direto."
  },
  {
    question: "Como entrar em contato com um Lead?",
    answer: "Ao lado do nome de cada lead, há um ícone do WhatsApp. Clique nele para abrir uma conversa direta no WhatsApp com o paciente. Isso facilita o primeiro contato e a negociação do tratamento. Após o contato, mova o lead para 'Contato Feito' no pipeline."
  },
  {
    question: "Como funciona o Pipeline de Leads?",
    answer: "O pipeline é um sistema visual tipo Kanban com 5 colunas:\n\n1. 'Não qualificado' - Leads que não atendem aos critérios\n2. 'Enviado contato' - Leads que você já contatou\n3. 'Contato Feito' - Leads com quem você já conversou\n4. 'Em tratamento' - Leads que viraram pacientes\n5. 'Excluído' - Leads descartados\n\nArraste os cards entre as colunas para organizar seu fluxo de trabalho!"
  },
  {
    question: "Como identificar leads qualificados?",
    answer: "Leads qualificados são aqueles que atendem aos critérios para tratamento com Tirzepatida: IMC ≥ 30 ou IMC ≥ 27 com comorbidades relacionadas à obesidade. Use a coluna 'Não qualificado' para leads que não atendem aos critérios e mova para 'Enviado contato' quando iniciar o contato."
  }
];

// FAQ - Indicação
export const faqMedicoIndicacao: FAQItem[] = [
  {
    question: "Como funciona o sistema de indicações?",
    answer: "O sistema de indicações permite que pacientes indiquem outros pacientes para você. Quando um paciente faz uma indicação, ela aparece na aba 'Indicação' > 'Minhas Indicações'. Você pode visualizar a indicação para ver os dados do lead, entrar em contato via WhatsApp, e acompanhar quando a indicação vira venda (quando o paciente indicado se cadastra)."
  },
  {
    question: "Como configurar meu plano de indicações?",
    answer: "Na aba 'Indicação' > 'Plano de Indicação', você pode ativar seu plano de indicações e definir a comissão: valor negociado ou fixo, por dose ou por tratamento completo. Isso permite que pacientes vejam que você tem um plano de indicações ativo e incentiva indicações."
  },
  {
    question: "Como acompanhar minhas indicações?",
    answer: "Na aba 'Minhas Indicações', você vê todas as indicações recebidas com status: pendente, visualizada, venda ou paga. O sistema mostra estatísticas (total, pendentes, convertidas, pagas) e taxa de conversão. Cada indicação mostra quem indicou (cliente) e quem foi indicado (lead)."
  },
  {
    question: "Quando devo marcar uma indicação como paga?",
    answer: "Marque como 'Paga' quando a comissão for efetivamente paga ao paciente que indicou. Isso deve ser feito após a indicação ter virado venda (quando o paciente indicado se cadastrou) e você ter pago a comissão combinada. Isso mantém o histórico completo e transparente."
  }
];

// FAQ - Edição Paciente
export const faqMedicoEdicaoPaciente: FAQItem[] = [
  {
    question: "Como cadastrar um novo paciente?",
    answer: "Na seção 'Pacientes', clique em 'Adicionar Paciente'. Preencha os dados básicos (nome, email, telefone, CPF). Após o cadastro, clique em 'Editar' para acessar as 9 pastas de informações e preencher os dados completos do paciente."
  },
  {
    question: "Como acompanhar a evolução do paciente?",
    answer: "Na pasta 6 (Evolução/Seguimento Semanal), registre peso, circunferência abdominal, pressão arterial e outros dados de cada consulta. A plataforma gera gráficos automáticos mostrando a evolução ao longo do tempo. Na pasta 9 (Indicadores), você vê métricas de adesão e progresso do tratamento."
  },
  {
    question: "Como usar os Alertas do sistema?",
    answer: "A plataforma gera alertas automáticos quando:\n- Exames estão fora dos valores de referência\n- Dose precisa ser ajustada\n- Paciente está atrasado nas aplicações\n- Metas não estão sendo atingidas\n\nNa pasta 7 (Alertas), você pode ver todos os alertas e criar recomendações personalizadas para o paciente."
  },
  {
    question: "Como registrar exames laboratoriais?",
    answer: "Na pasta 4 (Exames Laboratoriais), você pode adicionar exames por data. O sistema mostra automaticamente se os valores estão dentro ou fora da normalidade baseado na idade e sexo do paciente. Você pode visualizar gráficos de evolução de cada exame ao longo do tempo."
  }
];

// FAQ - Plano Terapêutico
export const faqMedicoPlanoTerapeutico: FAQItem[] = [
  {
    question: "Como gerenciar as aplicações de Tirzepatida?",
    answer: "Na pasta 5 (Plano Terapêutico), defina a dose inicial e histórico de doses. O sistema sugere ajustes baseados na evolução. Na pasta 6, registre cada aplicação com data, dose e local. O calendário na pasta 5 mostra todas as aplicações agendadas e realizadas."
  },
  {
    question: "Como ajustar a dose de um paciente?",
    answer: "Acesse o perfil do paciente, vá até a seção de Plano Terapêutico e clique em 'Ajustar Dose'. O sistema calculará automaticamente a próxima dose recomendada baseada no histórico e evolução do paciente. Você pode ajustar manualmente se necessário."
  },
  {
    question: "Qual é o protocolo de dosagem da Tirzepatida?",
    answer: "O protocolo padrão inicia com 2.5mg na semana 1, aumentando para 5mg na semana 5, 7.5mg na semana 9, 10mg na semana 13, 12.5mg na semana 17 e 15mg na semana 21 (dose máxima). Ajustes podem ser feitos baseados na tolerabilidade e resposta do paciente. Sempre siga as orientações do fabricante e ajuste conforme necessário."
  },
  {
    question: "Como acompanhar a adesão ao tratamento?",
    answer: "Na pasta 6 (Evolução), você pode verificar se o paciente está aplicando as doses conforme o plano. O sistema mostra alertas quando há atrasos. Na pasta 9 (Indicadores), há métricas de adesão calculadas automaticamente baseadas nos registros de aplicação."
  },
  {
    question: "Quando devo aumentar a dose?",
    answer: "A dose deve ser aumentada gradualmente conforme o protocolo, mas pode ser ajustada baseado na tolerabilidade do paciente. Se o paciente não está tolerando bem a dose atual, mantenha na mesma dose por mais tempo. Se está tolerando bem e não há perda de peso adequada, considere aumentar conforme o protocolo."
  }
];

// FAQ - Medicamento (Médico)
export const faqMedicoMedicamento: FAQItem[] = [
  {
    question: "Quais são as contraindicações da Tirzepatida?",
    answer: "Contraindicações incluem: hipersensibilidade ao princípio ativo, história pessoal ou familiar de carcinoma medular da tireoide ou neoplasia endócrina múltipla tipo 2, gestação e amamentação. Sempre verifique o histórico completo do paciente antes de prescrever."
  },
  {
    question: "Quais são os efeitos colaterais mais comuns?",
    answer: "Os efeitos colaterais mais comuns incluem náusea, vômito, diarreia, constipação, desconforto abdominal e diminuição do apetite. Geralmente são leves a moderados e tendem a diminuir com o tempo. Oriente o paciente sobre estratégias para minimizar os sintomas."
  },
  {
    question: "Como manejar efeitos colaterais graves?",
    answer: "Se o paciente apresentar efeitos colaterais graves (vômitos persistentes, desidratação, dor abdominal intensa), considere reduzir a dose, manter na mesma dose por mais tempo, ou em casos extremos, interromper temporariamente. Sempre avalie caso a caso e oriente o paciente adequadamente."
  },
  {
    question: "Posso prescrever Tirzepatida com outros medicamentos?",
    answer: "Sim, mas é importante verificar interações medicamentosas. Tirzepatida pode potencializar o efeito de outros medicamentos hipoglicemiantes. Ajuste as doses conforme necessário e monitore a glicemia do paciente. Sempre revise a lista completa de medicamentos do paciente."
  }
];

// FAQ - Segurança (Médico)
export const faqMedicoSeguranca: FAQItem[] = [
  {
    question: "Quais exames são necessários antes de iniciar o tratamento?",
    answer: "Antes de iniciar, solicite: hemograma completo, função renal (creatinina, eGFR), função hepática (TGO, TGP), perfil lipídico, glicemia de jejum, HbA1c, função tireoidiana (TSH, T4 livre), e calcitonina (para rastrear carcinoma medular da tireoide). Esses exames devem ser repetidos periodicamente durante o tratamento."
  },
  {
    question: "Com que frequência devo solicitar exames?",
    answer: "Exames devem ser solicitados: antes de iniciar o tratamento, após 3 meses, após 6 meses, e depois a cada 6 meses. Se houver alterações ou sintomas, solicite exames com maior frequência. Monitore especialmente função renal e hepática."
  },
  {
    question: "Quando devo interromper o tratamento?",
    answer: "Interrompa o tratamento se: paciente desenvolver carcinoma medular da tireoide, houver reação alérgica grave, ou se o paciente planejar engravidar. Em caso de efeitos colaterais graves persistentes, considere interrupção temporária e reavaliação."
  },
  {
    question: "Como monitorar a segurança do paciente?",
    answer: "Monitore regularmente: peso, pressão arterial, frequência cardíaca, sintomas gastrointestinais, função renal e hepática através de exames, e sinais de pancreatite. Use os alertas automáticos da plataforma para identificar valores fora do normal rapidamente."
  }
];

// FAQ - Nutrição (Médico)
export const faqMedicoNutricao: FAQItem[] = [
  {
    question: "Como o plano nutricional ajuda no tratamento?",
    answer: "O plano nutricional personalizado ajuda o paciente a atingir suas metas de proteína, manter uma alimentação adequada durante o tratamento, e minimizar efeitos colaterais. O sistema calcula automaticamente as necessidades baseadas no IMC e estilo de vida do paciente."
  },
  {
    question: "Como acompanhar a aderência nutricional do paciente?",
    answer: "Na aba Nutri do paciente, você pode ver o histórico de check-ins diários, que incluem informações sobre alimentação, suplementos e sintomas. O score de aderência (0-100) mostra o quão bem o paciente está seguindo o plano. Use essas informações para ajustar orientações."
  },
  {
    question: "Quais suplementos são recomendados?",
    answer: "O sistema pode recomendar: probiótico (importante para saúde intestinal com Tirzepatida), whey protein (para ajudar a atingir a meta de proteína) e creatina (para pacientes com atividade física regular). As recomendações são baseadas no perfil do paciente e podem ser ajustadas."
  },
  {
    question: "Como ajustar o plano nutricional?",
    answer: "Se o paciente não está atingindo as metas ou tem sintomas gastrointestinais, você pode orientá-lo a ajustar o cardápio na aba Nutri. O sistema permite personalização de refeições e ajusta automaticamente os lanches para garantir a meta mínima de proteína."
  }
];

// Array total de FAQs para médico (todas as categorias)
export const faqMedicoTotal: FAQItem[] = [
  ...faqMedicoPlataforma,
  ...faqMedicoLeads,
  ...faqMedicoIndicacao,
  ...faqMedicoEdicaoPaciente,
  ...faqMedicoPlanoTerapeutico,
  ...faqMedicoMedicamento,
  ...faqMedicoSeguranca,
  ...faqMedicoNutricao
];

// Categorias para médico (para uso com showTabs)
export const faqCategoriesMedico = [
  {
    name: 'Como funciona a plataforma',
    items: faqMedicoPlataforma,
    icon: <Users size={20} />,
    color: 'from-blue-600 to-indigo-600'
  },
  {
    name: 'Leads',
    items: faqMedicoLeads,
    icon: <Users size={20} />,
    color: 'from-green-600 to-emerald-600'
  },
  {
    name: 'Indicação',
    items: faqMedicoIndicacao,
    icon: <DollarSign size={20} />,
    color: 'from-purple-600 to-pink-600'
  },
  {
    name: 'Edição Paciente',
    items: faqMedicoEdicaoPaciente,
    icon: <Edit size={20} />,
    color: 'from-orange-600 to-red-600'
  },
  {
    name: 'Plano Terapêutico',
    items: faqMedicoPlanoTerapeutico,
    icon: <Stethoscope size={20} />,
    color: 'from-teal-600 to-cyan-600'
  },
  {
    name: 'Medicamento',
    items: faqMedicoMedicamento,
    icon: <Pill size={20} />,
    color: 'from-purple-600 to-pink-600'
  },
  {
    name: 'Segurança',
    items: faqMedicoSeguranca,
    icon: <Shield size={20} />,
    color: 'from-gray-600 to-slate-600'
  },
  {
    name: 'Nutrição',
    items: faqMedicoNutricao,
    icon: <UtensilsCrossed size={20} />,
    color: 'from-green-600 to-emerald-600'
  }
];
