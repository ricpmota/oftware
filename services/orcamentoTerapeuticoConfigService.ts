import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  mapDescontosVolumeMg,
  mapDosesMensais,
  mapOrcamentoTerapeuticoConfigFromFirestore,
  ORCAMENTO_TERAPEUTICO_CONFIG_DOC_ID,
} from '@/lib/metaadmin/orcamentoTerapeuticoConfigMap';
import type {
  OrcamentoTerapeuticoConfig,
  OrcamentoTerapeuticoConfigInput,
} from '@/types/orcamentoTerapeuticoConfig';

const DOC_ID = ORCAMENTO_TERAPEUTICO_CONFIG_DOC_ID;

function configDocRef(medicoId: string) {
  return doc(db, 'medicos', medicoId, 'configuracoes', DOC_ID);
}

export class OrcamentoTerapeuticoConfigService {
  static async getByMedico(medicoId: string): Promise<OrcamentoTerapeuticoConfig | null> {
    if (!medicoId?.trim()) return null;
    const snap = await getDoc(configDocRef(medicoId));
    if (!snap.exists()) return null;
    return mapOrcamentoTerapeuticoConfigFromFirestore(medicoId, snap.data() as Record<string, unknown>);
  }

  static async save(
    medicoId: string,
    input: OrcamentoTerapeuticoConfigInput,
    options?: { isNew?: boolean }
  ): Promise<OrcamentoTerapeuticoConfig> {
    if (!medicoId?.trim()) {
      throw new Error('ID do médico é obrigatório para salvar a configuração.');
    }

    const ref = configDocRef(medicoId);
    const existing = options?.isNew ? null : await getDoc(ref);

    const payload = {
      medicoId,
      valorPorMg: Math.max(0, input.valorPorMg),
      valorPorKitAplicacao: Math.max(0, input.valorPorKitAplicacao),
      valorPorConsulta: Math.max(0, input.valorPorConsulta),
      valorPorBioimpedancia: Math.max(0, input.valorPorBioimpedancia),
      valorPorExame: Math.max(0, input.valorPorExame),
      outrosCustosPadrao: Math.max(0, input.outrosCustosPadrao),
      margemPadraoPercentual: 0,
      descontoMaximo: Math.max(0, input.descontoMaximo),
      tipoDescontoMaximo: input.tipoDescontoMaximo,
      consultasPorMesPadrao: Math.max(0, input.consultasPorMesPadrao),
      bioimpedanciasPorMesPadrao: Math.max(0, input.bioimpedanciasPorMesPadrao),
      examesPorPlanoPadrao: Math.max(0, input.examesPorPlanoPadrao),
      descontosPorVolumeMg: mapDescontosVolumeMg(input.descontosPorVolumeMg),
      doseInicialMensalMg: Math.max(0, input.doseInicialMensalMg),
      aplicacoesMensais: Math.max(1, Math.round(input.aplicacoesMensais)),
      dosesMensaisDisponiveisMg: mapDosesMensais(input.dosesMensaisDisponiveisMg),
      descontoPlanoTrimestralPercentual: Math.max(0, input.descontoPlanoTrimestralPercentual),
      descontoPlanoSemestralPercentual: Math.max(0, input.descontoPlanoSemestralPercentual),
      updatedAt: serverTimestamp(),
      ...(existing?.exists() ? {} : { createdAt: serverTimestamp() }),
    };

    await setDoc(ref, payload, { merge: true });

    const saved = await getDoc(ref);
    return mapOrcamentoTerapeuticoConfigFromFirestore(medicoId, saved.data() as Record<string, unknown>);
  }
}
