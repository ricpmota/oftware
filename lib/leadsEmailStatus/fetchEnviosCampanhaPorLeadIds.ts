import { Firestore } from 'firebase-admin/firestore';
import {
  auditEmailEnviosQuery,
  EMAIL_ENVIOS_AUDIT_SITES,
} from '@/lib/auditoria/emailEnviosAudit';

export const TIPOS_CAMPANHA_LEADS = ['email1', 'email2', 'email3', 'email4', 'email5'] as const;
export type TipoCampanhaLead = (typeof TIPOS_CAMPANHA_LEADS)[number];

const TIPOS_CAMPANHA_SET = new Set<string>(TIPOS_CAMPANHA_LEADS);
/** Firestore permite no máximo 30 valores em `in`. */
export const LEAD_ID_IN_BATCH_SIZE = 30;

export type EnvioCampanhaLead = {
  leadId: string;
  emailTipo: string;
  status: string;
  enviadoEm: Date;
  conversao?: {
    data: Date;
    medicoId?: string;
  };
};

/**
 * Busca envios de campanha (email1–email5) apenas dos leadIds informados.
 * Uma cláusula `in` (leadId); filtro de emailTipo em memória.
 */
export async function fetchEnviosCampanhaPorLeadIds(
  db: Firestore,
  leadIds: string[],
  auditScopeId?: string
): Promise<{ enviosPorLead: Map<string, EnvioCampanhaLead[]>; docsLidos: number }> {
  const enviosPorLead = new Map<string, EnvioCampanhaLead[]>();
  let docsLidos = 0;
  if (leadIds.length === 0) return { enviosPorLead, docsLidos: 0 };

  const batchCount = leadIds.length === 0 ? 0 : Math.ceil(leadIds.length / LEAD_ID_IN_BATCH_SIZE);

  for (let i = 0; i < leadIds.length; i += LEAD_ID_IN_BATCH_SIZE) {
    const batch = leadIds.slice(i, i + LEAD_ID_IN_BATCH_SIZE);
    const batchIndex = Math.floor(i / LEAD_ID_IN_BATCH_SIZE);

    auditEmailEnviosQuery({
      scopeId: auditScopeId,
      siteId: EMAIL_ENVIOS_AUDIT_SITES.LIB_FETCH_ENVIOS_CAMPANHA_BATCH.id,
      surface: 'service',
      queryPattern: 'leadId_in',
      leadIdsCount: batch.length,
      emailTipos: [...TIPOS_CAMPANHA_LEADS],
      batchIndex,
      batchCount,
      note: 'filtro emailTipo em memória após query',
    });

    const snapshot = await db.collection('email_envios').where('leadId', 'in', batch).get();
    docsLidos += snapshot.size;

    auditEmailEnviosQuery({
      scopeId: auditScopeId,
      siteId: EMAIL_ENVIOS_AUDIT_SITES.LIB_FETCH_ENVIOS_CAMPANHA_BATCH.id,
      surface: 'service',
      queryPattern: 'leadId_in',
      leadIdsCount: batch.length,
      docsReturned: snapshot.size,
      batchIndex,
      batchCount,
    });

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const emailTipo = String(data.emailTipo || '');
      if (!TIPOS_CAMPANHA_SET.has(emailTipo)) continue;

      const leadId = String(data.leadId || '');
      if (!leadId) continue;

      const enviadoEm = data.enviadoEm?.toDate?.() ?? new Date(data.enviadoEm);
      const envio: EnvioCampanhaLead = {
        leadId,
        emailTipo,
        status: data.status || 'pendente',
        enviadoEm,
        conversao: data.conversao
          ? {
              data: data.conversao.data?.toDate?.() ?? new Date(data.conversao.data),
              medicoId: data.conversao.medicoId,
            }
          : undefined,
      };

      const list = enviosPorLead.get(leadId) ?? [];
      const idx = list.findIndex((e) => e.emailTipo === emailTipo);
      if (idx >= 0) {
        if (envio.enviadoEm.getTime() > list[idx].enviadoEm.getTime()) {
          list[idx] = envio;
        }
      } else {
        list.push(envio);
      }
      enviosPorLead.set(leadId, list);
    }
  }

  return { enviosPorLead, docsLidos };
}
