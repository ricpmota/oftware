/** Item salvo: título curto na lista; texto completo vai para o PDF ao escolher. */
export interface HipoteseDiagnosticaSalva {
  titulo: string;
  texto: string;
}

export interface Medico {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  /** URL pública (ex.: Storage) da foto de perfil em recorte circular; definida no Metaadmin. */
  fotoPerfilUrl?: string | null;
  genero?: 'M' | 'F'; // Para exibir Dr./Dra.
  telefone?: string; // Telefone do médico
  /** CPF (pessoa física), opcional — usado no recibo quando o médico escolher exibir CPF. */
  cpfPessoal?: string;
  /** CNPJ da empresa (pessoa jurídica), opcional — usado no recibo quando o médico escolher exibir CNPJ. */
  cnpjEmpresa?: string;
  crm: {
    numero: string;
    estado: string;
  };
  localizacao: {
    endereco: string;
    cep?: string;
    pontoReferencia?: string;
    lat?: number;
    lng?: number;
  };
  cidades: {
    estado: string;
    cidade: string;
  }[];
  dataCadastro: Date;
  status: 'ativo' | 'inativo';
  isVerificado?: boolean; // Verificação do médico pelo admin
  temPlanoIndicacao?: boolean; // Se o médico tem plano de indicações ativo
  planoIndicacao?: {
    tipoValor: 'negociado' | 'fixo'; // Valor negociado com cada cliente ou fixo para todos
    tipoComissao: 'por_dose' | 'por_tratamento'; // Comissão por dose ou por tratamento completo
    // Se por_dose
    valorPorDose?: number; // Valor da comissão por dose (em R$)
    // Se por_tratamento
    tempoTratamentoMeses?: number; // Duração do tratamento em meses
    totalMedicamentoMg?: number; // Total de medicamento por tratamento em mg
    valorComissaoTratamento?: number; // Valor da comissão por tratamento completo (em R$)
  };
  /**
   * Hipóteses salvas no perfil do médico (requisição de exames).
   * Firestore pode ter legado `string[]`; normalizar com `normalizeHipotesesDiagnosticasSalvas`.
   */
  hipotesesDiagnosticasSalvas?: HipoteseDiagnosticaSalva[] | string[];
}

export function normalizeHipotesesDiagnosticasSalvas(raw: unknown): HipoteseDiagnosticaSalva[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === 'string') {
      const texto = item.trim();
      const linha = texto.split('\n')[0].trim();
      const tituloCurto =
        (linha.length > 72 ? `${linha.slice(0, 69)}…` : linha) || `Hipótese ${i + 1}`;
      return { titulo: tituloCurto, texto: texto || tituloCurto };
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const texto = String(o.texto ?? '').trim();
      let titulo = String(o.titulo ?? '').trim();
      if (!titulo && texto) {
        const linha = texto.split('\n')[0].trim();
        titulo = linha.length > 72 ? `${linha.slice(0, 69)}…` : linha;
      }
      if (!titulo) titulo = `Hipótese ${i + 1}`;
      return { titulo: titulo.slice(0, 120), texto: texto || titulo };
    }
    return { titulo: `Hipótese ${i + 1}`, texto: '' };
  });
}

export interface CidadeAtendimento {
  estado: string;
  cidade: string;
}

