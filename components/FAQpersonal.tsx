import React from 'react';
import { Users, Stethoscope, Shield, Dumbbell, UserPlus, Eye, DollarSign, Calendar } from 'lucide-react';

// Interface para itens de FAQ
export interface FAQItem {
  question: string;
  answer: string;
}

// FAQ - Plataforma (Personal Trainer)
export const faqPersonalPlataforma: FAQItem[] = [
  {
    question: "Como funciona a plataforma?",
    answer: "A Plataforma META é uma plataforma 100% gratuita e sem fins lucrativos que conecta personal trainers e médicos especializados no tratamento de obesidade com Tirzepatida. Como personal trainer, você se cadastra gratuitamente, completa seu perfil com registro profissional (CREF) e cidades de atendimento, e pode se vincular a médicos cadastrados. Uma vez vinculado, médicos podem compartilhar pacientes com você, permitindo que você acompanhe o tratamento de forma colaborativa. Você terá acesso a todos os dados clínicos do paciente (somente leitura), incluindo plano de atividade física, check-ins diários, exames laboratoriais, evolução do tratamento e muito mais. A plataforma é totalmente gratuita para personal trainers - não há custos, comissões ou taxas."
  },
  {
    question: "A plataforma tem algum custo para personal trainers?",
    answer: "Não! A plataforma é 100% gratuita para personal trainers. Não há mensalidades, taxas, comissões ou qualquer custo. Você também não paga por vínculos com médicos ou pacientes compartilhados. A negociação do tratamento (valores de sessões, acompanhamento) acontece diretamente entre você e o médico/paciente, fora da plataforma. A plataforma serve apenas como uma ferramenta de conexão e acompanhamento colaborativo, totalmente gratuita."
  },
  {
    question: "Como me cadastrar na plataforma?",
    answer: "Para se cadastrar, acesse a área do Personal Trainer na página inicial (www.oftware.com.br) e faça login com sua conta Google. O sistema criará automaticamente seu perfil básico. Em seguida, você precisa completar seu perfil na seção 'Meu Perfil', informando seu número de registro profissional (CREF) e as cidades onde atende. Após completar o cadastro, você precisará ser verificado pelo administrador da plataforma para aparecer nas buscas e poder se vincular a médicos."
  },
  {
    question: "O que significa ser verificado?",
    answer: "Personal trainers verificados passam por um processo de validação que confirma que são profissionais devidamente registrados e qualificados. Após completar seu cadastro com registro profissional (CREF) e cidades de atendimento, o administrador da plataforma verifica suas informações. Uma vez verificado, você aparecerá nas buscas de médicos e poderá se vincular e receber pacientes compartilhados. A verificação garante credibilidade e confiabilidade na plataforma."
  },
  {
    question: "Como me vincular a um médico?",
    answer: "Existem duas formas de se vincular a um médico:\n\n1. **Médico solicita vínculo:** O médico busca você na plataforma e envia uma solicitação de vínculo. Você receberá uma notificação na seção 'Médicos' > 'Solicitações' e pode aprovar ou rejeitar.\n\n2. **Você solicita vínculo:** Na seção 'Médicos' > 'Buscar Médicos', você pode buscar médicos por estado e cidade, e enviar uma solicitação de vínculo. O médico receberá sua solicitação e poderá aprovar ou rejeitar.\n\nUma vez aprovado o vínculo, o médico poderá compartilhar pacientes com você."
  },
  {
    question: "Como recebo pacientes para acompanhar?",
    answer: "Após estar vinculado a um médico, ele pode compartilhar pacientes com você. Quando um médico compartilha um paciente, você receberá uma solicitação na seção 'Pacientes' > 'Solicitações Pendentes'. Ao aprovar a solicitação, o paciente aparecerá na sua lista de pacientes e você terá acesso a todos os dados clínicos dele (somente leitura), incluindo plano de atividade física, check-ins diários, exames, evolução e muito mais."
  },
  {
    question: "Quais informações posso ver dos pacientes?",
    answer: "Você tem acesso completo a todas as informações dos pacientes compartilhados, mas em modo somente leitura. Isso inclui:\n\n- Dados de identificação e contato\n- Dados clínicos (peso, IMC, medidas, comorbidades)\n- Plano de atividade física personalizado criado pelo sistema\n- Check-ins diários do paciente (treinos, atividades, sintomas, aderência)\n- Exames laboratoriais com gráficos de evolução\n- Plano terapêutico (doses de Tirzepatida, calendário de aplicações)\n- Evolução e seguimento (histórico de consultas, gráficos de peso, IMC, circunferência, HbA1c)\n- Alertas e recomendações do médico\n- Comunicação entre médico e paciente\n- Prescrições médicas\n\nTodas essas informações ajudam você a fornecer suporte de atividade física colaborativo."
  },
  {
    question: "Posso editar dados dos pacientes?",
    answer: "Não. O personal trainer tem acesso somente leitura aos dados dos pacientes. Isso significa que você pode visualizar todas as informações, mas não pode editar ou modificar dados clínicos, exames, plano terapêutico ou outras informações. O objetivo é trabalho colaborativo: você visualiza os dados para fornecer suporte de atividade física, enquanto o médico mantém a responsabilidade pela gestão completa do paciente."
  },
  {
    question: "Como funciona o plano de atividade física na plataforma?",
    answer: "O plano de atividade física é gerado automaticamente pelo sistema baseado em um questionário respondido pelo paciente. O sistema determina o nível de atividade adequado, cria um programa personalizado de treinos e estabelece metas de atividade física diária. O paciente faz check-ins diários registrando treinos realizados, intensidade, sintomas e aderência. Como personal trainer, você pode visualizar todo esse histórico, o score de aderência, e usar essas informações para fornecer orientações ao médico sobre ajustes necessários no plano de atividade física."
  },
  {
    question: "Como acompanhar a evolução dos pacientes?",
    answer: "Na seção 'Pacientes', ao clicar em um paciente, você pode visualizar:\n\n- Gráficos de evolução (peso, IMC, circunferência abdominal, HbA1c)\n- Histórico completo de check-ins diários com scores de aderência\n- Exames laboratoriais com indicadores de normalidade\n- Evolução do plano terapêutico (doses de Tirzepatida)\n- Histórico de sessões e registros\n\nNa Home, você também tem acesso a estatísticas gerais de todos os seus pacientes, incluindo análise de perda de peso com filtros por dose, faixa etária e sexo."
  },
  {
    question: "Como funciona o módulo Financeiro?",
    answer: "O módulo Financeiro permite que você visualize o status de pagamento dos pacientes compartilhados. Você pode ver:\n\n- Lista de pacientes com status de pagamento\n- Filtros por status (em negociação, pago, pendente, atrasado)\n- Detalhes de cada pagamento (valor total, parcelas, histórico)\n- Datas de vencimento\n\nIsso ajuda você a entender o contexto financeiro do tratamento, mas a negociação de valores acontece diretamente entre médico e paciente, fora da plataforma."
  },
  {
    question: "Como funciona o Calendário?",
    answer: "O calendário mostra visualmente:\n\n- **Aplicações de Tirzepatida:** Datas agendadas de aplicações do medicamento\n- **Pagamentos:** Datas de vencimento de parcelas\n- **Sessões de Treino:** Treinos agendados e realizados\n\nAo clicar em um dia específico, você vê todos os eventos daquele dia (aplicações, pagamentos e treinos). Isso ajuda você a ter uma visão geral do cronograma de tratamento dos pacientes."
  },
  {
    question: "Posso me comunicar com os pacientes?",
    answer: "Atualmente, o personal trainer pode visualizar a comunicação entre médico e paciente, mas não pode enviar mensagens diretamente. O foco é trabalho colaborativo com o médico: você visualiza os dados e pode fornecer orientações ao médico, que então se comunica com o paciente. Futuras atualizações podem incluir comunicação direta entre personal trainer e paciente."
  },
  {
    question: "Quantos médicos posso me vincular?",
    answer: "Não há limite de vínculos com médicos. Você pode se vincular a quantos médicos desejar, desde que eles aprovem sua solicitação ou você aprove as solicitações deles. Cada médico pode compartilhar pacientes com você, e você terá acesso a todos os pacientes compartilhados em uma única lista na seção 'Pacientes'."
  },
  {
    question: "O que acontece se eu rejeitar um vínculo ou compartilhamento?",
    answer: "Se você rejeitar uma solicitação de vínculo com um médico, o vínculo não será criado e o médico será notificado. Se você rejeitar um compartilhamento de paciente, você não terá acesso aos dados daquele paciente. Você pode sempre revisar suas decisões e, se necessário, o médico pode enviar uma nova solicitação no futuro."
  },
  {
    question: "Como atualizar meu perfil?",
    answer: "Na seção 'Meu Perfil', você pode atualizar:\n\n- Número de registro profissional (CREF)\n- Cidades de atendimento\n\nBasta fazer as alterações desejadas e clicar em 'Salvar'. As alterações serão aplicadas imediatamente. Se você adicionar novas cidades, você aparecerá nas buscas de médicos daquela localização."
  },
  {
    question: "O que é o link de referral?",
    answer: "O link de referral é um link personalizado que você pode gerar na seção 'Meu Perfil'. Quando você compartilha esse link com um médico, ele pode clicar e ser direcionado diretamente para uma página onde pode solicitar vínculo com você. Isso facilita o processo de conexão, especialmente se você já conhece o médico fora da plataforma."
  },
  {
    question: "Como posso ver estatísticas gerais?",
    answer: "Na Home, você tem acesso a vários KPIs e estatísticas:\n\n- Total de pacientes compartilhados\n- Número de médicos vinculados\n- Receita total e receita do mês\n- Gráficos de perda de peso (com filtros por dose, faixa etária, sexo)\n- Análise demográfica dos pacientes\n- Comparação com dados da plataforma (base Oftware)\n\nEssas estatísticas ajudam você a entender o impacto do seu trabalho e acompanhar tendências."
  }
];

