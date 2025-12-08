import React from 'react';
import { Users, Pill, AlertTriangle, Target, Shield, UtensilsCrossed } from 'lucide-react';

// Interface para itens de FAQ
export interface FAQItem {
  question: string;
  answer: string;
}

// FAQ - Plataforma (Paciente)
export const faqPlatformClient: FAQItem[] = [
  {
    question: "Como acompanhar minha evolução?",
    answer: "Na área de Estatísticas, você pode visualizar gráficos mostrando sua evolução de peso, IMC, circunferência abdominal e outros indicadores ao longo do tempo. Na área de Evolução, você pode ver o histórico completo de todas as suas consultas e registros."
  },
  {
    question: "Como visualizar meus exames laboratoriais?",
    answer: "Na área de Exames Laboratoriais, você pode ver todos os resultados dos seus exames. A plataforma mostra se os valores estão dentro ou fora da normalidade, com gráficos visuais para facilitar o entendimento."
  },
  {
    question: "Como agendar uma consulta?",
    answer: "Entre em contato com seu médico através da área de Mensagens para agendar consultas. Seu médico também pode enviar lembretes sobre consultas agendadas e exames que precisam ser realizados."
  },
  {
    question: "Como verificar meu plano terapêutico?",
    answer: "Na área de Plano Terapêutico, você pode ver a dose atual de Tirzepatida, histórico de doses anteriores, suas metas de peso e HbA1c, e quando está agendada sua próxima revisão médica."
  },
  {
    question: "Como funciona a comunicação com meu médico?",
    answer: "Você pode enviar mensagens para seu médico através da área de Mensagens. Seu médico pode enviar lembretes, orientações e responder suas dúvidas. Todas as mensagens ficam registradas para consulta posterior."
  }
];

// FAQ - Medicamento
export const faqMedicamento: FAQItem[] = [
  {
    question: "Como funciona o tratamento com Tirzepatida?",
    answer: "A Tirzepatida é um medicamento injetável administrado semanalmente para tratamento da obesidade. O tratamento é acompanhado pelo seu médico, que ajusta a dose conforme sua evolução. É importante seguir rigorosamente as orientações médicas e realizar os exames solicitados."
  },
  {
    question: "O que fazer se esquecer de tomar a dose?",
    answer: "Se você esquecer de tomar a dose, entre em contato com seu médico o quanto antes. Não tome doses duplas. Seu médico orientará sobre o melhor procedimento. É importante manter a adesão ao tratamento para obter os melhores resultados."
  },
  {
    question: "Como aplicar a Tirzepatida?",
    answer: "A Tirzepatida é aplicada por via subcutânea (sob a pele), geralmente no abdome, coxa ou braço. Siga as orientações do seu médico sobre o local de aplicação e a técnica correta. Lave as mãos antes de aplicar e use uma área diferente a cada aplicação."
  },
  {
    question: "Quais são os horários ideais para aplicar?",
    answer: "O horário ideal é aquele que você consegue manter consistentemente. Muitos pacientes preferem aplicar no mesmo dia da semana, pela manhã ou à noite. O importante é manter a regularidade e não esquecer as doses."
  }
];

// FAQ - Efeitos Colaterais
export const faqEfeitosColaterais: FAQItem[] = [
  {
    question: "O que fazer se tiver efeitos colaterais?",
    answer: "Se você sentir qualquer efeito colateral, entre em contato imediatamente com seu médico através da área de Mensagens. Efeitos colaterais comuns incluem náusea, vômito e desconforto gastrointestinal, mas seu médico pode orientá-lo sobre como minimizá-los."
  },
  {
    question: "Quais são os efeitos colaterais mais comuns?",
    answer: "Os efeitos colaterais mais comuns da Tirzepatida incluem náusea, vômito, diarreia, constipação, desconforto abdominal e diminuição do apetite. Geralmente são leves a moderados e tendem a diminuir com o tempo. Se persistirem ou forem graves, consulte seu médico."
  },
  {
    question: "Como minimizar os efeitos colaterais?",
    answer: "Algumas estratégias podem ajudar: comer refeições menores e mais frequentes, evitar alimentos gordurosos ou muito condimentados, beber bastante água, e seguir o plano nutricional recomendado. Seu médico pode ajustar a dose se necessário."
  },
  {
    question: "Quando devo procurar ajuda médica urgente?",
    answer: "Procure ajuda médica imediata se tiver: vômitos persistentes, desidratação, dor abdominal intensa, dificuldade para engolir, ou qualquer sintoma que cause preocupação. Não hesite em entrar em contato com seu médico."
  }
];

