/**
 * Template oficial do Contrato de Tratamento e Termo de Consentimento Informado
 * para uso de tirzepatida. Fonte única do texto — não duplicar em componentes React.
 *
 * Placeholders: {{nomeDoCampo}}
 */

export const CONTRATO_TIRZEPATIDA_TEMPLATE = `CONTRATO DE TRATAMENTO E TERMO DE CONSENTIMENTO INFORMADO
TRATAMENTO COM TIRZEPATIDA

Data de impressão: {{dataImpressao}}

═══════════════════════════════════════════════════════════════════════════════
PARTES
═══════════════════════════════════════════════════════════════════════════════

CONTRATADO (MÉDICO RESPONSÁVEL):
Nome: {{nomeMedico}}
CRM: {{crmMedico}}/{{ufCrmMedico}}
Endereço: {{enderecoMedico}}
Cidade/UF: {{cidadeMedico}}/{{estadoMedico}}

CONTRATANTE (PACIENTE):
Nome: {{nomePaciente}}
CPF: {{cpfPaciente}}
RG: {{rgPaciente}}
Data de nascimento: {{dataNascimentoPaciente}}
Endereço: {{enderecoPaciente}}
Cidade/UF: {{cidadePaciente}}/{{estadoPaciente}}

═══════════════════════════════════════════════════════════════════════════════
1. OBJETO
═══════════════════════════════════════════════════════════════════════════════

O presente instrumento formaliza a adesão do(a) paciente ao plano terapêutico com
tirzepatida, agonista dual dos receptores GLP-1 e GIP, prescrito para controle de
peso e/ou condições metabólicas associadas, conforme avaliação clínica individual
e diretrizes médicas vigentes.

═══════════════════════════════════════════════════════════════════════════════
2. CONSENTIMENTO INFORMADO
═══════════════════════════════════════════════════════════════════════════════

O(A) paciente declara ter sido informado(a) pelo médico responsável sobre:

a) Finalidade do tratamento: redução de peso corporal e melhora de parâmetros
   metabólicos, quando clinicamente indicado;

b) Mecanismo de ação: agonismo dos receptores GLP-1 e GIP, com efeito sobre
   saciedade, esvaziamento gástrico e controle glicêmico;

c) Posologia habitual: aplicação subcutânea semanal, com titulação progressiva
   conforme tolerância e resposta clínica;

d) Efeitos adversos mais frequentes: náusea, vômito, diarreia, constipação,
   dor abdominal, diminuição do apetite e outros sintomas gastrointestinais;

e) Efeitos adversos graves que exigem atenção imediata: dor abdominal intensa
   e persistente (suspeita de pancreatite), reações alérgicas graves, sinais de
   desidratação, alterações visuais ou outros sintomas de alarme;

f) Contraindicações e precauções: histórico pessoal ou familiar de carcinoma
   medular de tireoide (CMT) ou Neoplasia Endócrina Múltipla tipo 2 (NEM 2),
   gestação, lactação, hipersensibilidade conhecida ao fármaco, entre outras
   avaliadas na consulta;

g) Interações medicamentosas e necessidade de informar todos os medicamentos em uso;

h) Importância de acompanhamento médico regular, exames laboratoriais quando
   indicados e adesão às orientações nutricionais e de estilo de vida.

═══════════════════════════════════════════════════════════════════════════════
3. OBRIGAÇÕES DO PACIENTE
═══════════════════════════════════════════════════════════════════════════════

O(A) paciente compromete-se a:

a) Utilizar o medicamento conforme prescrição médica, sem alterar doses por conta própria;
b) Comunicar imediatamente efeitos adversos, gravidez ou suspeita de gravidez;
c) Comparecer às consultas e reavaliações agendadas;
d) Manter hábitos alimentares e de atividade física orientados pela equipe;
e) Não compartilhar, transferir ou revender o medicamento;
f) Armazenar o medicamento conforme orientação da bula e do fabricante.

═══════════════════════════════════════════════════════════════════════════════
4. OBRIGAÇÕES DO MÉDICO
═══════════════════════════════════════════════════════════════════════════════

O médico responsável compromete-se a:

a) Prescrever o tratamento com base em avaliação clínica individualizada;
b) Orientar sobre riscos, benefícios e alternativas terapêuticas;
c) Acompanhar a evolução clínica e ajustar a conduta quando necessário;
d) Estar disponível para esclarecimentos em horário profissional acordado.

═══════════════════════════════════════════════════════════════════════════════
5. CUSTOS E RESPONSABILIDADES FINANCEIRAS
═══════════════════════════════════════════════════════════════════════════════

Os custos do medicamento, materiais de aplicação, exames complementares e
consultas não incluídos em eventual plano de saúde são de responsabilidade do(a)
paciente, salvo acordo específico firmado em documento apartado.

═══════════════════════════════════════════════════════════════════════════════
6. RESCISÃO E INTERRUPÇÃO
═══════════════════════════════════════════════════════════════════════════════

O tratamento poderá ser interrompido por decisão médica fundamentada, por
solicitação do(a) paciente ou por ocorrência de eventos adversos que contraindiquem
a continuidade. A interrupção deve ser comunicada e acompanhada pelo médico
responsável.

═══════════════════════════════════════════════════════════════════════════════
7. PROTEÇÃO DE DADOS
═══════════════════════════════════════════════════════════════════════════════

Os dados pessoais e clínicos serão tratados conforme a Lei Geral de Proteção de
Dados (Lei nº 13.709/2018) e normas do Conselho Federal de Medicina, exclusivamente
para fins de assistência à saúde e registro médico.

═══════════════════════════════════════════════════════════════════════════════
8. DISPOSIÇÕES FINAIS
═══════════════════════════════════════════════════════════════════════════════

O(A) paciente declara ter lido (ou ouvido a leitura de) este documento, ter
compreendido as informações prestadas e ter tido oportunidade de esclarecer
dúvidas antes de consentir com o tratamento.

Este documento não substitui a consulta médica nem a prescrição individualizada.

Identificador do documento: {{hashDocumento}}

═══════════════════════════════════════════════════════════════════════════════
ASSINATURA DIGITAL DO MÉDICO
═══════════════════════════════════════════════════════════════════════════════

{{assinaturaDigitalMedico}}

Data da assinatura do médico: {{dataAssinaturaMedico}}

═══════════════════════════════════════════════════════════════════════════════
ASSINATURA DO PACIENTE
═══════════════════════════════════════════════════════════════════════════════

---

Nome: _________________________________________________

CPF: __________________________________________________

Data: ____/____/________

`;

export const CONTRATO_TIRZEPATIDA_PLACEHOLDER_KEYS = [
  'nomeMedico',
  'crmMedico',
  'ufCrmMedico',
  'enderecoMedico',
  'cidadeMedico',
  'estadoMedico',
  'nomePaciente',
  'cpfPaciente',
  'rgPaciente',
  'dataNascimentoPaciente',
  'enderecoPaciente',
  'cidadePaciente',
  'estadoPaciente',
  'dataImpressao',
  'dataAssinaturaMedico',
  'hashDocumento',
  'assinaturaDigitalMedico',
] as const;

export type ContratoTirzepatidaPlaceholderKey = (typeof CONTRATO_TIRZEPATIDA_PLACEHOLDER_KEYS)[number];

const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

/** Substitui placeholders {{chave}} pelos valores informados. Chaves ausentes viram string vazia. */
export function fillContratoTirzepatidaTemplate(
  values: Partial<Record<ContratoTirzepatidaPlaceholderKey, string>>
): string {
  return CONTRATO_TIRZEPATIDA_TEMPLATE.replace(PLACEHOLDER_REGEX, (_match, key: string) => {
    const v = values[key as ContratoTirzepatidaPlaceholderKey];
    return v != null ? String(v) : '';
  });
}
