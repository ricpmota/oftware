export const corpoEstranhoOcular = {
  titulo: "Corpo Estranho Ocular",
  resumo:
    "Remoção de corpo estranho corneano ou conjuntival, com orientação sobre antibioticoterapia tópica, sinais de alerta e reavaliação obrigatória.",

  sinaisESintomas: [
    "Dor ocular intensa",
    "Lacrimejamento excessivo",
    "Sensação de areia nos olhos",
    "Hiperemia conjuntival",
    "Fotofobia",
    "Blefaroespasmo"
  ],

  tiposDeCorpoEstranho: [
    "Conjuntival (superior ou inferior)",
    "Corneano (superficial ou impactado)",
    "Suspeita de corpo estranho intraocular"
  ],

  condutas: [
    {
      tipo: "Corpo Estranho Conjuntival",
      etapas: [
        "Anamnese com mecanismo do trauma",
        "Avaliação com eversão palpebral",
        "Remoção com haste estéril ou lavagem com SF 0,9%",
        "Avaliação da superfície com fluoresceína",
        "Prescrever colírio antibiótico profilático",
        "Orientar retorno se piora ou dor persistente"
      ]
    },
    {
      tipo: "Corpo Estranho Corneano",
      etapas: [
        "Anamnese e exame com fluoresceína",
        "Remoção com agulha de insulina estéril sob magnificação",
        "Investigar presença de anel de ferrugem e infiltração",
        "Prescrever colírio antibiótico profilático",
        "Evitar uso de lentes de contato por 7 dias",
        "Reavaliar em 24-48 horas"
      ]
    },
    {
      tipo: "Suspeita de Corpo Estranho Intraocular",
      etapas: [
        "História de alta energia (lixadeira, martelo, metal etc)",
        "Não realizar pressão ocular ou manipulação excessiva",
        "Solicitar RX de órbita ou TC sem contraste",
        "Encaminhar com urgência para centro de referência"
      ]
    }
  ],

  prescricao: [
    {
      indicacao: "Após remoção bem-sucedida de CE superficial",
      itens: [
        "Moxifloxacino colírio 1 gota 4x/dia por 5 dias",
        "Lágrima artificial 1 gota 4-6x/dia enquanto sintomático",
        "Dipirona 500 mg VO 6/6h se dor (máx. 4g/dia)"
      ]
    },
    {
      indicacao: "Suspeita de infecção (ceratite infecciosa)",
      itens: [
        "Encaminhar com urgência para oftalmologista",
        "Evitar uso de corticoide sem avaliação especializada"
      ]
    }
  ],

  alerta:
    "Corpo estranho metálico pode deixar anel de ferrugem — se presente, exige desbridamento especializado. Sempre orientar retorno precoce se dor, secreção ou piora da visão.",

  reavaliacao:
    "Retorno obrigatório em 24-48h para avaliação da resposta e detecção precoce de complicações."
};