// FAQ - Resultados e Metas
export const faqResultados: FAQItem[] = [
  {
    question: "Quanto tempo leva para ver resultados?",
    answer: "Os resultados variam de pessoa para pessoa. Alguns pacientes começam a notar mudanças nas primeiras semanas, enquanto outros podem levar mais tempo. É importante manter a adesão ao tratamento, seguir o plano nutricional e realizar atividade física regularmente."
  },
  {
    question: "Quais são as metas de perda de peso?",
    answer: "As metas são definidas individualmente pelo seu médico baseadas no seu peso inicial, IMC e condições de saúde. Geralmente, uma perda de 5-10% do peso inicial já traz benefícios significativos para a saúde. Acompanhe sua evolução na área de Estatísticas."
  },
  {
    question: "O que fazer se não estiver perdendo peso?",
    answer: "Se não estiver vendo resultados, converse com seu médico. Ele pode ajustar a dose, revisar seu plano nutricional, ou investigar outros fatores. Lembre-se que a perda de peso é um processo gradual e varia entre indivíduos."
  },
  {
    question: "Como acompanhar minha evolução?",
    answer: "Use a área de Estatísticas para ver gráficos de peso, IMC e outros indicadores. Faça o check-in diário na aba Nutri para acompanhar sua aderência ao plano. Seu médico também acompanha sua evolução e pode fazer ajustes quando necessário."
  }
];

// FAQ - Segurança e Situações Especiais
export const faqSeguranca: FAQItem[] = [
  {
    question: "Posso tomar outros medicamentos junto com Tirzepatida?",
    answer: "Informe sempre seu médico sobre todos os medicamentos que você está tomando, incluindo suplementos e vitaminas. Alguns medicamentos podem interagir com a Tirzepatida, então é importante que seu médico esteja ciente de tudo."
  },
  {
    question: "E se eu estiver grávida ou amamentando?",
    answer: "Se você estiver grávida, planejando engravidar ou amamentando, informe imediatamente seu médico. A Tirzepatida não é recomendada durante a gravidez ou amamentação, e seu médico precisará ajustar seu tratamento."
  },
  {
    question: "Posso beber álcool durante o tratamento?",
    answer: "Converse com seu médico sobre o consumo de álcool. Geralmente, é recomendado limitar ou evitar o consumo de álcool, especialmente no início do tratamento, pois pode aumentar o risco de efeitos colaterais gastrointestinais."
  },
  {
    question: "O que fazer antes de uma cirurgia?",
    answer: "Informe sempre seu médico cirurgião e anestesista que você está em tratamento com Tirzepatida. Pode ser necessário interromper temporariamente o tratamento antes de procedimentos cirúrgicos, mas isso deve ser decidido pelo seu médico."
  }
];

