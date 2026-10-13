export type CinquentaKgDepoisQuestion = {
  id: string;
  text: string;
  large?: boolean;
  hint?: string;
};

export type CinquentaKgDepoisChapter = {
  id: string;
  number: number;
  title: string;
  introduction?: string;
  questions: CinquentaKgDepoisQuestion[];
  /** Mensagem humana exibida ao concluir o capítulo (pausa emocional). */
  closingMessage?: string;
};

function q(chapterId: string, index: number, text: string, extra?: Partial<CinquentaKgDepoisQuestion>) {
  return {
    id: `${chapterId}-q${index}`,
    text,
    ...extra,
  };
}

const CH1 = 'antes-dos-153kg';
const CH2 = 'como-cheguei-aos-153kg';
const CH3 = 'a-vida-foi-ficando-menor';
const CH4 = 'eu-ja-tinha-tentado';
const CH5 = 'a-mente-antes-da-mudanca';
const CH6 = 'o-ponto-de-ruptura';
const CH7 = 'pedir-ajuda';
const CH8 = 'a-medicacao';
const CH9 = 'os-primeiros-quilos';
const CH10 = 'mudar-os-habitos';
const CH11 = 'o-corpo-em-movimento';
const CH12 = 'os-dias-dificeis';
const CH13 = 'quando-os-outros-comecaram-a-ver';
const CH14 = 'quem-eu-estava-me-tornando';
const CH15 = 'familia-e-amor';
const CH16 = 'fe-espiritualidade-proposito';
const CH17 = '50-kg-depois';
const CH18 = 'longevidade';
const CH19 = 'o-medo-de-voltar';
const CH20 = 'a-carta';

