export const EMERGENCIAS_OFTALMOLOGICAS = [
  {
    "id": "queimaduras-oculares",
    "titulo": "Queimaduras Oculares (Químicas ou Térmicas)",
    "sinais": [
      "História de exposição a ácidos, bases ou agentes térmicos",
      "Dor ocular intensa, blefaroespasmo",
      "Hiperemia conjuntival, edema palpebral",
      "Presença de coágulos ou debris químicos na conjuntiva",
      "Opacificação da córnea, hipoestesia corneana",
      "Branqueamento conjuntival (isquemia), limbo pálido",
      "Atenuação ou desaparecimento dos vasos límbicos",
      "Pode haver hifema, sinéquias, necrose escleral"
    ],
    "conduta": [
      "Lavagem imediata e abundante com SF 0,9% ou Ringer (mínimo 2L por 30 minutos)",
      "Eversão da pálpebra superior para remover resíduos",
      "Remoção de partículas com cotonete ou pinça",
      "Anestésico tópico para permitir exame e limpeza",
      "Avaliar profundidade, extensão e sinais de necrose",
      "Internar queimaduras extensas, alcalinas ou com necrose",
      "Classificar gravidade conforme escala de Dua"
    ],
    "prescricao": [
      "Ciprofloxacino colírio 1 gota 6/6h",
      "Prednisolona 1% 1 gota 6/6h por até 10 dias (suspender gradualmente)",
      "Atropina 1% 1 gota 12/12h por 7 dias",
      "Lágrima artificial sem conservante 1 gota 6/6h",
      "Vitamina C VO 500mg 12/12h",
      "Doxiciclina VO 100mg 12/12h por 7 dias",
      "Analgesia VO (dipirona ou paracetamol)"
    ],
    "escoreDua": {
      "titulo": "Classificação de Gravidade — Escore de Dua",
      "descricao": "Avalia o prognóstico das queimaduras químicas baseado na perda de limbo e necrose conjuntival",
      "grupos": [
        "Grau I: 0h de limbo perdido, sem necrose conjuntival — Excelente prognóstico",
        "Grau II: <3h de limbo perdido, sem necrose conjuntival — Muito bom",
        "Grau III: 3–6h de limbo perdido, <30% de necrose conjuntival — Bom",
        "Grau IV: 6–9h de limbo perdido, 30–50% necrose conjuntival — Reservado",
        "Grau V: 9–<12h limbo perdido, 50–75% necrose conjuntival — Ruim",
        "Grau VI: ≥12h de limbo perdido, >75% necrose conjuntival — Péssimo"
      ]
    }
  }
]