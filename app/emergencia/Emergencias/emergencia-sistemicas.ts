// 🧠 Emergências Sistêmicas Associadas – Complicações Oftalmológicas Agudas

export const EMERGENCIAS_OFTALMOLOGICAS = [
  {
    "id": "arterite-temporal",
    "titulo": "Arterite Temporal (com risco de NOIA)",
    "sinais": [
      "Idade > 50 anos",
      "Cefaleia temporal",
      "Claudicação mandibular",
      "Sensibilidade do couro cabeludo",
      "Perda visual súbita",
      "Febre e fadiga",
      "Eritrosedimentação (VES) > 50 mm/h"
    ],
    "conduta": [
      "Solicitar VES e PCR imediatamente",
      "Iniciar pulsoterapia com Metilprednisolona 1g EV/dia por 3 dias",
      "Posteriormente Prednisona VO 1 mg/kg/dia",
      "Solicitar biópsia da artéria temporal em até 10 dias após início da corticoterapia",
      "Encaminhamento urgente ao reumatologista"
    ],
    "prescricao": [
      "VES e PCR imediatamente",
      "Metilprednisolona 1g EV/dia por 3 dias",
      "Prednisona VO 1 mg/kg/dia após pulsoterapia",
      "Biópsia da artéria temporal em até 10 dias",
      "Encaminhamento urgente ao reumatologista"
    ]
  },
  {
    "id": "hipertensao-intracraniana",
    "titulo": "Hipertensão Intracraniana Idiopática (Pseudotumor cerebral)",
    "sinais": [
      "Cefaleia holocraniana",
      "Papiledema bilateral",
      "Zumbido pulsátil",
      "Diplopia por paralisia de VI par",
      "Obesidade em mulheres jovens"
    ],
    "conduta": [
      "Solicitar TC de crânio para excluir lesão expansiva",
      "Punção lombar para medir pressão de abertura (>25 cmH2O)",
      "Acetazolamida 250–1000 mg/dia",
      "Encaminhamento à neurologia para seguimento",
      "Acompanhamento oftalmológico com campimetria"
    ],
    "prescricao": [
      "TC de crânio para excluir lesão expansiva",
      "Punção lombar para medir pressão de abertura",
      "Acetazolamida 250–1000 mg/dia",
      "Encaminhamento à neurologia",
      "Acompanhamento oftalmológico com campimetria"
    ]
  },
  {
    "id": "neuropatia-optica-toxica",
    "titulo": "Neuropatia Óptica Tóxica ou Carencial",
    "sinais": [
      "Perda visual bilateral e progressiva",
      "Discromatopsia vermelho-verde",
      "Uso de etambutol, tabagismo, alcoolismo ou má nutrição",
      "Neurorretinite em casos graves"
    ],
    "conduta": [
      "Suspender agente tóxico (ex: etambutol)",
      "Reposição vitamínica (B1, B6, B12, ácido fólico)",
      "Encaminhamento à clínica médica ou nutrologia",
      "Acompanhamento oftalmológico com OCT de nervo óptico"
    ],
    "prescricao": [
      "Suspender agente tóxico (ex: etambutol)",
      "Reposição vitamínica: B1, B6, B12, ácido fólico",
      "Encaminhamento à clínica médica ou nutrologia",
      "Acompanhamento oftalmológico com OCT de nervo óptico"
    ]
  },
  {
    "id": "lupus-eritematoso",
    "titulo": "Lúpus Eritematoso Sistêmico",
    "sinais": [
      "Vasculite retiniana",
      "Uveíte anterior ou posterior",
      "Retinopatia hipertensiva"
    ],
    "conduta": [
      "Encaminhar ao reumatologista",
      "Corticoterapia sistêmica se vasculite",
      "Antiagregação plaquetária se houver oclusão vascular"
    ],
    "prescricao": [
      "Encaminhamento ao reumatologista",
      "Corticoterapia sistêmica se vasculite",
      "Antiagregação plaquetária se oclusão vascular"
    ]
  },
  {
    "id": "sindrome-behcet",
    "titulo": "Síndrome de Behçet",
    "sinais": [
      "Panuveíte com hipópio",
      "Vasculite retiniana necrotizante"
    ],
    "conduta": [
      "Corticoterapia sistêmica de urgência",
      "Imunossupressores (ex: azatioprina, ciclosporina)",
      "Encaminhamento urgente ao reumatologista"
    ],
    "prescricao": [
      "Corticoterapia sistêmica de urgência",
      "Imunossupressores: azatioprina, ciclosporina",
      "Encaminhamento urgente ao reumatologista"
    ]
  },
  {
    "id": "sarcoidose",
    "titulo": "Sarcoidose",
    "sinais": [
      "Uveíte anterior granulomatosa",
      "Paralisia de nervos cranianos",
      "Lesões de retina ou coróide"
    ],
    "conduta": [
      "Investigação com TC de tórax e ECA sérico",
      "Encaminhar ao pneumologista/reumatologista",
      "Corticoterapia sistêmica em casos graves"
    ],
    "prescricao": [
      "TC de tórax e ECA sérico",
      "Encaminhamento ao pneumologista/reumatologista",
      "Corticoterapia sistêmica em casos graves"
    ]
  },
  {
    "id": "hiv",
    "titulo": "HIV",
    "sinais": [
      "Retinopatia por CMV",
      "Toxoplasmose ocular",
      "Candidíase retiniana",
      "Neurite óptica"
    ],
    "conduta": [
      "Encaminhar ao infectologista",
      "Terapia antirretroviral otimizada",
      "Tratamento específico para patógenos oportunistas"
    ],
    "prescricao": [
      "Encaminhamento ao infectologista",
      "Terapia antirretroviral otimizada",
      "Tratamento específico para patógenos oportunistas"
    ]
  },
  {
    "id": "sifilis",
    "titulo": "Sífilis",
    "sinais": [
      "Uveíte anterior, posterior ou pan-uveíte",
      "Neurite óptica",
      "Vasculite retiniana"
    ],
    "conduta": [
      "Solicitar VDRL, FTA-ABS e punção lombar",
      "Penicilina cristalina EV 18-24 milhões UI/dia por 14 dias",
      "Notificação compulsória e encaminhamento ao infectologista"
    ],
    "prescricao": [
      "VDRL, FTA-ABS e punção lombar",
      "Penicilina cristalina EV 18-24 milhões UI/dia por 14 dias",
      "Notificação compulsória e encaminhamento ao infectologista"
    ]
  },
  {
    "id": "tuberculose",
    "titulo": "Tuberculose",
    "sinais": [
      "Uveíte granulomatosa",
      "Serosite ocular",
      "Neuroretinite"
    ],
    "conduta": [
      "Solicitar PPD, IGRA, RX ou TC de tórax",
      "Encaminhar ao pneumologista",
      "Iniciar esquema RIPE após confirmação"
    ],
    "prescricao": [
      "PPD, IGRA, RX ou TC de tórax",
      "Encaminhamento ao pneumologista",
      "Esquema RIPE após confirmação"
    ]
  },
  {
    "id": "toxoplasmose",
    "titulo": "Toxoplasmose",
    "sinais": [
      "Retino-coroidite focal com bordas ativas",
      "Vasculite e inflamação vítrea"
    ],
    "conduta": [
      "Sulfadiazina + pirimetamina + ácido folínico + prednisona",
      "Acompanhamento com mapeamento de retina e OCT"
    ],
    "prescricao": [
      "Sulfadiazina + pirimetamina + ácido folínico + prednisona",
      "Acompanhamento com mapeamento de retina e OCT"
    ]
  }
];