export const CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS: CinquentaKgDepoisChapter[] = [
  {
    id: CH1,
    number: 1,
    title: 'Antes dos 153 kg',
    introduction:
      'Antes de falarmos sobre emagrecimento, queremos conhecer o Antônio que existia antes dessa transformação.',
    questions: [
      q(CH1, 1, 'Como você se apresentaria para alguém que nunca conheceu você?'),
      q(CH1, 2, 'Onde você nasceu e como foi a sua infância?'),
      q(CH1, 3, 'Quais são as primeiras lembranças que você tem relacionadas à comida?'),
      q(
        CH1,
        4,
        'Na sua infância, a comida representava o quê dentro da sua casa? Exemplo: união, comemoração, recompensa, carinho, fartura, necessidade ou outra coisa.'
      ),
      q(CH1, 5, 'Você se lembra de quando começou a perceber que seu peso estava aumentando?'),
      q(
        CH1,
        6,
        'Na infância ou adolescência, você já sofreu comentários, brincadeiras, bullying ou constrangimentos relacionados ao seu corpo?'
      ),
      q(CH1, 7, 'Existe alguma lembrança dessa época que ainda permanece muito viva em você?'),
      q(CH1, 8, 'Como era a sua relação com seu corpo quando era mais jovem?'),
      q(
        CH1,
        9,
        'Em algum momento da vida você se considerava uma pessoa saudável? Conte como era essa fase.'
      ),
      q(
        CH1,
        10,
        'Se você pudesse encontrar o Antônio de 15 ou 20 anos atrás, o que diria para ele?'
      ),
    ],
  },
  {
    id: CH2,
    number: 2,
    title: 'Como cheguei aos 153 kg',
    introduction:
      'Ninguém acorda um dia 50 kg mais pesado. Grandes mudanças são construídas aos poucos.',
    questions: [
      q(CH2, 1, 'Como você acredita que chegou aos 153 kg?'),
      q(
        CH2,
        2,
        'O ganho de peso aconteceu de forma lenta ou existiram períodos em que você ganhou muito peso rapidamente?'
      ),
      q(
        CH2,
        3,
        'Quais acontecimentos da sua vida você acredita que contribuíram para o aumento do peso?'
      ),
      q(CH2, 4, 'Como era um dia comum da sua alimentação naquela época?'),
      q(CH2, 5, 'Você comia mesmo sem estar fisicamente com fome?'),
      q(CH2, 6, 'Em quais momentos você sentia mais vontade de comer?'),
      q(
        CH2,
        7,
        'A comida já funcionou para você como recompensa, alívio, conforto, distração, comemoração ou forma de lidar com ansiedade ou estresse? Explique com suas palavras.'
      ),
      q(CH2, 8, 'Existiam alimentos ou situações em que você sentia dificuldade de parar?'),
      q(CH2, 9, 'Você escondia ou minimizava para outras pessoas o quanto comia?'),
      q(CH2, 10, 'Você evitava se pesar?'),
      q(CH2, 11, 'Quando percebeu que havia chegado aos 153 kg, o que sentiu?'),
      q(CH2, 12, 'Qual foi o maior peso que você já viu na balança?'),
      q(CH2, 13, 'O que você pensou naquele momento?'),
      q(CH2, 14, 'Você acreditava que conseguiria perder 50 kg?'),
      q(
        CH2,
        15,
        'Naquela época, se alguém mostrasse uma fotografia sua hoje, com 103 kg, você acreditaria?'
      ),
    ],
  },
  {
    id: CH3,
    number: 3,
    title: 'A vida foi ficando menor',
    introduction:
      'O peso ocupa espaço no corpo. Mas, às vezes, começa também a ocupar espaço na vida.',
    closingMessage:
      'Obrigado por compartilhar isso.\n\nAlgumas histórias não são fáceis de revisitar.\n\nVocê pode fazer uma pausa e continuar quando quiser.',
    questions: [
      q(CH3, 1, 'O que ficou mais difícil fisicamente com o aumento do peso?'),
      q(CH3, 2, 'Existiam atividades que você deixou de fazer?'),
      q(
        CH3,
        3,
        'Você sentia dificuldade para caminhar, subir escadas, amarrar o tênis, dormir, entrar em determinados lugares, viajar, comprar roupas ou aparecer em fotografias? Conte o que realmente acontecia com você.'
      ),
      q(CH3, 4, 'Você já evitou algum lugar ou situação por causa do seu peso?'),
      q(CH3, 5, 'Existe algum episódio de constrangimento que marcou você?'),
      q(CH3, 6, 'Como você se sentia ao se olhar no espelho?'),
      q(CH3, 7, 'Como se sentia quando alguém tirava uma fotografia sua?'),
      q(CH3, 8, 'Você evitava aparecer em fotos?'),
      q(CH3, 9, 'O peso afetava sua autoestima?'),
      q(CH3, 10, 'Afetava sua vida afetiva, social ou sexual?'),
      q(
        CH3,
        11,
        'Existia algo que você queria fazer, mas acreditava que seu corpo não permitia?'
      ),
      q(CH3, 12, 'Qual era o seu maior medo em relação ao futuro?'),
      q(CH3, 13, 'Você tinha medo de morrer cedo?'),
      q(CH3, 14, 'Você pensava nas consequências do peso para sua saúde?'),
      q(
        CH3,
        15,
        'Mesmo sabendo dos riscos, por que você acredita que era tão difícil mudar?'
      ),
    ],
  },
  {
    id: CH4,
    number: 4,
    title: 'Eu já tinha tentado',
    introduction:
      'Antes da transformação, quase sempre existe uma história de tentativas que ninguém vê.',
    closingMessage:
      'Obrigado por compartilhar isso.\n\nAlgumas histórias não são fáceis de revisitar.\n\nVocê pode fazer uma pausa e continuar quando quiser.',
    questions: [
      q(CH4, 1, 'Quantas vezes você acredita que já tentou emagrecer?'),
      q(CH4, 2, 'Qual foi a primeira tentativa de emagrecimento de que você se lembra?'),
      q(
        CH4,
        3,
        'Quais dietas, tratamentos, medicamentos ou estratégias você já havia tentado?'
      ),
      q(CH4, 4, 'Alguma delas funcionou temporariamente?'),
      q(CH4, 5, 'Por que você acredita que voltou a ganhar peso?'),
      q(CH4, 6, 'Como você se sentia cada vez que recuperava o peso perdido?'),
      q(CH4, 7, 'Em algum momento você pensou: "Eu não consigo"?'),
      q(CH4, 8, 'Você chegou a acreditar que seria obeso para sempre?'),
      q(CH4, 9, 'Você já pensou em cirurgia bariátrica?'),
      q(CH4, 10, 'Se pensou, por que fez ou não fez?'),
      q(CH4, 11, 'O que mais cansava: tentar emagrecer ou voltar a engordar?'),
      q(
        CH4,
        12,
        'Depois de tantas tentativas, o que fez você aceitar tentar mais uma vez?'
      ),
    ],
  },
  {
    id: CH5,
    number: 5,
    title: 'A mente antes da mudança',
    introduction:
      'Às vezes, repetimos uma história sobre nós mesmos por tanto tempo que ela começa a parecer uma verdade.',
    questions: [
      q(CH5, 1, 'Como você se descrevia naquela época?'),
      q(
        CH5,
        2,
        'Quais frases você costumava dizer sobre você mesmo? Exemplos: "Eu não tenho disciplina.", "Eu sempre fui assim.", "Eu não consigo emagrecer.", "Na minha família todo mundo é assim."'
      ),
      q(CH5, 3, 'Qual dessas frases mais se repetia na sua cabeça?'),
      q(CH5, 4, 'Você acreditava que não tinha força de vontade?'),
      q(CH5, 5, 'O que significava "fracassar" para você?'),
      q(
        CH5,
        6,
        'Quando cometia um erro na alimentação, o que normalmente acontecia depois?'
      ),
      q(
        CH5,
        7,
        'Um erro fazia você pensar que havia perdido todo o progresso?'
      ),
      q(CH5, 8, 'Você era muito crítico consigo mesmo?'),
      q(CH5, 9, 'Como você falava consigo mesmo depois de falhar?'),
      q(
        CH5,
        10,
        'Hoje, olhando para trás, você acha que se tratava como trataria alguém que ama?'
      ),
      q(CH5, 11, 'Qual era a maior mentira que você acreditava sobre você mesmo?'),
      q(CH5, 12, 'Qual verdade você só descobriu depois?'),
    ],
  },
  {
    id: CH6,
    number: 6,
    title: 'O ponto de ruptura',
    introduction:
      'Existe um momento em que continuar igual começa a doer mais do que mudar.',
    closingMessage:
      'Obrigado por compartilhar isso.\n\nAlgumas histórias não são fáceis de revisitar.\n\nVocê pode fazer uma pausa e continuar quando quiser.',
    questions: [
      q(CH6, 1, 'Você se lembra do momento em que decidiu que precisava mudar?'),
      q(CH6, 2, 'Onde você estava?'),
      q(CH6, 3, 'O que havia acontecido?'),
      q(CH6, 4, 'Havia alguém com você?'),
      q(CH6, 5, 'O que você sentiu?'),
      q(
        CH6,
        6,
        'Houve uma fotografia, exame, conversa, susto, limitação ou acontecimento específico?'
      ),
      q(CH6, 7, 'Qual foi o pensamento que passou pela sua cabeça?'),
      q(CH6, 8, 'O que você tinha medo de perder se continuasse daquela forma?'),
      q(CH6, 9, 'Por quem, além de você, valia a pena mudar?'),
      q(CH6, 10, 'O que fez essa tentativa ser diferente das anteriores?'),
      q(
        CH6,
        11,
        'Você acreditava realmente que conseguiria ou começou mesmo com medo de falhar?'
      ),
      q(
        CH6,
        12,
        'Se pudesse resumir aquele momento em uma frase, qual seria?'
      ),
    ],
  },
  {
    id: CH7,
    number: 7,
    title: 'Pedir ajuda',
    questions: [
      q(CH7, 1, 'Como você chegou ao acompanhamento médico atual?'),
      q(CH7, 2, 'O que esperava da primeira consulta?'),
      q(CH7, 3, 'Você tinha medo de ser julgado?'),
      q(CH7, 4, 'O que sentiu durante a primeira conversa?'),
      q(CH7, 5, 'Houve alguma frase dita naquela consulta que marcou você?'),
      q(
        CH7,
        6,
        'Pela primeira vez você sentiu que alguém estava olhando para o problema de forma diferente?'
      ),
      q(
        CH7,
        7,
        'O que mudou quando percebeu que não precisaria fazer tudo sozinho?'
      ),
      q(CH7, 8, 'Qual era a sua expectativa inicial de perda de peso?'),
      q(CH7, 9, 'Em algum momento imaginou que perderia 50 kg?'),
      q(CH7, 10, 'O que fez você confiar no tratamento?'),
    ],
  },
  {
    id: CH8,
    number: 8,
    title: 'A medicação',
    introduction:
      'Esta parte da história precisa ser contada sem vergonha, sem milagres e sem mentiras.',
    questions: [
      q(
        CH8,
        1,
        'Antes de iniciar o tratamento, o que você pensava sobre medicamentos para emagrecimento?'
      ),
      q(CH8, 2, 'Tinha preconceito, medo ou desconfiança?'),
      q(
        CH8,
        3,
        'Qual medicação você utilizou durante a jornada?',
        { hint: 'Responda livremente, com suas palavras.' }
      ),
      q(CH8, 4, 'O que o médico explicou antes do início?'),
      q(CH8, 5, 'O que você sentiu nas primeiras semanas?'),
      q(CH8, 6, 'Sua fome mudou?'),
      q(CH8, 7, 'Sua relação com a comida mudou?'),
      q(
        CH8,
        8,
        'Pela primeira vez você percebeu diferença entre fome e vontade de comer?'
      ),
      q(CH8, 9, 'Teve efeitos adversos ou dificuldades?'),
      q(CH8, 10, 'Houve momentos em que pensou em interromper?'),
      q(CH8, 11, 'O que a medicação tornou mais fácil?'),
      q(CH8, 12, 'O que a medicação NÃO fez por você?'),
      q(CH8, 13, 'Quais mudanças ainda dependeram das suas decisões?'),
      q(
        CH8,
        14,
        'Como você responde quando alguém diz: "Você só emagreceu por causa da caneta"?'
      ),
      q(
        CH8,
        15,
        'Se pudesse explicar para alguém a verdadeira função da medicação na sua história, o que diria?'
      ),
    ],
  },
  {
    id: CH9,
    number: 9,
    title: 'Os primeiros quilos',
    questions: [
      q(CH9, 1, 'Você se lembra do primeiro quilo perdido?'),
      q(CH9, 2, 'E dos primeiros 5 kg?'),
      q(CH9, 3, 'Quando percebeu que o tratamento realmente poderia funcionar?'),
      q(CH9, 4, 'Qual foi a primeira mudança física que percebeu?'),
      q(CH9, 5, 'Qual foi a primeira pessoa que percebeu?'),
      q(CH9, 6, 'O que ela disse?'),
      q(CH9, 7, 'Qual foi a primeira roupa que voltou a servir?'),
      q(CH9, 8, 'Existe uma fotografia dessa fase que marcou você?'),
      q(
        CH9,
        9,
        'Qual foi o primeiro número na balança que fez você pensar: "Eu realmente estou conseguindo"?'
      ),
      q(
        CH9,
        10,
        'O que mudou na sua motivação quando começou a ver resultados?'
      ),
    ],
  },
  {
    id: CH10,
    number: 10,
    title: 'Mudar os hábitos',
    questions: [
      q(CH10, 1, 'Qual hábito foi mais difícil de mudar?'),
      q(CH10, 2, 'Qual mudança foi mais fácil do que imaginava?'),
      q(CH10, 3, 'Como sua alimentação mudou?'),
      q(CH10, 4, 'Como sua relação com porções mudou?'),
      q(
        CH10,
        5,
        'Como aprendeu a lidar com festas, viagens e finais de semana?'
      ),
      q(CH10, 6, 'Você precisou mudar seu ambiente?'),
      q(CH10, 7, 'Sua família mudou junto com você?'),
      q(CH10, 8, 'Houve pessoas que ajudaram?'),
      q(CH10, 9, 'Houve pessoas que dificultaram?'),
      q(
        CH10,
        10,
        'Como você passou a lidar com vontade de comer sem fome?'
      ),
      q(
        CH10,
        11,
        'O que você faz hoje que o Antônio de 153 kg não fazia?'
      ),
      q(
        CH10,
        12,
        'Qual pequeno hábito teve um impacto muito maior do que você imaginava?'
      ),
    ],
  },
  {
    id: CH11,
    number: 11,
    title: 'O corpo em movimento',
    questions: [
      q(CH11, 1, 'Como era sua relação com exercício antes?'),
      q(CH11, 2, 'Você tinha vergonha ou medo de começar?'),
      q(CH11, 3, 'Qual foi a primeira atividade física da nova fase?'),
      q(CH11, 4, 'O que era difícil no início?'),
      q(CH11, 5, 'Quando percebeu que estava ficando mais forte?'),
      q(
        CH11,
        6,
        'Qual movimento ou atividade você consegue fazer hoje que antes era difícil?'
      ),
      q(
        CH11,
        7,
        'O exercício mudou apenas seu corpo ou também sua mente?'
      ),
      q(CH11, 8, 'Como se sente depois de treinar?'),
      q(
        CH11,
        9,
        'O que aprendeu sobre disciplina através do exercício?'
      ),
      q(CH11, 10, 'Hoje, o que significa ser forte para você?'),
    ],
  },
  {
    id: CH12,
    number: 12,
    title: 'Os dias difíceis',
    introduction: 'Nenhuma transformação real acontece em linha reta.',
    closingMessage:
      'Obrigado por compartilhar isso.\n\nAlgumas histórias não são fáceis de revisitar.\n\nVocê pode fazer uma pausa e continuar quando quiser.',
    questions: [
      q(CH12, 1, 'Qual foi o momento mais difícil de toda a jornada?'),
      q(CH12, 2, 'Houve alguma fase em que o peso parou de cair?'),
      q(CH12, 3, 'Como você reagiu?'),
      q(CH12, 4, 'Pensou em desistir?'),
      q(CH12, 5, 'Houve algum episódio em que voltou a comer como antes?'),
      q(CH12, 6, 'Como se sentiu depois?'),
      q(CH12, 7, 'O que fez diferente dessa vez?'),
      q(CH12, 8, 'Quanto tempo você levava para voltar ao caminho antes?'),
      q(CH12, 9, 'Quanto tempo leva hoje?'),
      q(CH12, 10, 'Qual foi a maior recaída ou erro da jornada?'),
      q(CH12, 11, 'O que esse erro ensinou?'),
      q(
        CH12,
        12,
        'Quem ajudou você nos momentos em que pensou em desistir?'
      ),
    ],
  },
  {
    id: CH13,
    number: 13,
    title: 'Quando os outros começaram a ver',
    questions: [
      q(CH13, 1, 'Como as pessoas começaram a reagir à sua transformação?'),
      q(CH13, 2, 'Qual elogio mais marcou você?'),
      q(CH13, 3, 'Algum comentário incomodou?'),
      q(
        CH13,
        4,
        'Você percebeu que as pessoas passaram a tratar você de forma diferente?'
      ),
      q(CH13, 5, 'Como se sentiu com a atenção recebida?'),
      q(CH13, 6, 'Houve pessoas que se inspiraram em você?'),
      q(
        CH13,
        7,
        'Alguém começou a cuidar da própria saúde por sua causa?'
      ),
      q(
        CH13,
        8,
        'Como é perceber que sua transformação pode influenciar outras pessoas?'
      ),
    ],
  },
  {
    id: CH14,
    number: 14,
    title: 'Quem eu estava me tornando',
    questions: [
      q(
        CH14,
        1,
        'Em que momento percebeu que não estava apenas perdendo peso?'
      ),
      q(CH14, 2, 'O que mudou na sua forma de pensar?'),
      q(CH14, 3, 'O que mudou na sua disciplina?'),
      q(CH14, 4, 'O que mudou na sua relação com fracassos?'),
      q(CH14, 5, 'O que mudou na sua autoestima?'),
      q(CH14, 6, 'Você se considera a mesma pessoa?'),
      q(CH14, 7, 'O que permaneceu igual?'),
      q(
        CH14,
        8,
        'O que precisou morrer simbolicamente para essa nova versão nascer?'
      ),
      q(
        CH14,
        9,
        'Qual foi a primeira vez em que pensou: "Eu não sou mais aquele homem"?'
      ),
      q(CH14, 10, 'Quem é Antônio hoje?'),
    ],
  },
  {
    id: CH15,
    number: 15,
    title: 'Família e amor',
    closingMessage:
      'Obrigado por compartilhar isso.\n\nAlgumas histórias não são fáceis de revisitar.\n\nVocê pode fazer uma pausa e continuar quando quiser.',
    questions: [
      q(CH15, 1, 'Quem são as pessoas mais importantes da sua vida?'),
      q(CH15, 2, 'Como elas viveram sua transformação?'),
      q(CH15, 3, 'Quem mais apoiou você?'),
      q(
        CH15,
        4,
        'Existe alguma conversa com alguém da família que marcou sua jornada?'
      ),
      q(
        CH15,
        5,
        'O que você queria continuar vivendo ao lado dessas pessoas?'
      ),
      q(
        CH15,
        6,
        'Você acredita que cuidar da sua saúde também foi uma forma de cuidar de quem ama?'
      ),
      q(
        CH15,
        7,
        'Se sua família pudesse ler apenas uma página deste livro, o que você gostaria de dizer a eles?'
      ),
      q(CH15, 8, 'Por quem você quer viver mais?'),
    ],
  },
  {
    id: CH16,
    number: 16,
    title: 'Fé, espiritualidade e propósito',
    introduction:
      'Não há resposta certa aqui. Conte apenas o que faz sentido para a sua experiência.',
    questions: [
      q(CH16, 1, 'A fé ou espiritualidade têm importância na sua vida?'),
      q(
        CH16,
        2,
        'Essa dimensão teve algum papel na sua transformação?'
      ),
      q(
        CH16,
        3,
        'Você chegou a pedir a Deus, rezar, orar ou buscar força espiritual durante a jornada?'
      ),
      q(
        CH16,
        4,
        'Houve algum momento em que sentiu que não estava sozinho?'
      ),
      q(
        CH16,
        5,
        'O que você acredita que significa receber uma nova oportunidade?'
      ),
      q(
        CH16,
        6,
        'Você acredita que existe um propósito para a sua história?'
      ),
      q(CH16, 7, 'Por que você acha que viveu tudo isso?'),
      q(
        CH16,
        8,
        'O que gostaria que outras pessoas aprendessem com sua experiência?'
      ),
      q(CH16, 9, 'Se pudesse agradecer hoje, pelo que agradeceria?'),
      q(CH16, 10, 'O que significa "vida" para você hoje?'),
    ],
  },
  {
    id: CH17,
    number: 17,
    title: '50 kg depois',
    questions: [
      q(
        CH17,
        1,
        'Onde você estava quando percebeu que havia perdido 50 kg?'
      ),
      q(CH17, 2, 'Qual foi o peso exato?'),
      q(CH17, 3, 'O que sentiu?'),
      q(CH17, 4, 'Para quem contou primeiro?'),
      q(CH17, 5, 'Você chorou?'),
      q(CH17, 6, 'Comemorou?'),
      q(CH17, 7, 'Qual foi o primeiro pensamento?'),
      q(CH17, 8, 'O que 50 kg representam para você?'),
      q(CH17, 9, 'O que você perdeu além de peso?'),
      q(CH17, 10, 'O que ganhou além de saúde?'),
      q(
        CH17,
        11,
        'Qual é a maior diferença entre o Antônio de 153 kg e o Antônio de 103 kg?'
      ),
      q(
        CH17,
        12,
        'O que o homem de 103 kg diria olhando para uma fotografia do homem de 153 kg?'
      ),
    ],
  },
  {
    id: CH18,
    number: 18,
    title: 'Longevidade',
    questions: [
      q(
        CH18,
        1,
        'Antes da transformação, você pensava sobre quanto tempo viveria?'
      ),
      q(CH18, 2, 'Tinha medo de adoecer?'),
      q(CH18, 3, 'Tinha medo de morrer cedo?'),
      q(CH18, 4, 'Hoje, como imagina seu futuro?'),
      q(CH18, 5, 'Como gostaria de estar aos 60 anos?'),
      q(CH18, 6, 'Aos 70?'),
      q(CH18, 7, 'Aos 80?'),
      q(CH18, 8, 'O que ainda quer viver?'),
      q(CH18, 9, 'Onde ainda quer ir?'),
      q(CH18, 10, 'Com quem quer estar?'),
      q(
        CH18,
        11,
        'O que quer conseguir fazer fisicamente no futuro?'
      ),
      q(
        CH18,
        12,
        'Para você, qual a diferença entre viver muito e viver bem?'
      ),
    ],
  },
  {
    id: CH19,
    number: 19,
    title: 'O medo de voltar',
    questions: [
      q(CH19, 1, 'Você tem medo de recuperar o peso?'),
      q(CH19, 2, 'O que mais teme?'),
      q(
        CH19,
        3,
        'O que aprendeu que poderá ajudar a evitar isso?'
      ),
      q(
        CH19,
        4,
        'Como enxerga a necessidade de continuar sendo acompanhado?'
      ),
      q(
        CH19,
        5,
        'O que pretende fazer quando perceber que está se afastando do caminho?'
      ),
      q(CH19, 6, 'Qual é o seu plano para os próximos anos?'),
      q(CH19, 7, 'Você acredita que a transformação terminou?'),
      q(CH19, 8, 'O que significa manutenção para você?'),
    ],
  },
  {
    id: CH20,
    number: 20,
    title: 'A carta',
    questions: [
      q(CH20, 1, 'Escreva uma carta para o Antônio de 153 kg.', { large: true }),
      q(
        CH20,
        2,
        'Agora escreva uma carta para alguém que está lendo este livro, está sofrendo com o próprio peso e acredita que não consegue mudar.',
        { large: true }
      ),
      q(CH20, 3, 'Complete a frase:\n\n50 kg depois, eu descobri que...', {
        large: true,
      }),
      q(
        CH20,
        4,
        'Se a sua história pudesse deixar apenas uma mensagem para o mundo, qual seria?',
        { large: true }
      ),
    ],
  },
];

export const CINQUENTA_KG_DEPOIS_CHAPTER_COUNT = CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS.length;

export function findChapterIndexById(chapterId: string): number {
  return CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS.findIndex((ch) => ch.id === chapterId);
}

export function findQuestionById(questionId: string) {
  for (const chapter of CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS) {
    const question = chapter.questions.find((qItem) => qItem.id === questionId);
    if (question) return { chapter, question };
  }
  return null;
}
