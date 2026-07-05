import { buildResolvedPipelineStages } from '@/lib/crm/resolveCrmPipelineStages';
import { isDefaultStageKey } from '@/lib/crm/leadStageKey';
import { CrmPipelineStageService } from '@/services/crmPipelineStageService';
import { LeadMedicoService } from '@/services/leadMedicoService';
import type { LeadMedico, LeadMedicoStatus } from '@/types/leadMedico';

type Params = {
  medicoId: string;
  medicoNome?: string;
  pacienteId: string;
  email: string;
  name: string;
  telefone?: string;
  atualizadoPor?: string;
};

/**
 * Cria lead no primeiro estágio do pipeline CRM ao cadastrar paciente manualmente no metaadmin.
 * Se já existir lead para o mesmo e-mail/médico, retorna o id existente sem duplicar.
 */
export async function createLeadFromPacienteCadastro(params: Params): Promise<string | null> {
  const { medicoId, medicoNome, pacienteId, email, name, telefone, atualizadoPor } = params;

  const existing = await LeadMedicoService.findLeadByEmailAndMedico(medicoId, email);
  if (existing) return existing.id;

  const dbStages = await CrmPipelineStageService.getCrmPipelineStages(medicoId);
  const resolved = buildResolvedPipelineStages(dbStages);
  const firstStageKey = resolved[0]?.stageKey ?? 'nao_qualificado';
  const isDefaultFirst = isDefaultStageKey(firstStageKey);

  const novoLead: Omit<LeadMedico, 'id'> = {
    uid: pacienteId,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    telefone: telefone?.trim() || undefined,
    medicoId,
    status: (isDefaultFirst ? firstStageKey : 'nao_qualificado') as LeadMedicoStatus,
    crmStageKey: isDefaultFirst ? undefined : firstStageKey,
    dataStatus: new Date(),
    createdAt: new Date(),
    emailVerified: false,
    atualizadoPor,
    referral: {
      type: 'medico',
      sourceId: medicoId,
      sourceName: medicoNome,
      capturedAt: new Date(),
    },
  };

  return LeadMedicoService.createOrUpdateLead(novoLead);
}
