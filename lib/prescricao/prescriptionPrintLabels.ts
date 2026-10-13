import type { PrescriptionPrintLanguage } from '@/types/prescriptionPrintLanguage';

export type SimplePrescriptionPdfLabels = {
  title: string;
  patient: string;
  weight: string;
  medications: string;
  dosage: string;
  frequency: string;
  quantity: string;
  notes: string;
  date: string;
  signature: string;
  filePrefix: string;
};

export type ControleEspecialPdfLabels = {
  title: string;
  viaFarmacia: string;
  viaPaciente: string;
  patientSection: string;
  patient: string;
  address: string;
  sex: string;
  age: string;
  issuerSection: string;
  name: string;
  city: string;
  phone: string;
  issueDate: string;
  validUntil: string;
  prescriptionSection: string;
  strength: string;
  quantity: string;
  directions: string;
  notes: string;
  buyerSection: string;
  supplierSection: string;
  id: string;
  issuer: string;
  pharmacistSignature: string;
  dateBlank: string;
  filePrefix: string;
  notProvided: string;
  male: string;
  female: string;
  other: string;
  physicianFallback: string;
};

const SIMPLE_PT: SimplePrescriptionPdfLabels = {
  title: 'PRESCRIÇÃO MÉDICA',
  patient: 'Paciente',
  weight: 'Peso',
  medications: 'MEDICAMENTOS/SUPLEMENTOS:',
  dosage: 'Dosagem',
  frequency: 'Frequência',
  quantity: 'Quantidade',
  notes: 'OBSERVAÇÕES:',
  date: 'Data',
  signature: 'Assinatura do Médico',
  filePrefix: 'Prescricao',
};

const SIMPLE_EN: SimplePrescriptionPdfLabels = {
  title: 'MEDICAL PRESCRIPTION',
  patient: 'Patient',
  weight: 'Weight',
  medications: 'MEDICATIONS/SUPPLEMENTS:',
  dosage: 'Dosage',
  frequency: 'Frequency',
  quantity: 'Quantity',
  notes: 'NOTES:',
  date: 'Date',
  signature: "Physician's signature",
  filePrefix: 'Prescription',
};

const CONTROLE_PT: ControleEspecialPdfLabels = {
  title: 'RECEITUÁRIO DE CONTROLE ESPECIAL',
  viaFarmacia: '1ª VIA FARMÁCIA',
  viaPaciente: '2ª VIA PACIENTE',
  patientSection: 'INFORMAÇÕES DO PACIENTE',
  patient: 'Paciente:',
  address: 'Endereço:',
  sex: 'Sexo',
  age: 'Idade',
  issuerSection: 'IDENTIFICAÇÃO DO EMITENTE',
  name: 'Nome:',
  city: 'Cidade:',
  phone: 'Telefone:',
  issueDate: 'Data de Emissão',
  validUntil: 'Data de Validade',
  prescriptionSection: 'PRESCRIÇÃO',
  strength: 'Concentração:',
  quantity: 'Quantidade:',
  directions: 'Posologia:',
  notes: 'Observações / Justificativa:',
  buyerSection: 'IDENTIFICAÇÃO DO COMPRADOR',
  supplierSection: 'IDENTIFICAÇÃO DO FORNECEDOR',
  id: 'Ident.:',
  issuer: 'Órg. Emissor:',
  pharmacistSignature: 'ASSINATURA DO FARMACÊUTICO',
  dateBlank: 'DATA ____/____/______',
  filePrefix: 'Receituario_Controle_Especial',
  notProvided: 'Não informado',
  male: 'Masculino',
  female: 'Feminino',
  other: 'Outro',
  physicianFallback: 'Médico',
};

const CONTROLE_EN: ControleEspecialPdfLabels = {
  title: 'SPECIAL CONTROL PRESCRIPTION',
  viaFarmacia: '1st COPY — PHARMACY',
  viaPaciente: '2nd COPY — PATIENT',
  patientSection: 'PATIENT INFORMATION',
  patient: 'Patient:',
  address: 'Address:',
  sex: 'Sex',
  age: 'Age',
  issuerSection: 'PRESCRIBER IDENTIFICATION',
  name: 'Name:',
  city: 'City:',
  phone: 'Phone:',
  issueDate: 'Issue date',
  validUntil: 'Valid until',
  prescriptionSection: 'PRESCRIPTION',
  strength: 'Strength:',
  quantity: 'Quantity:',
  directions: 'Directions:',
  notes: 'Notes / Clinical justification:',
  buyerSection: 'BUYER IDENTIFICATION',
  supplierSection: 'SUPPLIER IDENTIFICATION',
  id: 'ID:',
  issuer: 'Issued by:',
  pharmacistSignature: "PHARMACIST'S SIGNATURE",
  dateBlank: 'DATE ____/____/______',
  filePrefix: 'Special_Control_Prescription',
  notProvided: 'Not provided',
  male: 'Male',
  female: 'Female',
  other: 'Other',
  physicianFallback: 'Physician',
};

export function simplePrescriptionPdfLabels(
  language: PrescriptionPrintLanguage
): SimplePrescriptionPdfLabels {
  return language === 'en' ? SIMPLE_EN : SIMPLE_PT;
}

export function controleEspecialPdfLabels(language: PrescriptionPrintLanguage): ControleEspecialPdfLabels {
  return language === 'en' ? CONTROLE_EN : CONTROLE_PT;
}

export function prescriptionPdfDateLocale(language: PrescriptionPrintLanguage): string {
  return language === 'en' ? 'en-GB' : 'pt-BR';
}

/** Traduz rótulos fixos já gravados no contexto (sexo, “Não informado”). */
export function localizeControleEspecialPhrase(
  value: string,
  language: PrescriptionPrintLanguage
): string {
  if (language !== 'en') return value;
  const trimmed = value.trim();
  if (trimmed === 'Não informado') return CONTROLE_EN.notProvided;
  if (trimmed === 'Masculino') return CONTROLE_EN.male;
  if (trimmed === 'Feminino') return CONTROLE_EN.female;
  if (trimmed === 'Outro') return CONTROLE_EN.other;
  return value;
}
