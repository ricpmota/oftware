export const EMERGENCIAS_OFTALMOLOGICAS = [
  {
    "id": "trauma-ocular-abrasao",
    "titulo": "Abrasão Corneana / Corpo Estranho",
    "sinais": [
      "Dor aguda após trauma com lixadeira, vegetação ou inseto",
      "História de moto, grama, solda ou lente de contato",
      "Corpo estranho corneano ou desepitelização visível"
    ],
    "conduta": [
      "Instilar anestésico tópico para alívio inicial",
      "Everter pálpebra e remover corpo estranho tarsal com cotonete ou pinça",
      "Se CE corneano superficial, remover com agulha 27G ou Alger Brush",
      "Evitar AINH ou corticoides se houver defeito epitelial",
      "Realizar acompanhamento em 48h para reepitelização"
    ],
    "prescricao": [
      "Moxifloxacino 0,5% 1 gota 6/6h por 7 dias",
      "Lubrificante 6/6h",
      "Atropina 1% 1 gota 12/12h se dor intensa ou reação de CA",
      "Concha ocular + retorno em 48h",
      "Evitar AINH tópico e corticoide enquanto houver lesão epitelial"
    ]
  },
  {
    "id": "trauma-ocular-laceracao-parcial",
    "titulo": "Laceração Corneana de Espessura Parcial",
    "sinais": [
      "Trauma com objeto cortante sem perfuração ocular",
      "Lesão corneana superficial, sem vazamento",
      "Sem alteração da câmara anterior"
    ],
    "conduta": [
      "Confirmar ausência de Seidel positivo",
      "Reposo visual, uso de cicloplégico e antibiótico tópico",
      "Revisão seriada para descartar progressão ou infecção"
    ],
    "prescricao": [
      "Moxifloxacino 0,5% 1 gota 6/6h",
      "Atropina 1% 1 gota 12/12h",
      "Concha de acrílico",
      "Vacina antitetânica se ferida contaminada",
      "AV + Seidel + PIO + FO a cada retorno"
    ]
  },
  {
    "id": "trauma-ocular-laceracao-total-auto-selante",
    "titulo": "Laceração Corneana de Espessura Total (Auto-selante)",
    "sinais": [
      "Câmara anterior profunda mas Seidel positivo tardio ou induzido",
      "Sem vazamento ativo",
      "Ferida auto-selada"
    ],
    "conduta": [
      "Preservar globo ocular e reduzir PIO",
      "Evitar aumento de pressão externa",
      "Acompanhar risco de perfuração tardia"
    ],
    "prescricao": [
      "Moxifloxacino 0,5% 1 gota 6/6h",
      "Timolol 0,5% 1 gota 12/12h",
      "Lente de contato terapêutica",
      "Concha protetora + repouso absoluto",
      "Vacina antitetânica se necessário"
    ]
  },
  {
    "id": "trauma-ocular-perfurante",
    "titulo": "Laceração Corneana com Vazamento Ativo (Perfuração)",
    "sinais": [
      "Seidel positivo evidente",
      "Câmara anterior rasa",
      "Assimetria entre os olhos",
      "Possível prolapso de íris ou conteúdo intraocular"
    ],
    "conduta": [
      "Cobrir com concha de acrílico imediatamente",
      "Não manipular ou colocar curativo oclusivo",
      "Encaminhar para centro cirúrgico com urgência",
      "Internar, manter jejum e repouso absoluto"
    ],
    "prescricao": [
      "Hospitalização imediata",
      "Jejum + concha ocular + antibiótico EV conforme protocolo cirúrgico",
      "Vacina antitetânica",
      "Não instilar colírios até avaliação cirúrgica",
      "Cirurgia com sutura, cola ou patch corneano conforme lesão"
    ]
  },
  {
    "id": "trauma-ocular-lesao-interna",
    "titulo": "Trauma Ocular Contuso – Lesões Internas",
    "sinais": [
      "História de pancada, queda ou acidente",
      "Pupila em D, facodonese, PIO alterada",
      "Presença de sangue, vítreo na CA ou deslocamento do cristalino",
      "Sinais indiretos como AV reduzida e midríase fixa"
    ],
    "conduta": [
      "Exame completo com AV, PIO, reflexos pupilares e FO",
      "Lâmpada de fenda para sinais de ruptura do esfíncter, iridodiálise, ciclodiálise",
      "Gonioscopia: faixa ciliar alargada (recessão angular), ciclodiálise, refluxo de sangue",
      "UBM: para avaliar ciclodiálise e alterações do corpo ciliar",
      "TC para CEIO metálico / USG B para opacidades de meios sem suspeita de perfuração",
      "Monitorar PIO por risco de hipotonia ou hipertensão ocular tardia (Sd. Wolf-Zimmerman)",
      "Seguimento trimestral no primeiro ano se recessão angular ≥180º"
    ],
    "prescricao": [
      "Prednisolona 1% 1 gota 6/6h se inflamação significativa",
      "Atropina 1% 1 gota 12/12h em ciclodiálise com hipotonia",
      "Timolol 0,5% 12/12h se hipertensão ocular",
      "Analgesia VO conforme necessário",
      "Encaminhamento para cirurgia se houver: subluxação do cristalino, vítreo na CA, deslocamento da LIO, etc.",
      "Repouso, proteção ocular e retorno semanal com PIO, AV e FO"
    ]
  },
  {
    "id": "trauma-ocular-eto",
    "titulo": "Calculadora de Escore de Trauma Ocular (ETO)",
    "sinais": [
      "Permite estimar prognóstico visual após trauma ocular contuso ou perfurante",
      "Baseado na AV inicial e achados críticos"
    ],
    "conduta": [
      "Avalie a AV do paciente na apresentação",
      "Some a pontuação base conforme a tabela de AV",
      "Subtraia os valores se houver achados negativos (ruptura, endoftalmite, etc.)",
      "Classifique de I a V com base na pontuação final"
    ],
    "prescricao": [],
    "calculadora": {
      "avBase": {
        "spl": 60,
        "pl_mm": 70,
        "lt_20_200": 80,
        "bt_20_200_20_50": 90,
        "gte_20_40": 100
      },
      "penalidades": {
        "ruptura": -23,
        "endoftalmite": -17,
        "perfuracao_retina": -14,
        "prolapso_iris": -11,
        "hipopio": -10,
        "descolamento_retina": -11,
        "rapd": -10
      },
      "categorias": [
        {
          "faixa": [
            0,
            44
          ],
          "classe": "I",
          "chanceMenor20_200": "73%"
        },
        {
          "faixa": [
            45,
            65
          ],
          "classe": "II",
          "chanceMenor20_200": "27%"
        },
        {
          "faixa": [
            66,
            80
          ],
          "classe": "III",
          "chanceMenor20_200": "15%"
        },
        {
          "faixa": [
            81,
            91
          ],
          "classe": "IV",
          "chanceMenor20_200": "3%"
        },
        {
          "faixa": [
            92,
            100
          ],
          "classe": "V",
          "chanceMenor20_200": "1%"
        }
      ]
    }
  }
]