export type ContratoPadraoEditor = {
  uid: string;
  email: string;
  displayName: string;
};

export type ContratoPadraoUpdatedBy = {
  uid: string;
  email: string;
  displayName: string;
};

export type ContratoPadraoMedicoPacienteConfig = {
  template: string;
  editors: ContratoPadraoEditor[];
  updatedAt: string | null;
  updatedBy: ContratoPadraoUpdatedBy | null;
  currentVersionId: string | null;
  currentVersionNumber: number | null;
};

export type ContratoPadraoVersaoResumo = {
  id: string;
  versionNumber: number;
  createdAt: string;
  createdBy: ContratoPadraoUpdatedBy;
  isCurrent: boolean;
  templateLength: number;
};

export type ContratoPadraoVersaoCompleta = ContratoPadraoVersaoResumo & {
  template: string;
};
