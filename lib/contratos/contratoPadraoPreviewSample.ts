import type { ContratoTirzepatidaPlaceholderKey } from '@/lib/contratos/contratoTirzepatidaTemplate';

/** Dados fictícios para preview do contrato padrão (advogados / admin). */
export const CONTRATO_PADRAO_PREVIEW_PLACEHOLDERS: Record<
  ContratoTirzepatidaPlaceholderKey,
  string
> = {
  nomeMedico: 'Dr. Ricardo Mota',
  crmMedico: '12345',
  ufCrmMedico: 'PE',
  enderecoMedico: 'Av. Boa Viagem, 1000, CEP 51020-000',
  cidadeMedico: 'Recife',
  estadoMedico: 'PE',
  nomePaciente: 'Maria da Silva Santos',
  cpfPaciente: '123.456.789-00',
  rgPaciente: '3.456.789 SSP/PE',
  dataNascimentoPaciente: '15/03/1985',
  enderecoPaciente: 'Rua das Flores, 250, CEP 52060-010',
  cidadePaciente: 'Recife',
  estadoPaciente: 'PE',
  cidadeForo: 'Recife',
  estadoForo: 'PE',
  dataImpressao: new Date().toLocaleDateString('pt-BR'),
  dataAssinaturaMedico: '—',
  dataAssinaturaPaciente: '—',
  hashDocumento: 'OFTW-CT-PREVIEW0001',
  assinaturaDigitalMedico: '',
  assinaturaDigitalPaciente: '',
  opcao1: 'X',
  opcao2: '',
};

export const CONTRATO_PADRAO_PREVIEW_MEDICO_HEADER = {
  nome: 'Dr. Ricardo Mota',
  crm: 'CRM-PE 12345',
  email: 'medico.exemplo@oftware.com.br',
};
