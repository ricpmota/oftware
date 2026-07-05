import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
import type { PrescriptionPrintType } from '@/types/prescriptionPrintType';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import { buildReceituarioControleEspecialPacienteContext } from '@/lib/prescricao/receituarioControleEspecialContext';
import type {
  PrepararPrescricaoImpressaoResult,
  PrescricaoFormSnapshot,
} from '@/lib/metaadmin/metaadminPrescricaoPrintPrepare';
import { prepararPrescricaoParaImpressao } from '@/lib/metaadmin/metaadminPrescricaoPrintPrepare';
import {
  runPrescriptionSignedPrint,
  type PrescriptionSignedPrintProgressPhase,
  type PrescriptionSignedPrintResult,
} from '@/lib/signature/runPrescriptionSignedPrint';
import { downloadPrescricaoPdfComoImpressao } from '@/utils/prescricaoPdfDownload';
import { downloadReceituarioControleEspecialPdfComoImpressao } from '@/utils/receituarioControleEspecialPdfDownload';

export type PrescriptionPrintGateState = {
  isRecibo: boolean;
  printType: PrescriptionPrintType;
  unsigned: () => Promise<void>;
  signed: (
    onProgress?: (phase: PrescriptionSignedPrintProgressPhase) => void
  ) => Promise<PrescriptionSignedPrintResult | void>;
};

export async function executarDownloadPrescricaoPorTipo(
  printType: PrescriptionPrintType,
  prep: Extract<PrepararPrescricaoImpressaoResult, { ok: true }>,
  medico: Medico | null,
  paciente: PacienteCompleto
): Promise<void> {
  if (printType === 'controle_especial') {
    const ctx = buildReceituarioControleEspecialPacienteContext(
      paciente,
      prep.pacienteNome,
      prep.pacienteCpf
    );
    await downloadReceituarioControleEspecialPdfComoImpressao(prep.prescricaoParaPdf, medico, ctx);
    return;
  }
  await downloadPrescricaoPdfComoImpressao(prep.prescricaoParaPdf, medico, {
    pacienteNome: prep.pacienteNome,
    pacienteCpf: prep.pacienteCpf,
  });
}

export async function executarAssinaturaPrescricaoPorTipo(
  printType: PrescriptionPrintType,
  prep: Extract<PrepararPrescricaoImpressaoResult, { ok: true }>,
  medico: Medico | null,
  paciente: PacienteCompleto,
  providerConfig: DoctorSignatureProvider | null | undefined,
  onProgress?: (phase: PrescriptionSignedPrintProgressPhase) => void
): Promise<PrescriptionSignedPrintResult | void> {
  const controleEspecialCtx =
    printType === 'controle_especial'
      ? buildReceituarioControleEspecialPacienteContext(paciente, prep.pacienteNome, prep.pacienteCpf)
      : undefined;

  return runPrescriptionSignedPrint({
    patientId: paciente.id,
    prescricao: prep.prescricaoParaPdf,
    medico,
    ctx: { pacienteNome: prep.pacienteNome, pacienteCpf: prep.pacienteCpf },
    providerConfig,
    printType,
    controleEspecialCtx,
    onProgress,
  });
}

export function createPrescriptionPrintGate(args: {
  printType: PrescriptionPrintType;
  isRecibo: boolean;
  paciente: PacienteCompleto;
  prescricaoSelecionada: Prescricao;
  prescricaoEditando: Prescricao | null;
  novaPrescricao: PrescricaoFormSnapshot;
  salvar: () => Promise<{ ok: boolean; prescricaoSalva?: Prescricao | null }>;
  medico: Medico | null;
  providerConfig: DoctorSignatureProvider | null | undefined;
  onPrepMessage?: (message: string) => void;
}): PrescriptionPrintGateState {
  const prepArgs = {
    paciente: args.paciente,
    prescricaoSelecionada: args.prescricaoSelecionada,
    prescricaoEditando: args.prescricaoEditando,
    novaPrescricao: args.novaPrescricao,
    salvar: args.salvar,
  };

  const handlePrepError = (prep: Extract<PrepararPrescricaoImpressaoResult, { ok: false }>) => {
    const msg = prep.message || 'Não foi possível preparar a prescrição para impressão.';
    if (prep.message && args.onPrepMessage) args.onPrepMessage(prep.message);
    throw new Error(msg);
  };

  return {
    isRecibo: args.isRecibo,
    printType: args.printType,
    unsigned: async () => {
      const prep = await prepararPrescricaoParaImpressao(prepArgs);
      if (!prep.ok) handlePrepError(prep);
      await executarDownloadPrescricaoPorTipo(args.printType, prep, args.medico, args.paciente);
    },
    signed: async (onProgress) => {
      const prep = await prepararPrescricaoParaImpressao(prepArgs);
      if (!prep.ok) handlePrepError(prep);
      return executarAssinaturaPrescricaoPorTipo(
        args.printType,
        prep,
        args.medico,
        args.paciente,
        args.providerConfig,
        onProgress
      );
    },
  };
}