// FAQ - Vínculos e Relacionamentos
export const faqPersonalVinculos: FAQItem[] = [
  {
    question: "Como buscar médicos na plataforma?",
    answer: "Na seção 'Médicos' > 'Buscar Médicos', você pode filtrar por estado e cidade. A plataforma mostrará uma lista de médicos cadastrados naquela localização. Você pode ver informações como nome, CRM, cidades de atendimento e número de pacientes. Para se vincular, clique em 'Solicitar Vínculo' e aguarde a aprovação do médico."
  },
  {
    question: "Como funciona a aprovação de vínculos?",
    answer: "Quando você envia uma solicitação de vínculo para um médico, ele recebe uma notificação e pode aprovar ou rejeitar. Da mesma forma, quando um médico envia uma solicitação para você, você recebe na seção 'Médicos' > 'Solicitações' e pode aprovar ou rejeitar. Uma vez aprovado, o vínculo é criado e o médico pode começar a compartilhar pacientes com você."
  },
  {
    question: "Posso desfazer um vínculo?",
    answer: "Sim, você pode cancelar solicitações pendentes que você enviou. Para vínculos já aprovados, você precisaria entrar em contato com o administrador da plataforma ou com o médico para remover o vínculo. Quando um vínculo é removido, você perde acesso aos pacientes que foram compartilhados através daquele médico."
  },
  {
    question: "O que acontece se um médico remover o vínculo?",
    answer: "Se um médico remover o vínculo com você, você perderá acesso a todos os pacientes que foram compartilhados através daquele médico. Os dados dos pacientes não serão deletados, mas você não poderá mais visualizá-los. Se o médico quiser trabalhar com você novamente no futuro, ele pode criar um novo vínculo."
  }
];

