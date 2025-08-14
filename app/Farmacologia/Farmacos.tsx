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

interface GlaucomaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConservantesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AntimicrobianosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MarcaFabricante {
  fabricante: string;
  colirios: string[];
}

interface DadosMarcas {
  titulo: string;
  marcas: MarcaFabricante[];
}

interface DadosConservante {
  titulo: string;
  uso: string;
  mecanismo?: string;
  propriedades?: string;
  toxicidade: string;
  observacoes?: string;
  exemplos: string[];
}

interface DadosAntimicrobianoClasse {
  titulo: string;
  indicacao: string;
  marcas: MarcaFabricante[];
  observacoes?: string;
}

interface DadosAntimicrobianoGrupo {
  titulo: string;
  descricao: string;
  classes: DadosAntimicrobianoClasse[];
}

interface AntiinflamatoriosModalProps {
  isOpen: boolean;
  onClose: () => void;
}





interface DadosAntiinflamatorioClasse {
  titulo: string;
  indicacao: string;
  marcas: MarcaFabricante[];
  observacoes?: string;
}

interface DadosAntiinflamatorioGrupoRefatorado {
  titulo: string;
  descricao: string;
  classes: DadosAntiinflamatorioClasse[];
}

interface AntialergicosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DadosAntialergicoClasse {
  titulo: string;
  indicacao: string;
  marcas: MarcaFabricante[];
  observacoes?: string;
}

interface DadosAntialergicoGrupo {
  titulo: string;
  descricao: string;
  classes: DadosAntialergicoClasse[];
}

