import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
import type { PrescriptionPrintLanguage } from '@/types/prescriptionPrintLanguage';
import type { PrescriptionPrintType } from '@/types/prescriptionPrintType';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import { buildReceituarioControleEspecialPacienteContext } from '@/lib/prescricao/receituarioControleEspecialContext';
import type {
  PrepararPrescricaoImpressaoResult,
  PrescricaoFormSnapshot,
} from '@/lib/metaadmin/metaadminPrescricaoPrintPrepare';
import {
  prepararPrescricaoParaImpressao,
  prescricaoFormFromEntity,
} from '@/lib/metaadmin/metaadminPrescricaoPrintPrepare';
import {
  runPrescriptionSignedPrint,
  type PrescriptionSignedPrintProgressPhase,
  type PrescriptionSignedPrintResult,
} from '@/lib/signature/runPrescriptionSignedPrint';
import { requestTraduzirPrescricao } from '@/lib/prescricao/requestTraduzirPrescricao';
import { PrescricaoService } from '@/services/prescricaoService';
import { downloadPrescricaoPdfComoImpressao } from '@/utils/prescricaoPdfDownload';
import { downloadReceituarioControleEspecialPdfComoImpressao } from '@/utils/receituarioControleEspecialPdfDownload';

export type PrescriptionPrintGateState = {
  isRecibo: boolean;
  printType: PrescriptionPrintType;
  language: PrescriptionPrintLanguage;
  unsigned: () => Promise<void>;
  signed: (
    onProgress?: (phase: PrescriptionSignedPrintProgressPhase) => void
  ) => Promise<PrescriptionSignedPrintResult | void>;
};

export async function executarDownloadPrescricaoPorTipo(
  printType: PrescriptionPrintType,
  prep: Extract<PrepararPrescricaoImpressaoResult, { ok: true }>,
  medico: Medico | null,
  paciente: PacienteCompleto,
  language: PrescriptionPrintLanguage = 'pt'
): Promise<void> {
  if (printType === 'controle_especial') {
    const ctx = buildReceituarioControleEspecialPacienteContext(
      paciente,
      prep.pacienteNome,
      prep.pacienteCpf
    );
    await downloadReceituarioControleEspecialPdfComoImpressao(prep.prescricaoParaPdf, medico, ctx, {
      language,
    });
    return;
  }
  await downloadPrescricaoPdfComoImpressao(
    prep.prescricaoParaPdf,
    medico,
    {
      pacienteNome: prep.pacienteNome,
      pacienteCpf: prep.pacienteCpf,
    },
    { language }
  );
}

export async function executarAssinaturaPrescricaoPorTipo(
  printType: PrescriptionPrintType,
  prep: Extract<PrepararPrescricaoImpressaoResult, { ok: true }>,
  medico: Medico | null,
  paciente: PacienteCompleto,
  providerConfig: DoctorSignatureProvider | null | undefined,
  onProgress?: (phase: PrescriptionSignedPrintProgressPhase) => void,
  language: PrescriptionPrintLanguage = 'pt'
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
    language,
    controleEspecialCtx,
    onProgress,
  });
}

async function aplicarIdiomaDaImpressao(
  language: PrescriptionPrintLanguage,
  prep: Extract<PrepararPrescricaoImpressaoResult, { ok: true }>,
  pacienteId: string,
  onProgress?: (phase: PrescriptionSignedPrintProgressPhase) => void,
  onPrescricaoSalvaEmIngles?: (prescricao: Prescricao) => void
): Promise<Extract<PrepararPrescricaoImpressaoResult, { ok: true }>> {
  if (language !== 'en') return prep;

  onProgress?.('translating');
  const traduzido = await requestTraduzirPrescricao({
    patientId: pacienteId,
    texto: {
      nome: prep.prescricaoParaPdf.nome || '',
      descricao: prep.prescricaoParaPdf.descricao || '',
      observacoes: prep.prescricaoParaPdf.observacoes || '',
      itens: prep.prescricaoParaPdf.itens || [],
    },
  });

  const agora = new Date();
  let prescricaoEn: Prescricao = {
    ...prep.prescricaoParaPdf,
    nome: traduzido.nome,
    descricao: traduzido.descricao,
    observacoes: traduzido.observacoes,
    itens: traduzido.itens,
    atualizadoEm: agora,
  };

  const id = prescricaoEn.id;
  const atualizaCopiaDoPaciente = Boolean(
    id && id !== 'temp-new' && prescricaoEn.pacienteId === pacienteId && !prescricaoEn.isTemplate
  );

  if (atualizaCopiaDoPaciente) {
    await PrescricaoService.createOrUpdatePrescricao(prescricaoEn);
  } else {
    const { id: _idOmitido, ...semId } = prescricaoEn;
    const novoId = await PrescricaoService.createOrUpdatePrescricao({
      ...semId,
      pacienteId,
      pacienteNome: prep.pacienteNome,
      isTemplate: false,
      criadoEm: agora,
      atualizadoEm: agora,
    });
    prescricaoEn = {
      ...semId,
      id: novoId,
      pacienteId,
      pacienteNome: prep.pacienteNome,
      isTemplate: false,
      criadoEm: agora,
      atualizadoEm: agora,
    };
  }

  onPrescricaoSalvaEmIngles?.(prescricaoEn);

  return {
    ...prep,
    prescricaoParaPdf: prescricaoEn,
    novaPrescricaoParaPdf: prescricaoFormFromEntity(prescricaoEn),
  };
}

export function createPrescriptionPrintGate(args: {
  printType: PrescriptionPrintType;
  language?: PrescriptionPrintLanguage;
  isRecibo: boolean;
  paciente: PacienteCompleto;
  prescricaoSelecionada: Prescricao;
  prescricaoEditando: Prescricao | null;
  novaPrescricao: PrescricaoFormSnapshot;
  salvar: () => Promise<{ ok: boolean; prescricaoSalva?: Prescricao | null }>;
  medico: Medico | null;
  providerConfig: DoctorSignatureProvider | null | undefined;
  onPrepMessage?: (message: string) => void;
  onPrescricaoSalvaEmIngles?: (prescricao: Prescricao) => void;
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

  const language = args.language ?? 'pt';

  return {
    isRecibo: args.isRecibo,
    printType: args.printType,
    language,
    unsigned: async () => {
      const prep = await prepararPrescricaoParaImpressao(prepArgs);
      if (!prep.ok) handlePrepError(prep);
      const pronto = await aplicarIdiomaDaImpressao(
        language,
        prep,
        args.paciente.id,
        undefined,
        args.onPrescricaoSalvaEmIngles
      );
      await executarDownloadPrescricaoPorTipo(args.printType, pronto, args.medico, args.paciente, language);
    },
    signed: async (onProgress) => {
      const prep = await prepararPrescricaoParaImpressao(prepArgs);
      if (!prep.ok) handlePrepError(prep);
      const pronto = await aplicarIdiomaDaImpressao(
        language,
        prep,
        args.paciente.id,
        onProgress,
        args.onPrescricaoSalvaEmIngles
      );
      return executarAssinaturaPrescricaoPorTipo(
        args.printType,
        pronto,
        args.medico,
        args.paciente,
        args.providerConfig,
        onProgress,
        language
      );
    },
  };
}
