'use client';

import React, { useState } from 'react';

// Interfaces para tipagem
interface Droga {
  droga: string;
  classe?: string;
  via?: string;
  posologia?: string;
  mecanismo: string;
  indicacoes: string;
  efeitos: string;
  contraindicacoes?: string;
  observacoes: string;
}

interface GrupoFarmacologico {
  nome: string;
  grupos: Droga[];
}

interface FarmacoModalProps {
  isOpen: boolean;
  onClose: () => void;
  grupo: GrupoFarmacologico | null;
}

// Dados farmacológicos organizados conforme especificado
const dadosFarmacologicos: GrupoFarmacologico[] = [
  {
    nome: "Conservantes",
    grupos: [
      {
        droga: "Cloreto de Benzalcônio (BAK)",
        classe: "Conservante catiónico de amônio quaternário",
        via: "Presente em colírios",
        posologia: "Não se aplica (componente veiculado)",
        mecanismo: "Desorganiza a membrana celular microbiana, causando lise.",
        indicacoes: "Preservação antimicrobiana de colírios multiuso.",
        efeitos: "Toxicidade para o epitélio corneano, olhos secos, inflamação da superfície ocular.",
        contraindicacoes: "Pacientes com olho seco moderado a grave, uso crônico em portadores de glaucoma.",
        observacoes: "Mais tóxico entre os conservantes; contraindicado em uso contínuo. Pode desestabilizar filme lacrimal."
      },
      {
        droga: "EDTA (Ácido Etilenodiamino Tetra-acético)",
        classe: "Quelante de metais pesados",
        via: "Componente de colírios",
        posologia: "Não se aplica (componente veiculado)",
        mecanismo: "Inativa íons metálicos essenciais à atividade microbiana.",
        indicacoes: "Potencializa ação de conservantes como o BAK.",
        efeitos: "Pode causar leve toxicidade epitelial com uso prolongado.",
        contraindicacoes: "Hipersensibilidade conhecida ao componente (raro).",
        observacoes: "Frequentemente associado ao BAK. Menos tóxico isoladamente."
      },
      {
        droga: "Purite®",
        classe: "Conservante oxidativo (estabilizado com clorito de sódio)",
        via: "Colírios multiuso (ex: brimonidina com purite)",
        posologia: "Não se aplica (componente veiculado)",
        mecanismo: "Libera pequenas quantidades de oxidantes que degradam após contato ocular.",
        indicacoes: "Alternativa ao BAK para reduzir toxicidade.",
        efeitos: "Menor irritação que BAK. Possível desconforto leve inicial.",
        contraindicacoes: "Raramente necessário suspender. Melhor tolerado em geral.",
        observacoes: "Decompõe-se em água, oxigênio e sal. Boa opção em uso prolongado."
      },
      {
        droga: "Polyquad®",
        classe: "Polímero catiônico de alta massa molecular",
        via: "Colírios multiuso (ex: lubrificantes, antialérgicos)",
        posologia: "Não se aplica (componente veiculado)",
        mecanismo: "Atua na membrana bacteriana sem penetrar nas células da superfície ocular.",
        indicacoes: "Preservação com maior biocompatibilidade ocular.",
        efeitos: "Baixa incidência de reações adversas.",
        contraindicacoes: "Casos raros de intolerância individual.",
        observacoes: "Mais seguro para uso contínuo. Preferido em colírios lubrificantes."
      }
    ]
  },
  {
    nome: "Anestésicos",
    grupos: [
      {
        droga: "Proximetacaína (0,5%)",
        classe: "Anestésico local tipo éster",
        via: "Colírio",
        posologia: "1–2 gotas antes de procedimentos. Não repetir frequentemente.",
        mecanismo: "Bloqueia canais de sódio na membrana neuronal, impedindo o impulso nervoso.",
        indicacoes: "Tonometrias, remoção de corpo estranho, testes diagnósticos, pequenas cirurgias.",
        efeitos: "Queimação transitória, toxicidade epitelial com uso repetido.",
        contraindicacoes: "Uso prolongado ou frequente. Alergia a anestésicos do tipo éster.",
        observacoes: "Mais potente que tetracaína. Uso estritamente em consultório ou hospitalar."
      },
      {
        droga: "Tetracaína (0,5% a 1%)",
        classe: "Anestésico local tipo éster",
        via: "Colírio",
        posologia: "1 gota antes de procedimento. Reaplicar se necessário após 5 min.",
        mecanismo: "Bloqueio reversível dos canais de sódio neuronais.",
        indicacoes: "Procedimentos oftalmológicos de curta duração.",
        efeitos: "Ardência, hiperemia, toxicidade corneana com uso repetido.",
        contraindicacoes: "Uso domiciliar. Hipersensibilidade a anestésicos locais.",
        observacoes: "Uso muito comum em triagens, exames e pequenas intervenções."
      },
      {
        droga: "Lidocaína 2% gel",
        classe: "Anestésico local tipo amida",
        via: "Gel oftálmico",
        posologia: "Aplicar pequena quantidade na conjuntiva antes de cirurgia.",
        mecanismo: "Bloqueio dos canais de sódio nos nervos periféricos.",
        indicacoes: "Anestesia em cirurgias como catarata, pterígio, etc.",
        efeitos: "Desconforto inicial, visão embaçada transitória.",
        contraindicacoes: "Alergia a amidas. Uso em procedimentos curtos.",
        observacoes: "Menor toxicidade epitelial que os ésteres. Mais confortável ao paciente."
      }
    ]
  },
  {
    nome: "Corantes",
    grupos: [
      {
        droga: "Fluoresceína sódica",
        classe: "Corante hidrossolúvel",
        via: "Colírio ou tira impregnada",
        posologia: "1 gota ou uma tira na conjuntiva inferior. Exame imediato.",
        mecanismo: "Emite fluorescência em presença de luz azul cobalto; revela lesões epiteliais e fluxo lacrimal.",
        indicacoes: "Detecção de defeitos epiteliais, avaliação do filme lacrimal, tonometria de aplanação.",
        efeitos: "Desconforto leve, coloração temporária da pele ou lentes.",
        contraindicacoes: "Hipersensibilidade ao corante.",
        observacoes: "Usar com lâmpada de fenda com filtro azul. Interfere com lentes de contato gelatinosas."
      },
      {
        droga: "Azul de Tripano",
        classe: "Corante vital",
        via: "Uso intraoperatório (injeção intracameral ou aplicação tópica)",
        posologia: "Pequena quantidade sob orientação cirúrgica.",
        mecanismo: "Corante seletivo por células não viáveis; auxilia na visualização de estruturas como cápsula anterior.",
        indicacoes: "Facilitar capsulorrexe em cirurgia de catarata, avaliação de membranas epirretinianas.",
        efeitos: "Irritação ocular leve, toxicidade endotelial se mal utilizado.",
        contraindicacoes: "Evitar contato direto prolongado com endotélio.",
        observacoes: "Requer técnica precisa. Fundamental em cataratas brancas ou pseudoexfoliação."
      },
      {
        droga: "Verde de Lisamina",
        classe: "Corante vital",
        via: "Tira oftálmica ou colírio",
        posologia: "1 tira ou 1 gota no fundo de saco inferior.",
        mecanismo: "Corante que marca células danificadas e mucina degenerada da superfície ocular.",
        indicacoes: "Avaliação de olho seco, lesões da conjuntiva bulbar e palpebral.",
        efeitos: "Irritação discreta. Pode causar leve ardência inicial.",
        contraindicacoes: "Rara hipersensibilidade.",
        observacoes: "Excelente marcador de dano epitelial crônico. Não interfere na visão como fluoresceína."
      },
      {
        droga: "Azul de Metileno",
        classe: "Corante vital com propriedades antimicrobianas",
        via: "Tópico (uso laboratorial ou diagnóstico específico)",
        posologia: "Aplicação controlada conforme objetivo diagnóstico.",
        mecanismo: "Corante catiônico que penetra em células danificadas.",
        indicacoes: "Histologia, testes laboratoriais e microbiológicos. Raramente usado clinicamente.",
        efeitos: "Irritação ocular significativa. Coloração intensa de tecidos.",
        contraindicacoes: "Uso clínico direto em estruturas delicadas.",
        observacoes: "Uso limitado em oftalmologia moderna. Substituído por alternativas mais seguras."
      }
    ]
  },
  {
    nome: "Anti-inflamatórios",
    grupos: [
      {
        droga: "Prednisolona acetato 1%",
        classe: "Corticosteroide tópico",
        via: "Colírio",
        posologia: "1 gota 4/4h a cada 6h, ajustado conforme gravidade",
        mecanismo: "Inibe fosfolipase A2 e liberação de mediadores inflamatórios.",
        indicacoes: "Uveítes anteriores, pós-operatório, ceratites não infecciosas.",
        efeitos: "Aumento da PIO, risco de infecções oportunistas, catarata subcapsular posterior.",
        contraindicacoes: "Infecções fúngicas, virais ou tuberculose ocular ativa sem tratamento.",
        observacoes: "Potente e eficaz. Monitorar PIO em tratamentos prolongados."
      },
      {
        droga: "Dexametasona 0,1%",
        classe: "Corticosteroide tópico",
        via: "Colírio ou pomada",
        posologia: "1 gota 4x/dia ou conforme orientação",
        mecanismo: "Mesma ação anti-inflamatória da prednisolona, porém menos potente topicamente.",
        indicacoes: "Conjuntivites alérgicas graves, inflamações pós-operatórias leves.",
        efeitos: "Aumento da PIO, opacificação do cristalino, supressão da cicatrização.",
        contraindicacoes: "Ceratoepitelite herpética, micoses oculares.",
        observacoes: "Frequentemente usado em colírios combinados com antibióticos."
      },
      {
        droga: "Fluorometolona 0,1% (FML)",
        classe: "Corticosteroide de baixa penetração intraocular",
        via: "Colírio ou pomada",
        posologia: "1 gota 2–4x/dia",
        mecanismo: "Ação anti-inflamatória local com baixa absorção intraocular.",
        indicacoes: "Conjuntivites alérgicas, blefarites crônicas, pós-operatório leve.",
        efeitos: "Risco menor de aumento de PIO, desconforto leve.",
        contraindicacoes: "Infecção ocular ativa.",
        observacoes: "Preferido em pacientes com risco de resposta hipertensiva ocular."
      },
      {
        droga: "Nepafenaco 0,1%",
        classe: "AINE não seletivo",
        via: "Colírio",
        posologia: "1 gota 3x/dia",
        mecanismo: "Inibe a COX-1 e COX-2, reduzindo prostaglandinas inflamatórias.",
        indicacoes: "Controle de dor e inflamação pós-operatória, prevenção de edema macular cistoide.",
        efeitos: "Ardência, atraso na cicatrização, possível toxicidade epitelial.",
        contraindicacoes: "Ulceração corneana, hipersensibilidade a AINEs.",
        observacoes: "Boa penetração intraocular. Pode ser usado junto a corticosteroides."
      },
      {
        droga: "Cetorolaco trometamina 0,5%",
        classe: "AINE não seletivo",
        via: "Colírio",
        posologia: "1 gota 4x/dia",
        mecanismo: "Bloqueio da ciclooxigenase, reduzindo inflamação e dor.",
        indicacoes: "Controle da dor pós-operatória, conjuntivite alérgica sazonal.",
        efeitos: "Ardência, hiperemia, ceratite superficial pontuada.",
        contraindicacoes: "Úlceras corneanas, olho seco grave.",
        observacoes: "Uso comum no pré e pós-operatório de catarata."
      }
    ]
  },
  {
    nome: "Antialérgicos",
    grupos: [
      {
        droga: "Olopatadina 0,1% e 0,2%",
        classe: "Anti-histamínico H1 e estabilizador de mastócitos",
        via: "Colírio",
        posologia: "0,1%: 1 gota 2x/dia | 0,2%: 1 gota 1x/dia",
        mecanismo: "Bloqueia receptores H1 e inibe liberação de histamina por mastócitos.",
        indicacoes: "Conjuntivite alérgica sazonal ou perene.",
        efeitos: "Ardência leve, gosto amargo, cefaleia ocasional.",
        contraindicacoes: "Hipersensibilidade ao fármaco.",
        observacoes: "Muito bem tolerada. Alívio rápido e ação prolongada."
      },
      {
        droga: "Epinastina 0,05%",
        classe: "Anti-histamínico e estabilizador de mastócitos",
        via: "Colírio",
        posologia: "1 gota 2x/dia",
        mecanismo: "Bloqueia receptores H1 e previne degranulação mastocitária.",
        indicacoes: "Conjuntivite alérgica leve a moderada.",
        efeitos: "Desconforto ocular leve, gosto metálico.",
        contraindicacoes: "Alergia ao componente.",
        observacoes: "Boa eficácia clínica. Pode ser usada em longo prazo."
      },
      {
        droga: "Ketotifeno 0,025%",
        classe: "Anti-histamínico e estabilizador de mastócitos",
        via: "Colírio",
        posologia: "1 gota 2x/dia",
        mecanismo: "Bloqueia receptores H1 e reduz inflamação mediada por mastócitos.",
        indicacoes: "Conjuntivite alérgica com prurido ocular intenso.",
        efeitos: "Hiperemia, ardência, secura ocular ocasional.",
        contraindicacoes: "Hipersensibilidade.",
        observacoes: "Boa resposta sintomática. Disponível sem prescrição em alguns países."
      },
      {
        droga: "Alcaftadina 0,25%",
        classe: "Anti-histamínico de segunda geração",
        via: "Colírio",
        posologia: "1 gota 1x/dia",
        mecanismo: "Bloqueio seletivo dos receptores H1 e redução da ativação de mastócitos.",
        indicacoes: "Conjuntivite alérgica com sintomas persistentes.",
        efeitos: "Leve ardor, visão borrada temporária.",
        contraindicacoes: "Rara hipersensibilidade.",
        observacoes: "Alternativa moderna com boa tolerância e adesão."
      }
    ]
  },
  {
    nome: "Lubrificantes e Superfície Ocular",
    grupos: [
      {
        droga: "Carboximetilcelulose sódica (CMC)",
        classe: "Polímero hidrofílico",
        via: "Colírio",
        posologia: "1 gota 4 a 6x/dia ou conforme necessidade",
        mecanismo: "Aumenta o tempo de permanência da lágrima sobre a superfície ocular.",
        indicacoes: "Olho seco leve a moderado, alívio de irritações oculares.",
        efeitos: "Visão borrada transitória, ardência leve.",
        contraindicacoes: "Hipersensibilidade ao componente.",
        observacoes: "Uma das substâncias mais utilizadas em lágrimas artificiais. Pode ser usada com frequência."
      },
      {
        droga: "Hidroxipropilmetilcelulose (HPMC)",
        classe: "Polímero viscoso de celulose",
        via: "Colírio ou gel",
        posologia: "1 gota 3–6x/dia ou conforme necessidade",
        mecanismo: "Lubrifica e protege a superfície ocular por formação de filme viscoelástico.",
        indicacoes: "Olho seco, pós-operatórios, disfunções da película lacrimal.",
        efeitos: "Borramento temporário da visão.",
        contraindicacoes: "Rara hipersensibilidade.",
        observacoes: "Boa alternativa em pós-operatórios. Usado também em lentes de contato rígidas."
      },
      {
        droga: "Hialuronato de sódio (0,1% a 0,3%)",
        classe: "Polissacarídeo natural – lubrificante biocompatível",
        via: "Colírio",
        posologia: "1 gota 3–6x/dia ou conforme gravidade",
        mecanismo: "Forma filme protetor e promove cicatrização epitelial.",
        indicacoes: "Síndrome do olho seco moderado a grave, ceratite seca, LASIK, erosões.",
        efeitos: "Pouco frequentes; ardência leve.",
        contraindicacoes: "Raramente necessário suspender.",
        observacoes: "Excelente perfil de segurança. Formulações sem conservantes são preferidas."
      },
      {
        droga: "Trehalose",
        classe: "Dissacarídeo antioxidante e estabilizador de membranas",
        via: "Colírio",
        posologia: "1 gota 2–4x/dia",
        mecanismo: "Protege e estabiliza estruturas celulares contra o estresse oxidativo.",
        indicacoes: "Olho seco evaporativo, disfunções da superfície ocular com componente inflamatório.",
        efeitos: "Raros; bem tolerado.",
        contraindicacoes: "Não descritas.",
        observacoes: "Frequentemente associada ao hialuronato. Ação citoprotetora."
      },
      {
        droga: "Povidona",
        classe: "Polímero solúvel em água",
        via: "Colírio",
        posologia: "1 gota 3–6x/dia",
        mecanismo: "Aumenta a estabilidade do filme lacrimal por ação mucomimética.",
        indicacoes: "Lubrificação ocular geral, sintomas de irritação.",
        efeitos: "Visão embaçada transitória.",
        contraindicacoes: "Alergia ao componente (rara).",
        observacoes: "Componente comum em colírios multiuso de menor custo."
      }
    ]
  },
  {
    nome: "Drogas Colinérgicas e Anticolinérgicas",
    grupos: [
      {
        droga: "Pilocarpina 1-4%",
        classe: "Agonista muscarínico",
        via: "Colírio",
        posologia: "1 gota 4x/dia",
        mecanismo: "Contrai o músculo ciliar e constringe a pupila, aumentando o escoamento do humor aquoso.",
        indicacoes: "Glaucoma de ângulo fechado, miose terapêutica.",
        efeitos: "Miopia, cefaleia, visão borrada, espasmo de acomodação.",
        contraindicacoes: "Irite aguda, glaucoma de ângulo fechado com pupila bloqueada.",
        observacoes: "Pode causar miopia transitória. Monitorar PIO em uso crônico."
      },
      {
        droga: "Atropina 0,5-1%",
        classe: "Anticolinérgico muscarínico",
        via: "Colírio ou pomada",
        posologia: "1 gota 1-3x/dia conforme necessidade",
        mecanismo: "Bloqueia receptores muscarínicos, causando midríase e paralisia de acomodação.",
        indicacoes: "Midríase diagnóstica, cicloplegia, uveítes anteriores.",
        efeitos: "Midríase prolongada, fotofobia, visão borrada para perto.",
        contraindicacoes: "Glaucoma de ângulo fechado, hipersensibilidade.",
        observacoes: "Efeito muito prolongado. Usar com cautela em crianças."
      },
      {
        droga: "Ciclopentolato 0,5-1%",
        classe: "Anticolinérgico de ação intermediária",
        via: "Colírio",
        posologia: "1 gota 2-3x/dia",
        mecanismo: "Bloqueia receptores muscarínicos, causando midríase e cicloplegia.",
        indicacoes: "Refratometria, exames de fundo de olho, uveítes.",
        efeitos: "Midríase, cicloplegia, fotofobia, visão borrada.",
        contraindicacoes: "Glaucoma de ângulo fechado, hipersensibilidade.",
        observacoes: "Duração intermediária. Menos efeitos sistêmicos que atropina."
      },
      {
        droga: "Tropicamida 0,5-1%",
        classe: "Anticolinérgico de ação curta",
        via: "Colírio",
        posologia: "1 gota 15-20 min antes do exame",
        mecanismo: "Bloqueia receptores muscarínicos, causando midríase rápida.",
        indicacoes: "Exames de fundo de olho, tonometria.",
        efeitos: "Midríase, fotofobia leve, visão borrada transitória.",
        contraindicacoes: "Glaucoma de ângulo fechado.",
        observacoes: "Ação rápida e curta. Ideal para exames de rotina."
      }
    ]
  },
  {
    nome: "Antimicrobianos",
    grupos: [
      {
        droga: "Ciprofloxacino 0,3%",
        classe: "Antibiótico fluoroquinolona",
        via: "Colírio ou pomada",
        posologia: "1 gota 4-6x/dia",
        mecanismo: "Inibe DNA girase bacteriana, impedindo replicação do DNA.",
        indicacoes: "Conjuntivite bacteriana, úlceras corneanas, profilaxia pós-operatória.",
        efeitos: "Ardência, hiperemia, ceratite superficial pontuada.",
        contraindicacoes: "Hipersensibilidade a fluoroquinolonas.",
        observacoes: "Amplo espectro. Resistência crescente em algumas regiões."
      },
      {
        droga: "Moxifloxacino 0,5%",
        classe: "Antibiótico fluoroquinolona de 4ª geração",
        via: "Colírio",
        posologia: "1 gota 3x/dia",
        mecanismo: "Inibe DNA girase e topoisomerase IV bacterianas.",
        indicacoes: "Conjuntivite bacteriana, úlceras corneanas, profilaxia cirúrgica.",
        efeitos: "Ardência leve, hiperemia, visão borrada transitória.",
        contraindicacoes: "Hipersensibilidade a fluoroquinolonas.",
        observacoes: "Melhor penetração intraocular. Menor resistência bacteriana."
      },
      {
        droga: "Gentamicina 0,3%",
        classe: "Aminoglicosídeo",
        via: "Colírio ou pomada",
        posologia: "1 gota 4-6x/dia",
        mecanismo: "Inibe síntese proteica bacteriana ligando-se ao ribossomo 30S.",
        indicacoes: "Conjuntivite bacteriana, blefarite, profilaxia.",
        efeitos: "Ardência, toxicidade epitelial com uso prolongado.",
        contraindicacoes: "Hipersensibilidade a aminoglicosídeos.",
        observacoes: "Eficaz contra Gram-negativos. Monitorar toxicidade epitelial."
      },
      {
        droga: "Tobramicina 0,3%",
        classe: "Aminoglicosídeo",
        via: "Colírio",
        posologia: "1 gota 4-6x/dia",
        mecanismo: "Inibe síntese proteica bacteriana.",
        indicacoes: "Conjuntivite bacteriana, úlceras corneanas.",
        efeitos: "Ardência, toxicidade epitelial.",
        contraindicacoes: "Hipersensibilidade a aminoglicosídeos.",
        observacoes: "Similar à gentamicina. Menor toxicidade epitelial."
      }
    ]
  },
  {
    nome: "Outras Drogas Diversas",
    grupos: [
      {
        droga: "Ciclosporina 0,05%",
        classe: "Imunossupressor",
        via: "Colírio",
        posologia: "1 gota 2x/dia",
        mecanismo: "Inibe calcineurina, reduzindo ativação de linfócitos T.",
        indicacoes: "Olho seco moderado a grave, ceratite seca.",
        efeitos: "Ardência inicial, hiperemia, gosto amargo.",
        contraindicacoes: "Infecção ocular ativa, hipersensibilidade.",
        observacoes: "Melhora produção lacrimal. Pode levar semanas para efeito."
      },
      {
        droga: "Vitamina A (Retinol)",
        classe: "Vitamina lipossolúvel",
        via: "Pomada oftálmica",
        posologia: "Aplicar 3-4x/dia",
        mecanismo: "Essencial para diferenciação epitelial e função visual.",
        indicacoes: "Deficiência de vitamina A, xeroftalmia, ceratomalácia.",
        efeitos: "Irritação leve, visão borrada.",
        contraindicacoes: "Hipersensibilidade.",
        observacoes: "Tratamento de emergência em deficiência grave."
      },
      {
        droga: "Ácido Hialurônico 0,1-0,3%",
        classe: "Polissacarídeo natural",
        via: "Colírio",
        posologia: "1 gota 3-6x/dia",
        mecanismo: "Forma filme protetor e promove cicatrização epitelial.",
        indicacoes: "Olho seco, pós-operatório, erosões corneanas.",
        efeitos: "Poucos efeitos adversos.",
        contraindicacoes: "Rara hipersensibilidade.",
        observacoes: "Excelente biocompatibilidade. Formulações sem conservantes."
      }
    ]
  },
  {
    nome: "Glaucoma",
    grupos: [
      {
        droga: "Timolol 0,25-0,5%",
        classe: "Betabloqueador não seletivo",
        via: "Colírio",
        posologia: "1 gota 2x/dia",
        mecanismo: "Reduz produção de humor aquoso por bloqueio de receptores β-adrenérgicos.",
        indicacoes: "Glaucoma de ângulo aberto, hipertensão ocular.",
        efeitos: "Bradicardia, broncoespasmo, fadiga, depressão.",
        contraindicacoes: "Asma, bradicardia, insuficiência cardíaca.",
        observacoes: "Primeira linha de tratamento. Monitorar efeitos sistêmicos."
      },
      {
        droga: "Brimonidina 0,1-0,2%",
        classe: "Agonista α2-adrenérgico",
        via: "Colírio",
        posologia: "1 gota 2-3x/dia",
        mecanismo: "Reduz produção e aumenta escoamento do humor aquoso.",
        indicacoes: "Glaucoma de ângulo aberto, hipertensão ocular.",
        efeitos: "Alergia ocular, fadiga, boca seca, hipotensão.",
        contraindicacoes: "Uso concomitante com IMAO, depressão.",
        observacoes: "Boa eficácia. Pode causar alergia tardia."
      },
      {
        droga: "Dorzolamida 2%",
        classe: "Inibidor da anidrase carbônica",
        via: "Colírio",
        posologia: "1 gota 3x/dia",
        mecanismo: "Inibe anidrase carbônica II, reduzindo produção de humor aquoso.",
        indicacoes: "Glaucoma de ângulo aberto, hipertensão ocular.",
        efeitos: "Ardência, gosto amargo, ceratite superficial pontuada.",
        contraindicacoes: "Hipersensibilidade a sulfonamidas.",
        observacoes: "Efeito aditivo com outros antiglaucomatosos."
      },
      {
        droga: "Latanoprosta 0,005%",
        classe: "Análogo de prostaglandina",
        via: "Colírio",
        posologia: "1 gota 1x/dia (noite)",
        mecanismo: "Aumenta escoamento uveoescleral do humor aquoso.",
        indicacoes: "Glaucoma de ângulo aberto, hipertensão ocular.",
        efeitos: "Hiperpigmentação da íris, alongamento de cílios, hiperemia.",
        contraindicacoes: "Uveíte ativa, hipersensibilidade.",
        observacoes: "Muito eficaz. Aplicar à noite. Efeitos cosméticos reversíveis."
      }
    ]
  }
];