// FAQ - Pacientes e Acompanhamento
export const faqPersonalPacientes: FAQItem[] = [
  {
    question: "Como visualizar dados completos de um paciente?",
    answer: "Na seção 'Pacientes', você verá uma lista de todos os pacientes compartilhados com você. Ao clicar em um paciente, um modal abre com 9 abas (pastas) organizadas:\n\n1. Dados de Identificação\n2. Dados Clínicos\n3. Atividade Física (plano de treinos, check-ins)\n4. Exames Laboratoriais\n5. Plano Terapêutico\n6. Evolução/Seguimento Semanal\n7. Alertas e Recomendações\n8. Comunicação e Registro\n9. Prescrições\n\nNavegue pelas abas para ver todas as informações disponíveis."
  },
  {
    question: "Como ver gráficos de evolução?",
    answer: "Ao visualizar um paciente, você pode clicar no botão 'Ver Gráficos' para abrir um modal com gráficos interativos de:\n\n- Peso ao longo do tempo\n- Circunferência abdominal\n- HbA1c (glicemia)\n- IMC\n- Atividade física realizada\n\nOs gráficos mostram a evolução completa do tratamento e ajudam a identificar tendências e progressos."
  },
  {
    question: "O que são os check-ins diários?",
    answer: "Os check-ins diários são registros que o paciente faz sobre:\n\n- Treinos realizados (tipo, duração, intensidade)\n- Atividades físicas do dia\n- Sintomas durante exercícios\n- Qualidade do sono\n- Nível de energia\n- Motivação para treinar\n- Adesão ao plano de atividade física\n\nO sistema calcula um score de aderência (0-100) baseado nessas informações. Como personal trainer, você pode visualizar todo o histórico de check-ins para entender como o paciente está seguindo o plano de atividade física."
  },
  {
    question: "Como interpretar o score de aderência?",
    answer: "O score de aderência varia de 0 a 100 e é calculado considerando:\n\n- Aderência ao plano de treinos (35%)\n- Realização de atividades físicas (30%)\n- Intensidade e duração dos treinos (20%)\n- Ausência de sintomas limitantes (10%)\n- Motivação e energia (5%)\n\nQuanto maior o score, melhor a aderência. Use esse indicador para identificar pacientes que precisam de mais motivação ou ajuste no plano de atividade física."
  },
  {
    question: "Posso ver o histórico de exames laboratoriais?",
    answer: "Sim! Na aba 'Exames Laboratoriais' do paciente, você pode ver:\n\n- Todos os exames realizados com datas\n- Valores de cada exame\n- Indicadores visuais se estão dentro ou fora da normalidade\n- Gráficos de evolução de cada exame ao longo do tempo\n\nIsso ajuda você a entender o impacto da atividade física no perfil metabólico do paciente e ajustar a intensidade dos treinos conforme necessário."
  },
  {
    question: "Como saber se um paciente está evoluindo bem?",
    answer: "Você pode avaliar a evolução através de:\n\n- Gráficos de peso, IMC e circunferência abdominal (tendência de queda)\n- Score de aderência aos check-ins (tendência de aumento)\n- Exames laboratoriais (melhora nos parâmetros metabólicos)\n- Aumento na frequência e intensidade dos treinos\n- Aderência ao plano de atividade física\n\nCombine essas informações para ter uma visão completa da evolução do paciente."
  }
];

