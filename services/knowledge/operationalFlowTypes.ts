export type OperationalProfile = 'paciente' | 'medico' | 'nutricionista' | 'personal' | 'admin';

export type OperationalConfidenceBand = 'strong' | 'moderate';

export type OperationalFlowMatch = {
  matched: boolean;
  /** 0–1; match exige ≥ limiar configurado. */
  confidence: number;
  profile?: OperationalProfile;
  /** Rota principal, ex.: /metaadmin */
  surface?: string;
  objective?: string;
  title: string;
  /** Texto único com passos (para debug/logs). */
  instructions: string;
  /** Passos numeráveis para fallback determinístico. */
  steps: string[];
  sourcePath?: string;
  /** Frase curta para intro do fallback (ex.: "cadastrar o tratamento do paciente"). */
  fallbackLeadIn?: string;
  /** Identificador do fluxo em operationalFlowIndex. */
  flowId?: string;
  /** Faixa derivada da confiança final (≥0,75 forte; 0,55–0,75 moderada). */
  confidenceBand?: OperationalConfidenceBand;
  /** Metadados do resolvedor híbrido / semântico. */
  resolution?: {
    semanticScore?: number;
    heuristicScore?: number;
    strategy: string;
  };
};

export type FindOperationalFlowOptions = {
  surface?: string;
  /** Perfil já inferido pelo produto (ex.: contexto médico). */
  profileHint?: OperationalProfile;
};