// Componente do Modal
function FarmacoModal({ isOpen, onClose, grupo }: FarmacoModalProps) {
  const [expandedDrogas, setExpandedDrogas] = useState<Set<number>>(new Set());

  if (!isOpen || !grupo) return null;

  const toggleDroga = (index: number) => {
    const newExpanded = new Set(expandedDrogas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDrogas(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{grupo.nome}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
          >
            ×
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {grupo.grupos.map((droga, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Cabeçalho do medicamento - sempre visível */}
                <button
                  onClick={() => toggleDroga(index)}
                  className="w-full p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center text-left"
                >
                  <h3 className="text-sm sm:text-lg font-semibold text-blue-600 pr-2">{droga.droga}</h3>
                  <div className="flex items-center flex-shrink-0">
                    <span className="text-xs sm:text-sm text-gray-500 mr-1 sm:mr-2 hidden sm:inline">
                      {expandedDrogas.has(index) ? 'Ocultar' : 'Ver detalhes'}
                    </span>
                    <svg 
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200 ${
                        expandedDrogas.has(index) ? 'rotate-180' : ''
                      }`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Detalhes do medicamento - expandível */}
                {expandedDrogas.has(index) && (
                  <div className="p-3 sm:p-4 bg-white border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {droga.classe && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Classe</h4>
                          <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{droga.classe}</p>
                        </div>
                      )}
                      
                      {droga.via && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Via</h4>
                          <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{droga.via}</p>
                        </div>
                      )}
                      
                      {droga.posologia && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Posologia</h4>
                          <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{droga.posologia}</p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Mecanismo de Ação</h4>
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{droga.mecanismo}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Indicações</h4>
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{droga.indicacoes}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Efeitos</h4>
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{droga.efeitos}</p>
                      </div>
                      
                      {droga.contraindicacoes && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Contraindicações</h4>
                          <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{droga.contraindicacoes}</p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Observações</h4>
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{droga.observacoes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Ícones SVG para cada grupo farmacológico
const IconConservantes = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const IconAnestesicos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
  </svg>
);

const IconCorantes = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
  </svg>
);

const IconAntiInflamatorios = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const IconAntialergicos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const IconLubrificantes = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const IconColinergicos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const IconAntimicrobianos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconOutrasDrogas = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const IconGlaucoma = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// Array com os grupos e seus ícones
const gruposComIcones = [
  { ...dadosFarmacologicos[0], icone: <IconConservantes /> },
  { ...dadosFarmacologicos[1], icone: <IconAnestesicos /> },
  { ...dadosFarmacologicos[2], icone: <IconCorantes /> },
  { ...dadosFarmacologicos[3], icone: <IconAntiInflamatorios /> },
  { ...dadosFarmacologicos[4], icone: <IconAntialergicos /> },
  { ...dadosFarmacologicos[5], icone: <IconLubrificantes /> },
  { ...dadosFarmacologicos[6], icone: <IconColinergicos /> },
  { ...dadosFarmacologicos[7], icone: <IconAntimicrobianos /> },
  { ...dadosFarmacologicos[8], icone: <IconOutrasDrogas /> },
  { ...dadosFarmacologicos[9], icone: <IconGlaucoma /> }
];

// Componente principal
export default function Farmacos() {
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoFarmacologico | null>(null);

  const handleGrupoClick = (grupo: GrupoFarmacologico) => {
    setGrupoSelecionado(grupo);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setGrupoSelecionado(null);
  };

  return (
    <div className="min-h-screen bg-white p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Botão Voltar */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao Menu Principal
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Farmacologia Oftalmológica
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto px-2">
            Selecione o grupo farmacológico para acessar informações detalhadas sobre mecanismos de ação, indicações e observações
          </p>
        </div>

        {/* Grid de Grupos Farmacológicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
          {gruposComIcones.map((grupo, index) => (
            <button
              key={index}
              onClick={() => handleGrupoClick(grupo)}
              className="group relative bg-white border-2 border-gray-200 rounded-xl p-3 sm:p-4 md:p-6 hover:border-blue-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
              title={`Clique para ver detalhes sobre ${grupo.nome}`}
            >
              {/* Ícone */}
              <div className="text-blue-600 mb-2 sm:mb-3 md:mb-4 text-center group-hover:text-blue-700 group-hover:scale-110 transition-all duration-300">
                {grupo.icone}
              </div>

              {/* Título */}
              <h3 className="text-xs sm:text-sm md:text-lg font-semibold text-gray-900 mb-1 md:mb-2 text-center group-hover:text-gray-700 transition-colors leading-tight">
                {grupo.nome}
              </h3>

              {/* Contador de medicamentos */}
              <p className="text-xs sm:text-sm text-gray-500 text-center">
                {grupo.grupos.length} medicamento{grupo.grupos.length !== 1 ? 's' : ''}
              </p>

              {/* Indicador de clique */}
              <div className="absolute top-1 sm:top-2 md:top-4 right-1 sm:right-2 md:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg 
                  className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </div>

              {/* Efeito de hover */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-300 transition-all duration-300 pointer-events-none"></div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 sm:mt-12 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Informações farmacológicas para uso clínico oftalmológico
          </p>
        </div>
      </div>

      {/* Modal */}
      <FarmacoModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        grupo={grupoSelecionado}
      />
    </div>
  );
} 