// Dados dos Antimicrobianos
const dadosAntimicrobianos: Record<string, DadosAntimicrobianoGrupo> = {
  antibioticos: {
    titulo: "Antibióticos",
    descricao: "Aminoglicosídeos, Quinolonas e outros antibióticos para tratamento de infecções bacterianas oculares.",
    classes: [
      {
        titulo: "Aminoglicosídeos",
        indicacao: "Antibióticos bactericidas que inibem a síntese proteica bacteriana.",
        marcas: [
          {
            fabricante: "Alcon/Novartis",
            colirios: ["Tobrex® (Tobramicina)"]
          },
          {
            fabricante: "Genon",
            colirios: ["Tobramicina", "Gentamicina"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Tobramicina", "Gentamicina"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Tobramicina", "Gentamicina"]
          },
          {
            fabricante: "Ofta",
            colirios: ["Tobramicina", "Gentamicina"]
          }
        ],
        observacoes: "Uso tópico comum, baixa toxicidade. Monitorar toxicidade epitelial em uso prolongado."
      },
      {
        titulo: "Quinolonas",
        indicacao: "Antibióticos de amplo espectro que inibem a DNA girase bacteriana.",
        marcas: [
          {
            fabricante: "Alcon",
            colirios: ["Ciloxan® (Ciprofloxacino)", "Vigamox® (Moxifloxacino)"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Ciproftal® (Ciprofloxacino)", "Moxifloxacino"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Ciprolatina® (Ciprofloxacino)", "Moxilatina® (Moxifloxacino)"]
          },
          {
            fabricante: "Genon",
            colirios: ["Ciprofloxacino", "Moxifloxacino"]
          },
          {
            fabricante: "Ofta",
            colirios: ["Ciprofloxacino"]
          }
        ],
        observacoes: "Amplo espectro antibacteriano. Ciprofloxacino para úlceras graves, Moxifloxacino para profilaxia cirúrgica."
      },
      {
        titulo: "Outros Antibióticos",
        indicacao: "Antibióticos com mecanismos de ação diversos para infecções específicas.",
        marcas: [
          {
            fabricante: "Cristália",
            colirios: ["Oftalmol® (Polimixina B + Neomicina + Bacitracina)", "Cloranfenicol"]
          },
          {
            fabricante: "Genon",
            colirios: ["Cloranfenicol"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Cloranfenicol"]
          }
        ],
        observacoes: "Polimixina B para gram-negativos, Cloranfenicol para conjuntivites leves a moderadas."
      }
    ]
  },
  antivirais: {
    titulo: "Antivirais",
    descricao: "Tratamento de infecções virais oculares, principalmente herpes simplex e citomegalovírus.",
    classes: [
      {
        titulo: "Antivirais para HSV",
        indicacao: "Tratamento de ceratite epitelial herpética (Herpes Simplex Virus).",
        marcas: [
          {
            fabricante: "Latinofarma",
            colirios: ["Virufrin® (Trifluridina)"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Trifrin® (Trifluridina)"]
          },
          {
            fabricante: "Genon",
            colirios: ["Trifluridina"]
          }
        ],
        observacoes: "Específico para infecções por HSV. Trifluridina é o antiviral mais usado para ceratite herpética."
      },
      {
        titulo: "Antivirais para CMV",
        indicacao: "Tratamento de ceratite herpética e retinite por citomegalovírus.",
        marcas: [
          {
            fabricante: "Thea/Genom",
            colirios: ["Virgan® (Ganciclovir)"]
          },
          {
            fabricante: "Genon",
            colirios: ["Ganciclovir"]
          }
        ],
        observacoes: "Específico para infecções por CMV. Ganciclovir é eficaz para retinite por CMV."
      }
    ]
  },
  antifungicos: {
    titulo: "Antifúngicos",
    descricao: "Tratamento de ceratites fúngicas e endoftalmites fúngicas.",
    classes: [
      {
        titulo: "Antifúngicos Tópicos",
        indicacao: "Tratamento de ceratite fúngica por Fusarium e Aspergillus.",
        marcas: [
          {
            fabricante: "Sun Pharma/Genom",
            colirios: ["Natamet® (Natamicina 5%)"]
          },
          {
            fabricante: "Genon",
            colirios: ["Natamicina 5%"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Natamicina 5%"]
          }
        ],
        observacoes: "Natamicina é o antifúngico tópico mais usado para ceratite fúngica."
      },
      {
        titulo: "Antifúngicos Sistêmicos",
        indicacao: "Tratamento de ceratite fúngica grave e endoftalmite fúngica.",
        marcas: [
          {
            fabricante: "Uso Hospitalar/Magistral",
            colirios: ["Anfotericina B 0,15% (manipulado)"]
          }
        ],
        observacoes: "Anfotericina B não disponível como colírio industrializado. Uso hospitalar/magistral em centros especializados."
      }
    ]
  }
};

// Dados dos Antiinflamatorios
const dadosAntiinflamatorios: Record<string, DadosAntiinflamatorioGrupoRefatorado> = {
  corticoides: {
    titulo: "Corticoides Oftálmicos (Fortes e Leves)",
    descricao: "Indicados para uveítes, inflamações intensas e pós-operatórios intraoculares.",
    classes: [
      {
        titulo: "Corticoides Fortes",
        indicacao: "Indicados para uveítes, inflamações intensas e pós-operatórios intraoculares.",
        marcas: [
          {
            fabricante: "Allergan",
            colirios: ["Pred Fort® (Prednisolona Acetato 1%)"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Predsol® (Prednisolona Acetato 1%)", "Dexametasona 0,1%"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Predlata® (Prednisolona Acetato 1%)", "Dexametasona 0,1%"]
          },
          {
            fabricante: "Alcon",
            colirios: ["Maxidex® (Dexametasona 0,1%)"]
          },
          {
            fabricante: "Genon",
            colirios: ["Prednisolona Acetato 1%", "Dexametasona 0,1%"]
          },
          {
            fabricante: "Ofta",
            colirios: ["Dexametasona 0,1%"]
          }
        ],
        observacoes: "Potentes e eficazes. Monitorar PIO em tratamentos prolongados."
      },
      {
        titulo: "Corticoides Leves",
        indicacao: "Preferidos para inflamações superficiais, com menor risco de elevação da PIO.",
        marcas: [
          {
            fabricante: "Latinofarma",
            colirios: ["Flumetol® (Fluorometolona 0,1%)"]
          },
          {
            fabricante: "Allergan",
            colirios: ["FML® (Fluorometolona 0,1%)"]
          },
          {
            fabricante: "Genon",
            colirios: ["Fluorometolona 0,1%"]
          },
          {
            fabricante: "Bausch + Lomb",
            colirios: ["Lotemax® (Loteprednol 0,5%)"]
          },
          {
            fabricante: "Genom",
            colirios: ["Loteprednol 0,5% (pouco disponível)"]
          }
        ],
        observacoes: "Menor risco de hipertensão ocular. Preferidos em pacientes com risco de resposta hipertensiva."
      }
    ]
  },
  aines: {
    titulo: "AINEs (Anti-inflamatórios não esteroidais)",
    descricao: "Indicados para dor, inflamação leve e prevenção de edema macular no pós-operatório.",
    classes: [
      {
        titulo: "Diclofenaco Sódico 0,1%",
        indicacao: "Pós-operatório de cirurgia de catarata, controle de dor pós-procedimentos.",
        marcas: [
          {
            fabricante: "Novartis",
            colirios: ["Voltaren® colírio"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Diclotears®"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Diclofenaco Sódico 0,1%"]
          },
          {
            fabricante: "Genon",
            colirios: ["Diclofenaco Sódico 0,1%"]
          }
        ],
        observacoes: "Boa penetração intraocular. Pode ser usado junto a corticosteroides."
      },
      {
        titulo: "Cetorolaco Trometamol 0,5%",
        indicacao: "Prevenção de edema macular cistoide após cirurgia de catarata.",
        marcas: [
          {
            fabricante: "Allergan",
            colirios: ["Acular LS®"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Ketofenol®"]
          },
          {
            fabricante: "Genon",
            colirios: ["Cetorolaco Trometamol 0,5%"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Teroquadro"]
          }
        ],
        observacoes: "Uso comum no pré e pós-operatório de catarata."
      }
    ]
  },
  combinacoes: {
    titulo: "Combinações Fixas: Corticoide + Antibiótico",
    descricao: "Usadas em inflamações oculares com risco infeccioso, como pós-operatórios, blefarites, conjuntivites e ceratites.",
    classes: [
      {
        titulo: "Dexametasona + Tobramicina",
        indicacao: "Inflamações com risco bacteriano (ex: blefarite, conjuntivite bacteriana com reação inflamatória).",
        marcas: [
          {
            fabricante: "Alcon",
            colirios: ["Tobradex®", "Tobrex D®"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Dextrobac®"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Dexatrol®"]
          },
          {
            fabricante: "Genon",
            colirios: ["Tobradex"]
          }
        ],
        observacoes: "Combinação eficaz para inflamações com componente bacteriano."
      },
      {
        titulo: "Dexametasona + Neomicina + Polimixina B",
        indicacao: "Inflamações oculares com espectro bacteriano amplo.",
        marcas: [
          {
            fabricante: "Alcon",
            colirios: ["Maxitrol®"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Maxilerg®"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Neodex®"]
          },
          {
            fabricante: "Genon",
            colirios: ["Dextroftal®"]
          }
        ],
        observacoes: "Espectro amplo contra bactérias gram-positivas e gram-negativas."
      },
      {
        titulo: "Fluorometolona + Tetraciclina + Sulfacetamida",
        indicacao: "Blefarites, conjuntivites crônicas, inflamações mistas.",
        marcas: [
          {
            fabricante: "Allergan",
            colirios: ["FML-T®"]
          }
        ],
        observacoes: "Pouco disponível em algumas regiões – alternativa manipulada em alguns casos."
      }
    ]
  }
};

// Dados dos Antialergicos
const dadosAntialergicos: Record<string, DadosAntialergicoGrupo> = {
  estabilizadoresMastocitos: {
    titulo: "Estabilizadores de Mastócitos",
    descricao: "Atuam prevenindo a liberação de histamina e outros mediadores da inflamação alérgica. Uso profilático (efeito tardio).",
    classes: [
      {
        titulo: "Cromoglicato de Sódio 2%",
        indicacao: "Conjuntivite alérgica sazonal, ceratoconjuntivite vernal.",
        marcas: [
          {
            fabricante: "Cristália",
            colirios: ["Cromolerg®"]
          },
          {
            fabricante: "Thea/Genom",
            colirios: ["Cromabak®"]
          },
          {
            fabricante: "Genon",
            colirios: ["Cromoglicato Genon"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Cromolat®"]
          }
        ],
        observacoes: "Estabilizador de mastócitos para uso profilático. Efeito tardio, requer uso regular."
      },
      {
        titulo: "Nedocromil Sódico",
        indicacao: "Alergias oculares persistentes.",
        marcas: [
          {
            fabricante: "Não disponível",
            colirios: ["Raramente disponível no Brasil"]
          }
        ],
        observacoes: "Raramente disponível no Brasil atualmente, mas presente em literatura."
      }
    ]
  },
  antihistaminicosH1: {
    titulo: "Antihistamínicos H1",
    descricao: "Bloqueiam diretamente receptores de histamina. Uso para alívio rápido dos sintomas.",
    classes: [
      {
        titulo: "Epinastina",
        indicacao: "Prurido ocular em conjuntivite alérgica.",
        marcas: [
          {
            fabricante: "Allergan",
            colirios: ["Relestat®"]
          }
        ],
        observacoes: "Antihistamínico H1 de ação rápida para alívio dos sintomas."
      },
      {
        titulo: "Alcaftadina",
        indicacao: "Conjuntivite alérgica, inclusive perene.",
        marcas: [
          {
            fabricante: "Allergan",
            colirios: ["Lastacaft®"]
          }
        ],
        observacoes: "Antihistamínico H1 moderno com boa tolerância."
      }
    ]
  },
  agentesDuplos: {
    titulo: "Agentes Duplos",
    descricao: "Atuam tanto na prevenção quanto no alívio dos sintomas. São os colírios antialérgicos mais usados atualmente.",
    classes: [
      {
        titulo: "Olopatadina",
        indicacao: "Conjuntivite alérgica sazonal, vernal e perene.",
        marcas: [
          {
            fabricante: "Alcon",
            colirios: ["Patanol® (0,1%)", "Pataday® (0,2% - 1x/dia)"]
          },
          {
            fabricante: "Genon",
            colirios: ["Olopatadina Genon"]
          },
          {
            fabricante: "Cristália",
            colirios: ["Olart®"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Olafrex®"]
          }
        ],
        observacoes: "Agente duplo mais usado atualmente. Combina anti-histamínico e estabilizador de mastócitos."
      },
      {
        titulo: "Ketotifeno",
        indicacao: "Alívio de prurido e prevenção de crises alérgicas.",
        marcas: [
          {
            fabricante: "Novartis",
            colirios: ["Zaditen®"]
          },
          {
            fabricante: "Latinofarma",
            colirios: ["Ketoftil®"]
          },
          {
            fabricante: "Genon",
            colirios: ["Ketotifeno Genon"]
          },
          {
            fabricante: "Ofta",
            colirios: ["Octifen®"]
          }
        ],
        observacoes: "Agente duplo com boa eficácia clínica e tolerância."
      },
      {
        titulo: "Bepotastina",
        indicacao: "Conjuntivite alérgica com forte componente inflamatório.",
        marcas: [
          {
            fabricante: "Ofta/Genom",
            colirios: ["Bepreve®"]
          }
        ],
        observacoes: "Agente duplo específico para casos com componente inflamatório significativo."
      }
    ]
  }
};

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
    nome: "Antiglaucomatosos",
    grupos: [
      {
        droga: "Clique para ver os tipos de antiglaucomatosos",
        classe: "Modal especial com 4 categorias principais",
        via: "Reduzir produção, Inibir anidrase, Aumentar drenagem, Dupla ação",
        posologia: "Cada categoria contém medicamentos específicos",
        mecanismo: "Diferentes mecanismos de ação para controle da pressão intraocular",
        indicacoes: "Glaucoma primário e secundário, hipertensão ocular",
        efeitos: "Varia conforme o tipo de medicamento",
        contraindicacoes: "Específicas para cada classe medicamentosa",
        observacoes: "Modal organizado por mecanismo de ação"
      }
    ]
  }
];

// Dados específicos para cada tipo de antiglaucomatoso
const dadosGlaucoma = {
  reduzirProducao: [
    {
      droga: "Timolol 0,25% ou 0,5% (solução oftálmica)",
      classe: "Betabloqueador não seletivo",
      via: "Colírio",
      posologia: "1 gota 2x/dia",
      mecanismo: "Inibem receptores β-adrenérgicos nos processos ciliares, diminuindo a secreção de humor aquoso.",
      indicacoes: "Glaucoma primário de ângulo aberto, hipertensão ocular.",
      efeitos: "Bradicardia, hipotensão, broncoespasmo.",
      contraindicacoes: "Asma, DPOC moderada/grave, bradicardia, bloqueios AV.",
      observacoes: "Um dos colírios mais usados, sem efeito miótico."
    },
    {
      droga: "Betaxolol 0,25% (solução oftálmica)",
      classe: "Betabloqueador seletivo β1",
      via: "Colírio",
      posologia: "1 gota 2x/dia",
      mecanismo: "Inibem receptores β-adrenérgicos nos processos ciliares, diminuindo a secreção de humor aquoso.",
      indicacoes: "Glaucoma em pacientes asmáticos ou com DPOC leve.",
      efeitos: "Menor risco de broncoespasmo, possível desconforto ocular.",
      contraindicacoes: "Hipersensibilidade ao fármaco.",
      observacoes: "É seletivo para β1, menos efeitos pulmonares."
    }
  ],
  inibirAnidrase: [
    {
      droga: "Dorzolamida 2% (solução oftálmica)",
      classe: "Inibidor da anidrase carbônica",
      via: "Colírio",
      posologia: "1 gota 3x/dia",
      mecanismo: "Inibem a anidrase carbônica nos processos ciliares, reduzindo a produção de íons bicarbonato e, consequentemente, a produção de humor aquoso.",
      indicacoes: "Glaucoma primário e secundário, hipertensão ocular.",
      efeitos: "Disgeusia (sabor metálico), irritação ocular, cefaleia.",
      contraindicacoes: "Insuficiência renal grave, hipersensibilidade a sulfas.",
      observacoes: "Pode ser usada em associação com Timolol (Cosopt®)."
    },
    {
      droga: "Brinzolamida 1% (solução oftálmica)",
      classe: "Inibidor da anidrase carbônica",
      via: "Colírio",
      posologia: "1 gota 3x/dia",
      mecanismo: "Inibem a anidrase carbônica nos processos ciliares, reduzindo a produção de íons bicarbonato e, consequentemente, a produção de humor aquoso.",
      indicacoes: "Alternativa à dorzolamida em intolerância ou falha terapêutica.",
      efeitos: "Visão borrada temporária, queimação ocular.",
      contraindicacoes: "Hipersensibilidade a sulfas.",
      observacoes: "Menor incidência de sabor metálico que a dorzolamida."
    }
  ],
  aumentarDrenagem: [
    {
      droga: "Latanoprosta 0,005% (1x/noite)",
      classe: "Análogo de prostaglandina",
      via: "Colírio",
      posologia: "1 gota 1x/dia (noite)",
      mecanismo: "Aumentam a saída de humor aquoso via via uveoescleral, relaxando o músculo ciliar.",
      indicacoes: "Primeira linha no tratamento do glaucoma primário de ângulo aberto.",
      efeitos: "Hiperemia conjuntival, escurecimento da íris, crescimento de cílios.",
      contraindicacoes: "Uveíte ativa, histórico de edema macular.",
      observacoes: "Efeito prolongado; boa adesão posológica."
    },
    {
      droga: "Travoprosta 0,004% (1x/noite)",
      classe: "Análogo de prostaglandina",
      via: "Colírio",
      posologia: "1 gota 1x/dia (noite)",
      mecanismo: "Aumentam a saída de humor aquoso via via uveoescleral, relaxando o músculo ciliar.",
      indicacoes: "Alternativa à Latanoprosta.",
      efeitos: "Semelhantes à Latanoprosta, pode causar hiperpigmentação da pele periocular.",
      contraindicacoes: "Uveíte ativa, histórico de edema macular.",
      observacoes: "Pode ter ação mais potente em certos pacientes."
    }
  ],
  reduzirEAumentar: [
    {
      droga: "Brimonidina 0,15% ou 0,2% (2x a 3x/dia)",
      classe: "Agonista alfa-2 adrenérgico",
      via: "Colírio",
      posologia: "1 gota 2-3x/dia",
      mecanismo: "Estimulam receptores alfa-2 nos processos ciliares, diminuindo a produção de humor aquoso e aumentando a drenagem uveoescleral.",
      indicacoes: "Glaucoma, principalmente como terapia combinada ou alternativa.",
      efeitos: "Sonolência, boca seca, hiperemia, hipotensão.",
      contraindicacoes: "Crianças < 6 anos (risco de apneia), uso de antidepressivos tricíclicos.",
      observacoes: "Útil em pacientes que não toleram prostaglandinas ou betabloqueadores."
    }
  ],
  combinacoesFixas: [
    {
      droga: "Dorzolamida + Timolol",
      classe: "Combinação de inibidor da anidrase carbônica com betabloqueador",
      via: "Colírio",
      posologia: "1 gota 2x/dia",
      mecanismo: "Ação combinada: redução da produção e aumento da drenagem",
      indicacoes: "Glaucoma primário e secundário",
      efeitos: "Disgeusia, bradicardia, broncoespasmo",
      contraindicacoes: "Asma, DPOC, insuficiência renal grave",
      observacoes: "Facilita adesão com dose única"
    },
    {
      droga: "Brimonidina + Timolol",
      classe: "Combinação de agonista alfa-2 com betabloqueador",
      via: "Colírio",
      posologia: "1 gota 2x/dia",
      mecanismo: "Ação combinada: redução da produção e aumento da drenagem",
      indicacoes: "Glaucoma não controlado com monoterapia",
      efeitos: "Sonolência, bradicardia, broncoespasmo",
      contraindicacoes: "Asma, DPOC, crianças < 6 anos",
      observacoes: "Alternativa para pacientes intolerantes"
    },
    {
      droga: "Brinzolamida + Brimonidina",
      classe: "Combinação sem betabloqueador",
      via: "Colírio",
      posologia: "1 gota 2x/dia",
      mecanismo: "Ação combinada sem efeitos cardiopulmonares",
      indicacoes: "Glaucoma com contraindicações a betabloqueadores",
      efeitos: "Disgeusia, sonolência, visão borrada",
      contraindicacoes: "Insuficiência renal grave, crianças < 6 anos",
      observacoes: "Útil em pacientes com contraindicações cardiopulmonares"
    },
    {
      droga: "Travoprosta + Timolol",
      classe: "Análogo de prostaglandina associado a betabloqueador",
      via: "Colírio",
      posologia: "1 gota 1x/dia (noite)",
      mecanismo: "Ação combinada: redução da produção e aumento da drenagem",
      indicacoes: "Glaucoma primário de ângulo aberto",
      efeitos: "Hiperemia, bradicardia, crescimento de cílios",
      contraindicacoes: "Asma, DPOC, uveíte ativa",
      observacoes: "Potente ação hipotensora ocular"
    },
    {
      droga: "Latanoprosta + Timolol",
      classe: "Análogo de prostaglandina associado a betabloqueador",
      via: "Colírio",
      posologia: "1 gota 1x/dia (noite)",
      mecanismo: "Ação combinada: redução da produção e aumento da drenagem",
      indicacoes: "Glaucoma primário de ângulo aberto",
      efeitos: "Hiperemia, bradicardia, crescimento de cílios",
      contraindicacoes: "Asma, DPOC, uveíte ativa",
      observacoes: "Facilita adesão e aumenta eficácia com dose única diária"
    }
  ]
};

// Dados das marcas por fabricante em formato de tabela
const dadosMarcasPorFabricante: Record<string, DadosMarcas> = {
  reduzirProducao: {
    titulo: "Marcas por Fabricante - Betabloqueadores",
    marcas: [
      {
        fabricante: "Genon",
        colirios: ["Timoptol (genérico)", "Betaxolol"]
      },
      {
        fabricante: "Allergan",
        colirios: ["Betoptic S®"]
      },
      {
        fabricante: "Ofta",
        colirios: ["Glausol®"]
      },
      {
        fabricante: "Latinofarma",
        colirios: ["Timoftal®"]
      },
      {
        fabricante: "Cristália",
        colirios: ["Maleato de Timolol", "Betaxolol Cristália"]
      }
    ]
  },
  inibirAnidrase: {
    titulo: "Marcas por Fabricante - Inibidores da Anidrase Carbônica",
    marcas: [
      {
        fabricante: "Genon",
        colirios: ["Dorzolamida Genon"]
      },
      {
        fabricante: "Allergan",
        colirios: ["Trusopt®"]
      },
      {
        fabricante: "Latinofarma",
        colirios: ["Dorzolat®"]
      },
      {
        fabricante: "Cristália",
        colirios: ["Dorzolamida Cristália"]
      },
      {
        fabricante: "Alcon",
        colirios: ["Azopt® (Brinzolamida)"]
      }
    ]
  },
  aumentarDrenagem: {
    titulo: "Marcas por Fabricante - Análogos de Prostaglandinas",
    marcas: [
      {
        fabricante: "Genon",
        colirios: ["Latanoprosta", "Travoprosta"]
      },
      {
        fabricante: "Allergan",
        colirios: ["Xalatan®"]
      },
      {
        fabricante: "Ofta",
        colirios: ["Optipress® Latanoprosta"]
      },
      {
        fabricante: "Latinofarma",
        colirios: ["Latanoftal®"]
      },
      {
        fabricante: "Cristália",
        colirios: ["Latanoprosta", "Travoprosta Cristália"]
      }
    ]
  },
  reduzirEAumentar: {
    titulo: "Marcas por Fabricante - Agonistas Alfa-2",
    marcas: [
      {
        fabricante: "Genon",
        colirios: ["Brimonidina Genon"]
      },
      {
        fabricante: "Allergan",
        colirios: ["Alphagan P®"]
      },
      {
        fabricante: "Ofta",
        colirios: ["Optipress® Brimonidina"]
      },
      {
        fabricante: "Latinofarma",
        colirios: ["Brimonalat®"]
      },
      {
        fabricante: "Cristália",
        colirios: ["Brimonidina Cristália"]
      }
    ]
  },
  combinacoesFixas: {
    titulo: "Marcas por Fabricante - Combinações Fixas",
    marcas: [
      {
        fabricante: "Allergan",
        colirios: ["Cosopt® (Dorzolamida + Timolol)", "Combigan® (Brimonidina + Timolol)"]
      },
      {
        fabricante: "Genon",
        colirios: ["Dorzolamida + Timolol Genon", "Brimonidina + Timolol Genon"]
      },
      {
        fabricante: "Cristália",
        colirios: ["Dorzolamida + Timolol Cristália", "Brimonidina + Timolol Cristália", "Latanotimol"]
      },
      {
        fabricante: "Latinofarma",
        colirios: ["Dorzolat-Timolol", "Brimonalat®"]
      },
      {
        fabricante: "Alcon",
        colirios: ["Simbrinza® (Brinzolamida + Brimonidina)", "DuoTrav® (Travoprosta + Timolol)"]
      },
      {
        fabricante: "Pfizer",
        colirios: ["Xalacom® (Latanoprosta + Timolol)"]
      }
    ]
  }
};

// Dados para o modal de Conservantes
const dadosConservantes: Record<string, DadosConservante> = {
  bak: {
    titulo: "BAK (Cloreto de Benzalcônio)",
    uso: "Conservante mais amplamente utilizado em colírios.",
    mecanismo: "Surfactante que atua rompendo membranas celulares, inibindo crescimento microbiano.",
    toxicidade: "Associado à toxicidade crônica da superfície ocular, especialmente em uso prolongado (ex: colírios antiglaucomatosos crônicos).",
    observacoes: "A longo prazo, pode causar disfunção de células caliciformes, redução da estabilidade do filme lacrimal e inflamação da superfície ocular.",
    exemplos: [
      "Xalatan® (Allergan) – Latanoprosta",
      "Cosopt® (Allergan) – Dorzolamida + Timolol",
      "Optipress® (Ofta) – Latanoprosta, Brimonidina, Timolol",
      "Dorzolamida Cristália, Timolol Genon, Pilocarpalat® (Latinofarma)"
    ]
  },
  clorobutanol: {
    titulo: "Clorobutanol",
    uso: "Alternativa ao BAK em colírios lubrificantes e anestésicos; menos tóxico à superfície ocular.",
    propriedades: "Menor ação detergente, menor penetração epitelial → menor risco de toxicidade.",
    toxicidade: "Menor que o BAK, porém ainda com potencial de causar alterações epiteliais com uso prolongado.",
    exemplos: [
      "Anestalcon® (Cristália) – Colírio anestésico com tetracaína",
      "Optive® (Allergan) – Algumas apresentações lubrificantes",
      "Lacribell® (Latinofarma) – Lágrima artificial (algumas apresentações)"
    ]
  },
  perborato: {
    titulo: "Perborato de Sódio",
    uso: "Conservante que se decompõe em água e oxigênio na superfície ocular.",
    propriedades: "Menor agressividade ao epitélio corneano; considerado \"autodestrutivo\" após instilação.",
    toxicidade: "Muito baixa; seguro para uso crônico em olhos secos.",
    exemplos: [
      "Tears Naturale Free® (Alcon) – Lágrima artificial sem BAK",
      "Lacril® (Genon) – Algumas apresentações",
      "Lacrifilm® (Cristália) – Lágrima artificial com baixo potencial tóxico"
    ]
  },
  oxicloro: {
    titulo: "Oxicloro (Purite®)",
    uso: "Conservante que se decompõe rapidamente em cloreto, oxigênio e água após contato com a luz.",
    propriedades: "Alta segurança para uso crônico, inclusive em pacientes com olho seco e glaucoma.",
    toxicidade: "Extremamente baixa; não afeta significativamente as células epiteliais nem a função do filme lacrimal.",
    exemplos: [
      "Alphagan P® (Allergan) – Brimonidina 0,15%",
      "Lubristil® (Angelini) – Lágrima artificial",
      "Optive Fusion® (Allergan) – Lágrima com dupla ação"
    ]
  }
};

// Componente do Modal de Glaucoma
function GlaucomaModal({ isOpen, onClose }: GlaucomaModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [expandedDrogas, setExpandedDrogas] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const toggleDroga = (index: number) => {
    const newExpanded = new Set(expandedDrogas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDrogas(newExpanded);
  };

  const handleClose = () => {
    setSelectedType(null);
    setExpandedDrogas(new Set());
    onClose();
  };

  const getDadosByType = (type: string) => {
    switch (type) {
      case 'reduzirProducao':
        return dadosGlaucoma.reduzirProducao;
      case 'inibirAnidrase':
        return dadosGlaucoma.inibirAnidrase;
      case 'aumentarDrenagem':
        return dadosGlaucoma.aumentarDrenagem;
      case 'reduzirEAumentar':
        return dadosGlaucoma.reduzirEAumentar;
      case 'combinacoesFixas':
        return dadosGlaucoma.combinacoesFixas;
      default:
        return [];
    }
  };

  const getTypeTitle = (type: string) => {
    switch (type) {
      case 'reduzirProducao':
        return 'Reduzir a Produção do HA';
      case 'inibirAnidrase':
        return 'Inibidor da Anidrase Carbônica';
      case 'aumentarDrenagem':
        return 'Aumentar Drenagem Uveoescleral';
      case 'reduzirEAumentar':
        return 'Reduzir Produção e Aumentar Drenagem Uveoescleral';
      case 'combinacoesFixas':
        return 'Combinações Fixas Antiglaucomatosas';
      default:
        return '';
    }
  };

  // Componente para renderizar a tabela de marcas por fabricante
  const renderMarcasTable = (type: string) => {
    const dadosMarcas = dadosMarcasPorFabricante[type];
    if (!dadosMarcas) return null;

    return (
      <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{dadosMarcas.titulo}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                  Fabricante
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                  Colírios
                </th>
              </tr>
            </thead>
            <tbody>
              {dadosMarcas.marcas.map((marca, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 border-b border-gray-200">
                    {marca.fabricante}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200">
                    {marca.colirios.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Se um tipo foi selecionado, mostrar os detalhes
  if (selectedType) {
    const dados = getDadosByType(selectedType);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedType(null)}
                className="text-blue-600 hover:text-blue-800 text-lg font-semibold"
              >
                ← Voltar
              </button>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{getTypeTitle(selectedType)}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-3 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {dados.map((droga, index) => (
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
            
            {/* Tabela de marcas por fabricante */}
            {renderMarcasTable(selectedType)}
          </div>
        </div>
      </div>
    );
  }

  // Modal principal com os 4 botões
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Antiglaucomatosos</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
          >
            ×
          </button>
        </div>

        {/* Conteúdo - 4 botões principais */}
        <div className="p-3 sm:p-6">
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setSelectedType('reduzirProducao')}
              className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Reduzir a Produção do HA</h3>
              <p className="text-sm text-gray-600">Betabloqueadores que inibem a produção de humor aquoso</p>
            </button>

            <button
              onClick={() => setSelectedType('inibirAnidrase')}
              className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Inibidor da Anidrase Carbônica</h3>
              <p className="text-sm text-gray-600">Inibidores da anidrase carbônica nos processos ciliares</p>
            </button>

            <button
              onClick={() => setSelectedType('aumentarDrenagem')}
              className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Aumentar Drenagem Uveoescleral</h3>
              <p className="text-sm text-gray-600">Análogos de prostaglandinas que aumentam a drenagem</p>
            </button>

            <button
              onClick={() => setSelectedType('reduzirEAumentar')}
              className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Reduzir Produção e Aumentar Drenagem Uveoescleral</h3>
              <p className="text-sm text-gray-600">Agonistas alfa-2 adrenérgicos com dupla ação</p>
            </button>

            <button
              onClick={() => setSelectedType('combinacoesFixas')}
              className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Combinações Fixas Antiglaucomatosas</h3>
              <p className="text-sm text-gray-600">Colírios associados para maior eficácia</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente do Modal original (para outros grupos)
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

// Componente do Modal de Conservantes
function ConservantesModal({ isOpen, onClose }: ConservantesModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  const getDadosByType = (type: string) => {
    return dadosConservantes[type as keyof typeof dadosConservantes];
  };

  // Se nenhum tipo está selecionado, mostrar os 4 botões principais
  if (!selectedType) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Conservantes</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Conteúdo - 4 botões principais */}
          <div className="p-3 sm:p-6">
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setSelectedType('bak')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">BAK (Cloreto de Benzalcônio)</h3>
                <p className="text-sm text-gray-600">Conservante mais amplamente utilizado em colírios</p>
              </button>

              <button
                onClick={() => setSelectedType('clorobutanol')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Clorobutanol</h3>
                <p className="text-sm text-gray-600">Alternativa ao BAK em colírios lubrificantes e anestésicos</p>
              </button>

              <button
                onClick={() => setSelectedType('perborato')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Perborato de Sódio</h3>
                <p className="text-sm text-gray-600">Conservante que se decompõe em água e oxigênio</p>
              </button>

              <button
                onClick={() => setSelectedType('oxicloro')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Oxicloro (Purite®)</h3>
                <p className="text-sm text-gray-600">Conservante que se decompõe rapidamente após contato com a luz</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se um tipo está selecionado, mostrar os detalhes
  const dados = getDadosByType(selectedType);
  if (!dados) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedType(null)}
              className="text-gray-400 hover:text-gray-600 text-xl font-light p-1"
            >
              ←
            </button>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{dados.titulo}</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
          >
            ×
          </button>
        </div>

        {/* Conteúdo detalhado */}
        <div className="p-3 sm:p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Uso</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{dados.uso}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {dados.mecanismo ? 'Mecanismo' : 'Propriedades'}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {dados.mecanismo || dados.propriedades}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Toxicidade</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{dados.toxicidade}</p>
            </div>

            {dados.observacoes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Observações Clínicas</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{dados.observacoes}</p>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Exemplos de Colírios</h3>
              <ul className="list-disc list-inside space-y-1">
                {dados.exemplos.map((exemplo, index) => (
                  <li key={index} className="text-gray-700 text-sm">{exemplo}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente do Modal de Antimicrobianos
function AntimicrobianosModal({ isOpen, onClose }: AntimicrobianosModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedType(null);
    setSelectedClass(null);
    onClose();
  };

  const getDadosByType = (type: string) => {
    return dadosAntimicrobianos[type as keyof typeof dadosAntimicrobianos];
  };

  const getDadosByClass = (type: string, className: string) => {
    const dados = getDadosByType(type);
    return dados?.classes.find(classe => classe.titulo === className);
  };

  const renderMarcasTable = (marcas: MarcaFabricante[]) => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                Fabricante
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                Colírios
              </th>
            </tr>
          </thead>
          <tbody>
            {marcas.map((marca, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200 font-medium">
                  {marca.fabricante}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200">
                  {marca.colirios.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Se nenhum tipo está selecionado, mostrar os 3 botões principais
  if (!selectedType) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Antimicrobianos</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Conteúdo - 3 botões principais */}
          <div className="p-3 sm:p-6">
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setSelectedType('antibioticos')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Antibióticos</h3>
                <p className="text-sm text-gray-600">Aminoglicosídeos, Quinolonas e outros antibióticos</p>
              </button>

              <button
                onClick={() => setSelectedType('antivirais')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Antivirais</h3>
                <p className="text-sm text-gray-600">Tratamento de infecções virais oculares</p>
              </button>

              <button
                onClick={() => setSelectedType('antifungicos')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Antifúngicos</h3>
                <p className="text-sm text-gray-600">Tratamento de ceratites fúngicas</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se um tipo está selecionado mas nenhuma classe, mostrar as classes
  const dados = getDadosByType(selectedType);
  if (!dados) return null;

  if (!selectedClass) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedType(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light p-1"
              >
                ←
              </button>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{dados.titulo}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Conteúdo - Classes */}
          <div className="p-3 sm:p-6">
            <div className="mb-4">
              <p className="text-gray-700 text-sm leading-relaxed">{dados.descricao}</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {dados.classes.map((classe, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedClass(classe.titulo)}
                  className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{classe.titulo}</h3>
                  <p className="text-sm text-gray-600">{classe.indicacao}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se uma classe está selecionada, mostrar os detalhes
  const classeDados = getDadosByClass(selectedType, selectedClass);
  if (!classeDados) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedClass(null)}
              className="text-gray-400 hover:text-gray-600 text-xl font-light p-1"
            >
              ←
            </button>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{classeDados.titulo}</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
          >
            ×
          </button>
        </div>

        {/* Conteúdo detalhado */}
        <div className="p-3 sm:p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Indicação</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{classeDados.indicacao}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Marcas por Fabricante</h3>
              {renderMarcasTable(classeDados.marcas)}
            </div>

            {classeDados.observacoes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Observações</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{classeDados.observacoes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AntiinflamatoriosModal({ isOpen, onClose }: AntiinflamatoriosModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedType(null);
    setSelectedClass(null);
    onClose();
  };

  const getDadosByType = (type: string) => {
    return dadosAntiinflamatorios[type];
  };

  const getDadosByClass = (type: string, className: string) => {
    const grupo = dadosAntiinflamatorios[type];
    if (!grupo) return null;
    return grupo.classes.find(c => c.titulo === className);
  };

  const renderMarcasTable = (marcas: MarcaFabricante[]) => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Fabricante</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Colírios</th>
            </tr>
          </thead>
          <tbody>
            {marcas.map((marca, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 border-b">{marca.fabricante}</td>
                <td className="px-4 py-2 text-sm text-gray-700 border-b">
                  {marca.colirios.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!isOpen) return null;

  // If no type is selected, show the 3 main buttons
  if (!selectedType) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Antiinflamatorios</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Content - 3 main buttons */}
          <div className="p-3 sm:p-6">
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setSelectedType('corticoides')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Corticoides Oftálmicos (Fortes e Leves)</h3>
                <p className="text-sm text-gray-600">Indicados para uveítes, inflamações intensas e pós-operatórios intraoculares</p>
              </button>

              <button
                onClick={() => setSelectedType('aines')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">AINEs (Anti-inflamatórios não esteroidais)</h3>
                <p className="text-sm text-gray-600">Indicados para dor, inflamação leve e prevenção de edema macular no pós-operatório</p>
              </button>

              <button
                onClick={() => setSelectedType('combinacoes')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Combinações Fixas: Corticoide + Antibiótico</h3>
                <p className="text-sm text-gray-600">Usadas em inflamações oculares com risco infeccioso</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a type is selected but no class, show the classes
  if (selectedType && !selectedClass) {
    const dados = getDadosByType(selectedType);
    if (!dados) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedType(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light p-1"
              >
                ←
              </button>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{dados.titulo}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Content - Classes */}
          <div className="p-3 sm:p-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Descrição</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">{dados.descricao}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Classes</h3>
              <div className="grid grid-cols-1 gap-4">
                {dados.classes.map((classe, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedClass(classe.titulo)}
                    className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
                  >
                    <h4 className="text-md font-semibold text-gray-800 mb-2">{classe.titulo}</h4>
                    <p className="text-sm text-gray-600">{classe.indicacao}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a class is selected, show the details
  if (selectedType && selectedClass) {
    const dados = getDadosByClass(selectedType, selectedClass);
    if (!dados) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedClass(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light p-1"
              >
                ←
              </button>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{dados.titulo}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Detailed content */}
          <div className="p-3 sm:p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Indicação</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{dados.indicacao}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Marcas por Fabricante</h3>
                {renderMarcasTable(dados.marcas)}
              </div>

              {dados.observacoes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Observações</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{dados.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

function AntialergicosModal({ isOpen, onClose }: AntialergicosModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedType(null);
    setSelectedClass(null);
    onClose();
  };

  const getDadosByType = (type: string) => {
    return dadosAntialergicos[type];
  };

  const getDadosByClass = (type: string, className: string) => {
    const grupo = dadosAntialergicos[type];
    if (!grupo) return null;
    return grupo.classes.find(c => c.titulo === className);
  };

  const renderMarcasTable = (marcas: MarcaFabricante[]) => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Fabricante</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Colírios</th>
            </tr>
          </thead>
          <tbody>
            {marcas.map((marca, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 border-b">{marca.fabricante}</td>
                <td className="px-4 py-2 text-sm text-gray-700 border-b">
                  {marca.colirios.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!isOpen) return null;

  // If no type is selected, show the 3 main buttons
  if (!selectedType) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Antialergicos</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Content - 3 main buttons */}
          <div className="p-3 sm:p-6">
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setSelectedType('antihistaminicosH1')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Anti-histamínicos H1</h3>
                <p className="text-sm text-gray-600">Medicamentos que bloqueiam a ação da histamina</p>
              </button>

              <button
                onClick={() => setSelectedType('estabilizadoresMastocitos')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Estabilizadores de Mastócitos</h3>
                <p className="text-sm text-gray-600">Previnem a degranulação de mastócitos, reduzindo mediadores inflamatórios</p>
              </button>

              <button
                onClick={() => setSelectedType('agentesDuplos')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Agentes Duplos</h3>
                <p className="text-sm text-gray-600">Atuam tanto na prevenção quanto no alívio dos sintomas</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a type is selected but no class, show the classes
  if (selectedType && !selectedClass) {
    const dados = getDadosByType(selectedType);
    if (!dados) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedType(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light p-1"
              >
                ←
              </button>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{dados.titulo}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Content - Classes */}
          <div className="p-3 sm:p-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Descrição</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">{dados.descricao}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Classes</h3>
              <div className="grid grid-cols-1 gap-4">
                {dados.classes.map((classe, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedClass(classe.titulo)}
                    className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 text-left"
                  >
                    <h4 className="text-md font-semibold text-gray-800 mb-2">{classe.titulo}</h4>
                    <p className="text-sm text-gray-600">{classe.indicacao}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a class is selected, show the details
  if (selectedType && selectedClass) {
    const dados = getDadosByClass(selectedType, selectedClass);
    if (!dados) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-3 sm:p-6 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedClass(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light p-1"
              >
                ←
              </button>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{dados.titulo}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light p-1"
            >
              ×
            </button>
          </div>

          {/* Detailed content */}
          <div className="p-3 sm:p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Indicação</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{dados.indicacao}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Marcas por Fabricante</h3>
                {renderMarcasTable(dados.marcas)}
              </div>

              {dados.observacoes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Observações</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{dados.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
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
  const [glaucomaModalOpen, setGlaucomaModalOpen] = useState(false);
  const [conservantesModalOpen, setConservantesModalOpen] = useState(false);
  const [antimicrobianosModalOpen, setAntimicrobianosModalOpen] = useState(false);
  const [antiinflamatoriosModalOpen, setAntiinflamatoriosModalOpen] = useState(false);
  const [antialergicosModalOpen, setAntialergicosModalOpen] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoFarmacologico | null>(null);

  const handleGrupoClick = (grupo: GrupoFarmacologico) => {
    // Se for o grupo Glaucoma, abrir o modal específico
    if (grupo.nome.includes("Antiglaucomatosos")) {
      setGlaucomaModalOpen(true);
    } else if (grupo.nome.includes("Conservantes")) {
      setConservantesModalOpen(true);
    } else if (grupo.nome.includes("Antimicrobianos")) {
      setAntimicrobianosModalOpen(true);
    } else if (grupo.nome.includes("Anti-inflamatórios")) {
      setAntiinflamatoriosModalOpen(true);
    } else if (grupo.nome.includes("Antialérgicos")) {
      setAntialergicosModalOpen(true);
    } else {
      setGrupoSelecionado(grupo);
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setGrupoSelecionado(null);
  };

  const handleCloseGlaucomaModal = () => {
    setGlaucomaModalOpen(false);
  };

  const handleCloseConservantesModal = () => {
    setConservantesModalOpen(false);
  };

  const handleCloseAntimicrobianosModal = () => {
    setAntimicrobianosModalOpen(false);
  };

  const handleCloseAntiinflamatoriosModal = () => {
    setAntiinflamatoriosModalOpen(false);
  };

  const handleCloseAntialergicosModal = () => {
    setAntialergicosModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-white p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">


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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
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
                {grupo.nome === "Antiglaucomatosos" || grupo.nome === "Conservantes" ? "4 classes" : grupo.nome === "Antimicrobianos" ? "3 classes" : grupo.nome === "Anti-inflamatórios" ? "3 classes" : grupo.nome === "Antialérgicos" ? "3 classes" : `${grupo.grupos.length} medicamento${grupo.grupos.length !== 1 ? 's' : ''}`}
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

      {/* Modal do Glaucoma */}
      <GlaucomaModal
        isOpen={glaucomaModalOpen}
        onClose={handleCloseGlaucomaModal}
      />

      {/* Modal de Conservantes */}
      <ConservantesModal
        isOpen={conservantesModalOpen}
        onClose={handleCloseConservantesModal}
      />

      {/* Modal de Antimicrobianos */}
      <AntimicrobianosModal
        isOpen={antimicrobianosModalOpen}
        onClose={handleCloseAntimicrobianosModal}
      />

      {/* Modal de Antiinflamatorios */}
      <AntiinflamatoriosModal
        isOpen={antiinflamatoriosModalOpen}
        onClose={handleCloseAntiinflamatoriosModal}
      />

      {/* Modal de Antialergicos */}
      <AntialergicosModal
        isOpen={antialergicosModalOpen}
        onClose={handleCloseAntialergicosModal}
      />
    </div>
  );
} 