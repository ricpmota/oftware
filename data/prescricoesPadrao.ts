/**
 * PRESCRIÇÕES PADRÃO
 *
 * Use este arquivo como referência para criar novas prescrições padrão.
 * Cada prescrição segue o mesmo formato. Adicione novos itens ao array PRESCRICOES_PADRAO.
 *
 * O sistema (PrescricaoService.criarPrescricoesPadraoGlobais) persiste essas prescrições
 * no Firestore como templates (isTemplate: true, medicoId: 'SISTEMA') quando ainda não existem.
 *
 * Estrutura de cada prescrição:
 * - nome: string (ex: "Vitamina D3")
 * - descricao: string (texto breve da prescrição)
 * - observacoes: string (orientações gerais)
 * - itens: array de PrescricaoItem
 *
 * Cada PrescricaoItem:
 * - medicamento: string (nome do medicamento/suplemento)
 * - dosagem: string (ex: "2000 a 4000 UI por dia")
 * - frequencia: string (ex: "1x ao dia", "3x ao dia")
 * - instrucoes: string (como tomar, quando, etc.)
 * - quantidade?: string (opcional, ex: "1 cápsula", "3g/dia")
 */

export interface PrescricaoItemPadrao {
  medicamento: string;
  dosagem: string;
  frequencia: string;
  instrucoes: string;
  quantidade?: string;
}

export interface PrescricaoPadraoDef {
  nome: string;
  descricao: string;
  observacoes: string;
  itens: PrescricaoItemPadrao[];
}

/** Peso de referência (kg) para prescrições que dependem do peso (ex: Suplementar). */
export const PESO_REFERENCIA_KG = 70;

/**
 * Prescrições padrão. Para adicionar uma nova prescrição:
 * 1. Copie um bloco existente (ex: Vitamina D3 ou HMB).
 * 2. Altere nome, descricao, observacoes e itens.
 * 3. Adicione o nome em criarPrescricoesPadraoGlobais (prescricaoService) se for criar no sistema.
 */
export const PRESCRICOES_PADRAO: PrescricaoPadraoDef[] = [
  {
    nome: 'Prescrição Suplementar Padrão',
    descricao:
      'Prescrição de suplementos para auxiliar no tratamento de perda de peso. As dosagens são ajustadas automaticamente conforme o peso do paciente.',
    observacoes:
      'As dosagens são calculadas automaticamente com base no peso do paciente. A dosagem de Whey Protein é de 1,6g por kg de peso corporal, dividido em 3 tomadas ao dia.',
    itens: [
      {
        medicamento: 'Whey Protein',
        dosagem: '112g por dia (1,6g por kg de peso corporal)',
        frequencia: '3x ao dia',
        instrucoes:
          'Tomar aproximadamente 37.3g de whey protein 3 vezes ao dia (totalizando 112g/dia). Preferencialmente após as refeições principais ou após exercícios físicos. A dosagem de 1,6g/kg/dia é recomendada para preservação de massa muscular durante processo de perda de peso.',
        quantidade: '112g/dia',
      },
      {
        medicamento: 'Creatina MAX',
        dosagem: '3,5g por dia',
        frequencia: '1x ao dia',
        instrucoes:
          'Tomar 3,5g por dia, diluído em 200ml de água. Preferencialmente após o treino ou junto com uma refeição. A creatina auxilia na preservação de força e massa muscular durante o processo de perda de peso.',
        quantidade: '3,5g/dia',
      },
    ],
  },
  {
    nome: 'Prescrição de Probióticos',
    descricao: 'Prescrição de probióticos para uso oral. Manipular em cápsulas.',
    observacoes:
      'Manipular em cápsulas. Tomar 1 cápsula ao deitar, por tempo indeterminado ou conforme orientação médica.',
    itens: [
      {
        medicamento: 'Probióticos',
        dosagem:
          'Lactobacillus reuteri 2 bilhões UFC + Lactobacillus gasseri 2 bilhões UFC + Bifidobacterium longum 2 bilhões UFC + Lactobacillus acidophilus 1 bilhão UFC + Inulina 100 mg + FOS (Frutooligossacarídeos) 100 mg',
        frequencia: '1x ao dia',
        instrucoes:
          'Manipular em cápsulas. Tomar 1 cápsula ao deitar, por tempo indeterminado ou conforme orientação médica.',
        quantidade: '1 cápsula',
      },
    ],
  },
  {
    nome: 'Vitamina D3',
    descricao:
      'Prescrição de vitamina D3 (colecalciferol) para suplementação. Ajustar dose conforme dosagem sérica.',
    observacoes:
      'Tomar preferencialmente com refeição gordurosa. Realizar controle laboratorial (25-OH vitamina D) conforme orientação médica.',
    itens: [
      {
        medicamento: 'Vitamina D3',
        dosagem: '2000 a 4000 UI por dia (ajustar conforme dosagem sérica)',
        frequencia: '1x ao dia',
        instrucoes:
          'Tomar 1 cápsula ao dia, preferencialmente junto com a refeição mais gordurosa para melhor absorção. Manter suplementação por tempo indeterminado ou conforme orientação médica e controle laboratorial.',
        quantidade: '2000 a 4000 UI/dia',
      },
    ],
  },
  {
    nome: 'Hidroximetilbutirato (HMB)',
    descricao:
      'Prescrição de HMB para auxiliar na preservação de massa muscular durante perda de peso.',
    observacoes:
      'Tomar preferencialmente com as refeições. Suplementação por tempo indeterminado ou conforme orientação médica.',
    itens: [
      {
        medicamento: 'Hidroximetilbutirato (HMB)',
        dosagem: '3g por dia',
        frequencia: '1,5g 2x ao dia ou 1g 3x ao dia',
        instrucoes:
          'Tomar 1,5g (2 cápsulas de 750mg) duas vezes ao dia ou 1g (1 cápsula de 1g) três vezes ao dia, preferencialmente com as refeições. O HMB auxilia na preservação de massa muscular durante processo de perda de peso. Suplementação por tempo indeterminado ou conforme orientação médica.',
        quantidade: '3g/dia',
      },
    ],
  },
];