// FAQ - Segurança e Privacidade
export const faqPersonalSeguranca: FAQItem[] = [
  {
    question: "Meus dados estão seguros?",
    answer: "Sim! A plataforma segue todos os padrões de segurança e privacidade de dados. Seus dados pessoais e profissionais são protegidos e só são compartilhados com médicos quando você aprova um vínculo. A plataforma usa autenticação segura do Firebase e criptografia de dados."
  },
  {
    question: "Os dados dos pacientes são confidenciais?",
    answer: "Absolutamente. Os dados dos pacientes são tratados com total confidencialidade. Você só tem acesso a pacientes que foram explicitamente compartilhados com você por um médico vinculado. O acesso é registrado e auditado. Você não pode compartilhar ou exportar dados dos pacientes sem autorização."
  },
  {
    question: "O que acontece se eu perder acesso à minha conta?",
    answer: "Se você perder acesso à sua conta Google, entre em contato com o suporte da plataforma. Como o login é feito através do Google, você precisará recuperar o acesso à sua conta Google primeiro. Uma vez recuperado, você poderá acessar a plataforma normalmente."
  },
  {
    question: "Posso deletar minha conta?",
    answer: "Sim, você pode solicitar a exclusão da sua conta entrando em contato com o administrador da plataforma. Ao deletar sua conta, todos os vínculos serão removidos e você perderá acesso a todos os pacientes compartilhados. Os dados dos pacientes não serão deletados, apenas seu acesso será removido."
  }
];

// Array total de FAQs para personal trainer (todas as categorias)
export const faqPersonalTotal: FAQItem[] = [
  ...faqPersonalPlataforma,
  ...faqPersonalVinculos,
  ...faqPersonalPacientes,
  ...faqPersonalSeguranca
];

// Categorias para personal trainer (para uso com showTabs)
export const faqCategoriesPersonal = [
  {
    name: 'Como funciona a plataforma',
    items: faqPersonalPlataforma,
    icon: <Users size={20} />,
    color: 'from-yellow-600 to-amber-600'
  },
  {
    name: 'Vínculos e Relacionamentos',
    items: faqPersonalVinculos,
    icon: <UserPlus size={20} />,
    color: 'from-blue-600 to-indigo-600'
  },
  {
    name: 'Pacientes e Acompanhamento',
    items: faqPersonalPacientes,
    icon: <Eye size={20} />,
    color: 'from-purple-600 to-pink-600'
  },
  {
    name: 'Segurança e Privacidade',
    items: faqPersonalSeguranca,
    icon: <Shield size={20} />,
    color: 'from-gray-600 to-slate-600'
  }
];