// FAQ - Nutrição e Cardápio
export const nutriFaqItems: FAQItem[] = [
  {
    question: "Como funciona o plano nutricional personalizado?",
    answer: "O plano nutricional é gerado automaticamente após você responder um questionário sobre seus hábitos, preferências e restrições alimentares. O sistema calcula sua meta de proteína diária baseada no seu IMC, determina o estilo alimentar mais adequado (digestiva, rica em proteína, mediterrânea, etc.) e cria um cardápio personalizado com opções para cada refeição do dia."
  },
  {
    question: "Como fazer o check-in diário?",
    answer: "Na aba Nutri, clique no botão 'Check-in Diário' no topo da página. Você pode registrar o check-in para hoje ou até 3 dias atrás. O check-in inclui perguntas sobre alimentação, suplementos, sintomas gastrointestinais, sono, energia e aderência ao plano. Um score de 0 a 100 é calculado automaticamente para acompanhar sua evolução."
  },
  {
    question: "Posso personalizar meu cardápio?",
    answer: "Sim! Na aba 'Cardápio' dentro de Nutri, você pode clicar em qualquer refeição para ver opções alternativas. Cada opção mostra a quantidade aproximada de proteína e calorias. O sistema ajusta automaticamente os lanches se necessário para garantir que você atinja sua meta mínima de proteína diária."
  },
  {
    question: "O que é a hipótese comportamental?",
    answer: "A hipótese comportamental é um resumo gerado automaticamente pelo sistema baseado nas suas respostas no questionário inicial. Ela descreve seu perfil nutricional, incluindo padrões de fome, qualidade do sono, rotina de atividade física e comportamentos alimentares. Isso ajuda a entender melhor seu perfil e ajustar o plano conforme necessário."
  },
  {
    question: "Como funciona o score de aderência do check-in?",
    answer: "O score é calculado considerando: aderência ao plano (30%), alimentação e hidratação (30%), suplementos (15%), sintomas gastrointestinais (15%), sono e energia (5%), atividade física (3%) e adesão à Tirzepatida (2%). Quanto maior o score, melhor sua aderência ao tratamento. Você pode acompanhar sua evolução no histórico de check-ins."
  },
  {
    question: "Quais suplementos são recomendados?",
    answer: "O sistema pode recomendar probiótico (importante para saúde intestinal com Tirzepatida), whey protein (para ajudar a atingir a meta de proteína) e creatina (para pacientes com atividade física regular). As recomendações aparecem na aba 'Plano Nutri' e são baseadas no seu estilo alimentar e necessidades individuais."
  },
  {
    question: "Como é calculada minha meta de proteína?",
    answer: "A meta de proteína diária é calculada baseada no seu peso e IMC: se IMC < 27, usa 1.2g por kg; se IMC entre 27-32, usa 1.4g por kg; se IMC > 32, usa 1.5g por kg. A proteína é distribuída ao longo do dia: café, almoço e jantar recebem mais proteína (cerca de 30% cada), enquanto os lanches recebem menos (cerca de 20% cada)."
  },
  {
    question: "O que fazer se tiver sintomas gastrointestinais?",
    answer: "Registre os sintomas no check-in diário (náuseas, constipação, diarreia). Se os sintomas forem graves, entre em contato imediatamente com seu médico. O sistema ajusta automaticamente o estilo alimentar para 'digestiva' se você tiver sintomas moderados ou graves, priorizando alimentos mais leves e de fácil digestão."
  },
  {
    question: "Posso editar um check-in que já fiz?",
    answer: "Sim! Você pode editar check-ins até 3 dias atrás. Ao selecionar uma data no campo de data do check-in, se já existir um registro para aquela data, o formulário será preenchido automaticamente e você poderá fazer alterações. Isso é útil para corrigir informações ou completar dados que faltaram."
  }
];

// Array total de FAQs para paciente (sem nutrição)
export const faqPacienteTotal: FAQItem[] = [
  ...faqPlatformClient,
  ...faqMedicamento,
  ...faqEfeitosColaterais,
  ...faqResultados,
  ...faqSeguranca
];

// Categorias para paciente (para uso com showTabs)
export const faqCategoriesPaciente = [
  {
    name: 'Como funciona a plataforma',
    items: faqPlatformClient,
    icon: <Users size={20} />,
    color: 'from-blue-600 to-indigo-600'
  },
  {
    name: 'Medicamento',
    items: faqMedicamento,
    icon: <Pill size={20} />,
    color: 'from-purple-600 to-pink-600'
  },
  {
    name: 'Efeitos Colaterais',
    items: faqEfeitosColaterais,
    icon: <AlertTriangle size={20} />,
    color: 'from-orange-600 to-red-600'
  },
  {
    name: 'Resultados e Metas',
    items: faqResultados,
    icon: <Target size={20} />,
    color: 'from-teal-600 to-cyan-600'
  },
  {
    name: 'Segurança e situações especiais',
    items: faqSeguranca,
    icon: <Shield size={20} />,
    color: 'from-gray-600 to-slate-600'
  }
];
