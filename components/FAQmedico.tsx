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
    question: "Como funciona a plataforma?",
    answer: "A Plataforma META é uma plataforma 100% gratuita e sem fins lucrativos que conecta médicos e pacientes especializados no tratamento de obesidade com Tirzepatida. Como médico, você se cadastra gratuitamente, completa seu perfil com CRM e cidades de atendimento, e passa a receber solicitações de pacientes (leads) que te encontram através da busca por localização. Além disso, pacientes cadastrados podem encaminhar outras pessoas para você através do sistema de Encaminhamentos, também totalmente gratuito. Uma vez que o paciente inicia o tratamento com você, você tem acesso a ferramentas completas de gestão: organização de dados em 9 pastas, gráficos automáticos de evolução, alertas quando valores estão fora do normal, comunicação integrada, prescrições pré-configuradas, e muito mais. A plataforma é totalmente gratuita para médicos - não há custos, comissões ou taxas."
  },
  {
    question: "A plataforma tem algum custo para médicos?",
    answer: "Não! A plataforma é 100% gratuita para médicos. Não há mensalidades, taxas, comissões ou qualquer custo. Você também não paga por leads ou encaminhamentos recebidos. O sistema de encaminhamentos é totalmente gratuito e sem fins lucrativos. A negociação do tratamento (valores de consultas, medicamentos) acontece diretamente entre você e o paciente, fora da plataforma. A plataforma serve apenas como uma ferramenta de conexão e gestão, totalmente gratuita."
  },
  {
    question: "Como os pacientes me encontram?",
    answer: "Pacientes fazem login na plataforma e acessam a área 'Buscar Médicos'. Eles selecionam o estado e a cidade onde moram, e a plataforma mostra uma lista de médicos cadastrados naquela localização. É muito importante que você cadastre todas as cidades onde atende no seu perfil - quanto mais cidades cadastrar, mais visibilidade você terá. Pacientes também são orientados a preferir médicos verificados (com ícone ✅), então solicite sua verificação para aumentar sua credibilidade e aparecer com destaque."
  },
  {
    question: "O que é verificação de médico e por que é importante?",
    answer: "Médicos verificados passam por um processo de validação que confirma que são profissionais devidamente registrados e qualificados. Eles recebem um ícone de verificação ✅ ao lado do nome, que aparece na lista de busca. Pacientes são orientados a sempre preferir médicos verificados, o que aumenta sua credibilidade e a probabilidade de serem escolhidos. Médicos verificados também têm maior visibilidade na plataforma. Após completar seu cadastro, solicite a verificação para ganhar essa credencial importante."
  },
  {
    question: "Como funciona o processo de solicitação de orçamento pelos pacientes?",
    answer: "Quando um paciente encontra você na busca e decide solicitar um orçamento, você recebe essa solicitação na área 'Leads'. A plataforma mostra o nome do paciente, cidade, data da solicitação e permite contato direto via WhatsApp. É importante entender que o paciente solicita o orçamento ANTES de fechar qualquer tratamento. A negociação dos valores do tratamento (consultas, medicamentos) acontece diretamente entre você e o paciente, fora da plataforma. A plataforma apenas facilita esse primeiro contato e conexão inicial."
  },
  {
    question: "Como funciona o sistema de Encaminhamentos?",
    answer: "O sistema de Encaminhamentos é uma ferramenta colaborativa e totalmente gratuita. Pacientes que já estão em tratamento na plataforma podem encaminhar outras pessoas que também precisam de tratamento para médicos cadastrados. Quando você recebe um encaminhamento, ele aparece na área 'Encaminhados' > 'Encaminhamentos Recebidos' com os dados de contato da pessoa encaminhada. Você pode visualizar o encaminhamento, entrar em contato via WhatsApp, e acompanhar o status do atendimento (Não visualizado, Visualizado, Em consulta, Encerrado). É importante destacar que este sistema é totalmente gratuito e sem fins lucrativos - não há comissões ou pagamentos envolvidos. É uma ferramenta de rede de cuidado colaborativa."
  },
  {
    question: "Quais são os benefícios da plataforma para mim como médico?",
    answer: "A plataforma oferece múltiplos benefícios sem custo algum: (1) Receber leads qualificados - pacientes te encontram através da busca por localização; (2) Receber encaminhamentos de outros pacientes - sistema colaborativo gratuito; (3) Gestão completa em um só lugar - organize todos os dados clínicos em 9 pastas estruturadas; (4) Economia de tempo - cálculos automáticos de dosagens, gráficos gerados automaticamente, alertas quando exames estão fora do normal, prescrições pré-configuradas; (5) Comunicação integrada - mensagens diretas com pacientes, lembretes automáticos; (6) Estatísticas detalhadas - acompanhe sua performance e resultados; (7) Acesso a dados nutricionais - veja o plano nutricional e check-ins diários dos pacientes. Tudo isso aumenta sua produtividade e organização, permitindo que você foque no cuidado com o paciente."
  },
  {
    question: "Como a plataforma economiza meu tempo?",
    answer: "A plataforma automatiza muitas tarefas que normalmente levam tempo: cálculo automático de dosagens de prescrições baseadas no peso do paciente, alertas automáticos quando exames laboratoriais estão fora dos valores de referência, gráficos gerados automaticamente da evolução do paciente (peso, IMC, HbA1c, circunferência abdominal), prescrições padrão pré-configuradas (Whey Protein, Creatina, Probiótico), organização automática de dados em 9 pastas estruturadas, e comunicação integrada que evita a necessidade de múltiplas plataformas. Isso reduz significativamente o tempo gasto com preenchimento de formulários e análise de dados, permitindo que você foque no que realmente importa: o cuidado e a tomada de decisão clínica."
  },
  {
    question: "Como organizar as informações do paciente?",
    answer: "Após cadastrar um paciente, clique em 'Editar' na lista. Um modal abre com 9 abas (pastas) organizadas:\n\n1. Dados de Identificação - informações pessoais básicas\n2. Dados Clínicos - peso inicial, medidas, comorbidades\n3. Nutrologia - plano nutricional, cardápio atual, check-ins diários (leitura apenas)\n4. Exames Laboratoriais - registro de todos os exames com gráficos de evolução\n5. Plano Terapêutico - doses de Tirzepatida, metas, calendário\n6. Evolução/Seguimento Semanal - registros semanais com gráficos de peso, circunferência, HbA1c, IMC\n7. Alertas e Recomendações - alertas automáticos e recomendações personalizadas\n8. Comunicação e Registro - mensagens e lembretes\n9. Prescrições - prescrições médicas registradas\n\nPreencha conforme a evolução do tratamento!"
  },
  {
    question: "Como ver estatísticas gerais?",
    answer: "No menu 'Estatísticas', você vê um resumo completo do seu trabalho: total de pacientes cadastrados, leads organizados por status (Não qualificado, Enviado contato, Contato Feito, Em tratamento, Excluído), pacientes em tratamento ativo, concluídos ou que abandonaram. Há também gráficos de evolução coletiva mostrando a média de perda de peso, adesão ao tratamento, e outros indicadores. Use os filtros para analisar períodos específicos e acompanhar tendências."
  },
  {
    question: "Como cadastrar minhas cidades de atendimento?",
    answer: "No menu 'Perfil', você pode cadastrar as cidades onde atende. Isso é fundamental para que pacientes te encontrem na busca por localização. Quanto mais cidades você cadastrar, maior será sua visibilidade na plataforma. Pacientes podem filtrar médicos por estado e cidade, então certifique-se de cadastrar todas as localidades onde você realmente atende ou pode atender. Isso aumenta suas chances de receber solicitações de pacientes."
  },
  {
    question: "Como me comunicar com pacientes?",
    answer: "A plataforma possui um sistema de mensagens integrado. Na pasta 8 (Comunicação e Registro), você pode enviar mensagens diretamente para seus pacientes, criar lembretes sobre consultas agendadas e exames que precisam ser realizados, e receber mensagens dos pacientes. Tudo fica registrado e organizado em um histórico completo. Você também pode enviar recomendações personalizadas que o paciente pode marcar como lidas. Isso facilita a comunicação e garante que informações importantes não sejam perdidas."
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

// FAQ - Encaminhamentos
export const faqMedicoIndicacao: FAQItem[] = [
  {
    question: "Como funciona o sistema de encaminhamentos?",
    answer: "O sistema de encaminhamentos permite que pacientes encaminhem outros pacientes para você de forma colaborativa e sem fins lucrativos. Quando um paciente faz um encaminhamento, ele aparece na aba 'Encaminhados' > 'Encaminhamentos Recebidos'. Você pode visualizar o encaminhamento para ver os dados do paciente, entrar em contato via WhatsApp, e acompanhar o status do atendimento clínico. Este é um sistema de colaboração clínica, não uma ferramenta comercial."
  },
  {
    question: "Os encaminhamentos têm custo ou comissão?",
    answer: "Não. O sistema de encaminhamentos é totalmente gratuito e sem fins lucrativos para ambas as partes. Não há comissões, pagamentos ou transações financeiras envolvidas. O objetivo é facilitar a continuidade do cuidado, permitindo que pacientes encaminhem outros pacientes que precisam de atendimento médico, promovendo acesso à saúde de forma colaborativa e ética."
  },
  {
    question: "Como acompanhar meus encaminhamentos recebidos?",
    answer: "Na aba 'Encaminhamentos Recebidos', você vê todos os encaminhamentos recebidos com status clínico: 'Não visualizado', 'Visualizado', 'Em consulta' ou 'Encerrado'. O sistema mostra estatísticas: total de encaminhamentos, aguardando primeiro contato, em acompanhamento e encerrados. Cada encaminhamento mostra quem encaminhou o paciente e a data do encaminhamento. Você também pode acompanhar a adesão no acompanhamento clínico."
  },
  {
    question: "Qual é o objetivo clínico dos encaminhamentos?",
    answer: "O objetivo é facilitar o acesso ao cuidado médico e promover continuidade do tratamento. Quando um paciente em tratamento conhece outra pessoa que também precisa de cuidado, ele pode encaminhá-la para você através da plataforma. Isso ajuda a expandir o acesso à saúde de forma colaborativa, permitindo que você receba pacientes que já vêm com uma indicação de alguém que confia no seu trabalho. É uma ferramenta de rede de cuidado, focada no bem-estar dos pacientes."
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
    name: 'Encaminhamentos',
    items: faqMedicoIndicacao,
    icon: <Users size={20} />,
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


