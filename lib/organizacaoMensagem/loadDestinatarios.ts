/**
 * Destinatários da Comunicação — regras por papel (sempre por ID de perfil):
 *
 * Médico:
 *  - médicos da mesma organização (sem vínculo entre médicos)
 *  - seus pacientes
 *  - nutricionistas em medicos.nutricionistaVinculadoIds
 *  - psiquiatras em medicos.psiquiatraVinculadoIds
 *  - personais em medicos.personalTrainerVinculadoIds
 *
 * Nutricionista:
 *  - médicos em nutricionistas.medicoVinculadoIds
 *  - pacientes com vínculo ativo (paciente_nutricionista)
 *  - personais em pacientes_completos.personalTrainerVinculadoIds (+ vínculos ativos)
 *  - psiquiatras com paciente_psiquiatra ativo nos pacientes do nutri
 *  - nutricionistas com o mesmo organizationId
 *
 * Personal:
 *  - médicos em personal_trainers.medicoVinculadoIds
 *  - pacientes com vínculo ativo (paciente_personal_trainer)
 *  - nutricionistas em pacientes_completos.nutricionistaVinculadoIds (+ vínculos ativos)
 *  - psiquiatras com paciente_psiquiatra ativo nos pacientes do personal
 *  - personais com o mesmo organizationId
 *
 * Psiquiatra:
 *  - médicos em psiquiatras.medicoVinculadoIds
 *  - pacientes com ACL ativa (paciente_psiquiatra) — NÃO medicoVinculadoIds
 *  - nutri/personal dos pacientes com ACL ativa
 *  - psiquiatras com o mesmo organizationId
 *
 * Paciente:
 *  - médico / nutri / personal / psiquiatra com ACL ativa
 *
 * Fotos: médico/nutri/personal/psiquiatra usam fotoPerfilUrl (Meu Perfil), não photoURL do Gmail.
 */

import { doc, getDoc, getDocFromServer, getDocs, getDocsFromServer, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MedicoService } from '@/services/medicoService';
import { NutricionistaService } from '@/services/nutricionistaService';
import { PersonalTrainerService } from '@/services/personalTrainerService';
import { PacientePersonalTrainerService } from '@/services/pacientePersonalTrainerService';
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import { PacientePsiquiatraService } from '@/services/pacientePsiquiatraService';
import { PsiquiatraService, formatPsiquiatraRegistroAdmin } from '@/services/psiquiatraService';
import { PacienteService } from '@/services/pacienteService';
import { isMetodoImagensAtivo } from '@/lib/metodo/metodoImagens';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import {
  pacienteSyntheticUserId,
  type ComunicacaoDestinatario,
  type ComunicacaoParticipante,
  type ComunicacaoParticipanteRole,
} from '@/lib/organizacaoMensagem/types';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico } from '@/types/medico';
import type { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import type { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import type { PsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import { COL_PACIENTE_NUTRICIONISTA, COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { COL_PACIENTE_PERSONAL_TRAINER, COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import { COL_PSIQUIATRAS } from '@/features/metaPsi/metaPsi.constants';

/** Prefere servidor (evita cache local desatualizado sem personalTrainerVinculadoIds). */
async function getDocFresh(ref: ReturnType<typeof doc>) {
  try {
    return await getDocFromServer(ref);
  } catch {
    return getDoc(ref);
  }
}

async function getDocsFresh(q: ReturnType<typeof query>) {
  try {
    return await getDocsFromServer(q);
  } catch {
    return getDocs(q);
  }
}
type OrgTeamFields = {
  organizationId?: string | null;
  metodoImagensAtivo?: boolean | null;
  status?: string | null;
};

export function isMedicoAptoParaComunicacao(
  member: OrgTeamFields,
  organizationId: OrganizationId
): boolean {
  if (member.status && String(member.status) !== 'ativo') return false;
  if (organizationId === METODO_ORGANIZATION_ID) {
    return isMetodoImagensAtivo(member);
  }
  return (member.organizationId || '').trim() === organizationId;
}

/**
 * Peers (nutri↔nutri / personal↔personal): filtra pelo organizationId do cadastro.
 * Diferente de médicos Método (que usam metodoImagensAtivo).
 */
export function isProfissionalDaOrganizacao(
  member: OrgTeamFields,
  organizationId: OrganizationId | string
): boolean {
  const org = String(organizationId || '').trim();
  if (!org) return false;
  if (member.status && String(member.status) !== 'ativo') return false;
  return (member.organizationId || '').trim() === org;
}

function resolveOrgIdFromMember(
  member: { organizationId?: string | null } | null | undefined,
  fallback?: OrganizationId | string | null
): OrganizationId {
  const fromMember = String(member?.organizationId || '').trim();
  if (fromMember) return fromMember as OrganizationId;
  const fromFallback = String(fallback || '').trim();
  if (fromFallback) return fromFallback as OrganizationId;
  return METODO_ORGANIZATION_ID;
}

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = String(raw || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function pacienteToDest(p: PacienteCompleto): ComunicacaoDestinatario | null {
  if (!p?.id) return null;
  const email =
    String(p.email || (p.dadosIdentificacao as { email?: string } | undefined)?.email || '').trim();
  const nome =
    p.nome ||
    (p.dadosIdentificacao as { nomeCompleto?: string } | undefined)?.nomeCompleto ||
    'Paciente';
  return {
    userId: p.userId?.trim() || pacienteSyntheticUserId(p.id),
    role: 'paciente',
    profileId: p.id,
    nome,
    email,
    fotoUrl: null,
    subtitle: email || null,
    grupo: 'pacientes',
  };
}

function medicoToDest(m: Medico, selfProfileId?: string): ComunicacaoDestinatario | null {
  if (!m?.id) return null;
  if (selfProfileId && m.id === selfProfileId) return null;
  const userId = String(m.userId || m.id).trim();
  if (!userId) return null;
  const crm = m.crm?.numero
    ? `CRM ${m.crm.estado || ''} ${m.crm.numero}`.replace(/\s+/g, ' ').trim()
    : null;
  return {
    userId,
    role: 'medico',
    profileId: m.id,
    nome: `${m.genero === 'F' ? 'Dra.' : 'Dr.'} ${m.nome || 'Médico'}`.trim(),
    email: m.email || '',
    fotoUrl: m.fotoPerfilUrl || null,
    subtitle: crm,
    grupo: 'medicos',
  };
}

function nutriToDest(
  n: Pick<NutricionistaDoc, 'id' | 'userId' | 'nome' | 'email' | 'registroNumero' | 'fotoPerfilUrl'>,
  selfProfileId?: string
): ComunicacaoDestinatario | null {
  const profileId = String(n?.id || n?.userId || '').trim();
  const userId = String(n?.userId || n?.id || '').trim();
  if (!profileId || !userId) return null;
  if (selfProfileId && profileId === selfProfileId) return null;
  return {
    userId,
    role: 'nutricionista',
    profileId,
    nome: n.nome || n.email || profileId || 'Nutricionista',
    email: n.email || '',
    fotoUrl: n.fotoPerfilUrl || null,
    subtitle: n.registroNumero ? `CRN ${n.registroNumero}` : null,
    grupo: 'nutricionistas',
  };
}

function personalToDest(
  p: Pick<PersonalTrainerDoc, 'id' | 'userId' | 'nome' | 'email' | 'registroNumero' | 'fotoPerfilUrl'>,
  selfProfileId?: string
): ComunicacaoDestinatario | null {
  const profileId = String(p?.id || p?.userId || '').trim();
  const userId = String(p?.userId || p?.id || '').trim();
  if (!profileId || !userId) return null;
  if (selfProfileId && profileId === selfProfileId) return null;
  return {
    userId,
    role: 'personal',
    profileId,
    nome: p.nome || p.email || profileId || 'Personal',
    email: p.email || '',
    fotoUrl: p.fotoPerfilUrl || null,
    subtitle: p.registroNumero ? `CREF ${p.registroNumero}` : null,
    grupo: 'personais',
  };
}

function psiToDest(
  p: Pick<
    PsiquiatraDoc,
    'id' | 'userId' | 'nome' | 'email' | 'registroNumero' | 'crmUf' | 'fotoPerfilUrl' | 'genero'
  >,
  selfProfileId?: string
): ComunicacaoDestinatario | null {
  const profileId = String(p?.id || p?.userId || '').trim();
  const userId = String(p?.userId || p?.id || '').trim();
  if (!profileId || !userId) return null;
  if (selfProfileId && (profileId === selfProfileId || userId === selfProfileId)) return null;
  const crm = formatPsiquiatraRegistroAdmin(p);
  const prefix =
    p.genero === 'F' ? 'Dra.' : p.genero === 'M' ? 'Dr.' : '';
  const nomeBase = String(p.nome || p.email || profileId || 'Psiquiatra').trim();
  return {
    userId,
    role: 'psiquiatra',
    profileId,
    nome: prefix ? `${prefix} ${nomeBase}`.trim() : nomeBase,
    email: p.email || '',
    fotoUrl: p.fotoPerfilUrl || null,
    subtitle: crm !== 'N/A' ? `CRM ${crm}` : null,
    grupo: 'psiquiatras',
  };
}

async function resolvePsiById(id: string): Promise<PsiquiatraDoc | null> {
  const key = String(id || '').trim();
  if (!key) return null;
  const byUser = await PsiquiatraService.getPsiquiatraByUserId(key).catch(() => null);
  if (byUser) return byUser;
  try {
    const snap = await getDocFresh(doc(db, COL_PSIQUIATRAS, key));
    if (!snap.exists()) return null;
    return PsiquiatraService.getPsiquiatraByUserId(snap.id).catch(() => null);
  } catch {
    return null;
  }
}

async function resolvePsiDestById(id: string): Promise<ComunicacaoDestinatario | null> {
  const psi = await resolvePsiById(id);
  if (psi) return psiToDest(psi);
  const key = String(id || '').trim();
  if (!key) return null;
  return {
    userId: key,
    role: 'psiquiatra',
    profileId: key,
    nome: key,
    email: '',
    fotoUrl: null,
    subtitle: null,
    grupo: 'psiquiatras',
  };
}

/** SoT: paciente_psiquiatra ativo (não usa só o mirror). */
async function listPsiquiatrasAtivosDoPaciente(pacienteId: string): Promise<string[]> {
  const pid = String(pacienteId || '').trim();
  if (!pid) return [];
  try {
    const vinculos = await PacientePsiquiatraService.listActiveVinculosByPaciente(pid);
    return uniqueIds(vinculos.map((v) => v.psiquiatraId));
  } catch {
    return [];
  }
}

async function resolveMedicoById(id: string): Promise<Medico | null> {
  const key = String(id || '').trim();
  if (!key) return null;

  // Se este ID é doc de personal/nutri/psiquiatra, nunca classificar como médico
  const [asPersonal, asNutri, asPsi] = await Promise.all([
    PersonalTrainerService.getPersonalTrainerByUserId(key).catch(() => null),
    NutricionistaService.getNutricionistaByUserId(key).catch(() => null),
    PsiquiatraService.getPsiquiatraByUserId(key).catch(() => null),
  ]);
  if (asPersonal) return null;
  if (asNutri) return null;
  if (asPsi) return null;

  const byDoc = await MedicoService.getMedicoById(key).catch(() => null);
  if (byDoc) return byDoc;

  return MedicoService.getMedicoByUserId(key).catch(() => null);
}

/**
 * Garante papéis consistentes; IDs de personal/nutri/psiquiatra não ficam como médico.
 */
function finalizeDestinatariosPorPapel(
  list: ComunicacaoDestinatario[],
  personalKeys: Set<string>,
  nutriKeys: Set<string>,
  psiKeys: Set<string> = new Set()
): ComunicacaoDestinatario[] {
  const pKeys = personalKeys instanceof Set ? personalKeys : new Set<string>();
  const nKeys = nutriKeys instanceof Set ? nutriKeys : new Set<string>();
  const zKeys = psiKeys instanceof Set ? psiKeys : new Set<string>();
  const remapped: ComunicacaoDestinatario[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    if (!raw?.profileId && !raw?.userId) continue;
    const keys = uniqueIds([raw.profileId, raw.userId]);
    const hitPersonal = keys.some((k) => pKeys.has(k));
    const hitNutri = keys.some((k) => nKeys.has(k));
    const hitPsi = keys.some((k) => zKeys.has(k));

    if (hitPersonal) {
      remapped.push({
        ...raw,
        role: 'personal',
        grupo: 'personais',
        nome:
          String(raw.nome || '')
            .replace(/^(Dr\.|Dra\.)\s+/i, '')
            .trim() || raw.nome,
        subtitle:
          raw.role === 'personal'
            ? raw.subtitle
            : raw.subtitle && /cref/i.test(String(raw.subtitle))
              ? raw.subtitle
              : null,
      });
      continue;
    }
    if (hitNutri) {
      remapped.push({
        ...raw,
        role: 'nutricionista',
        grupo: 'nutricionistas',
        subtitle:
          raw.role === 'nutricionista'
            ? raw.subtitle
            : raw.subtitle && /crn/i.test(String(raw.subtitle))
              ? raw.subtitle
              : null,
      });
      continue;
    }
    if (hitPsi) {
      remapped.push({
        ...raw,
        role: 'psiquiatra',
        grupo: 'psiquiatras',
        subtitle:
          raw.role === 'psiquiatra'
            ? raw.subtitle
            : raw.subtitle && /crm/i.test(String(raw.subtitle))
              ? raw.subtitle
              : null,
      });
      continue;
    }
    if (raw.role === 'medico' || raw.grupo === 'medicos') {
      remapped.push({ ...raw, role: 'medico', grupo: 'medicos' });
      continue;
    }
    remapped.push(raw);
  }

  const byKey = new Map<string, ComunicacaoDestinatario>();
  for (const d of remapped) {
    byKey.set(`${d.role}:${d.profileId}`, d);
  }
  const profissionaisOutros = new Set<string>();
  for (const d of byKey.values()) {
    if (d.role === 'personal' || d.role === 'nutricionista' || d.role === 'psiquiatra') {
      for (const k of uniqueIds([d.profileId, d.userId])) profissionaisOutros.add(k);
    }
  }
  const out: ComunicacaoDestinatario[] = [];
  for (const d of byKey.values()) {
    if (d.role === 'medico') {
      if (profissionaisOutros.has(d.profileId) || profissionaisOutros.has(d.userId)) continue;
      if (pKeys.has(d.profileId) || pKeys.has(d.userId)) continue;
      if (nKeys.has(d.profileId) || nKeys.has(d.userId)) continue;
      if (zKeys.has(d.profileId) || zKeys.has(d.userId)) continue;
    }
    out.push(d);
  }
  return out.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
}

async function resolveNutriById(id: string): Promise<NutricionistaDoc | null> {
  const key = String(id || '').trim();
  if (!key) return null;
  return NutricionistaService.getNutricionistaByUserId(key).catch(() => null);
}

async function resolvePersonalById(id: string): Promise<PersonalTrainerDoc | null> {
  const key = String(id || '').trim();
  if (!key) return null;
  return PersonalTrainerService.getPersonalTrainerByUserId(key).catch(() => null);
}

async function resolvePacienteById(id: string): Promise<PacienteCompleto | null> {
  const key = String(id || '').trim();
  if (!key) return null;
  return PacienteService.getPacienteById(key).catch(() => null);
}

function makePush() {
  const out: ComunicacaoDestinatario[] = [];
  const seen = new Set<string>();
  const push = (d: ComunicacaoDestinatario | null) => {
    if (!d) return;
    const key = `${d.role}:${d.profileId}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(d);
  };
  return { out, push, seen };
}

/** Extrai ID de string/number/ref/{id}/objeto com *Id. */
function coerceFirestoreId(item: unknown): string {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
    const s = String(item).trim();
    return s === '[object Object]' ? '' : s;
  }
  if (typeof item === 'object') {
    const o = item as Record<string, unknown>;
    // DocumentReference e mapas { id } / { personalTrainerId } / etc.
    const candidates = [
      o.id,
      o.personalTrainerId,
      o.personalId,
      o.personalTrainerUserId,
      o.nutricionistaId,
      o.userId,
      o.uid,
      o.value,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' || typeof c === 'number') {
        const s = String(c).trim();
        if (s) return s;
      }
    }
    if (typeof o.path === 'string') {
      const parts = String(o.path).split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }
  }
  return '';
}

/** Aceita array, mapa {0: id} ou string "id1,id2". */
function extractIdList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return uniqueIds(value.map((x) => coerceFirestoreId(x)));
  }
  if (typeof value === 'string') {
    return uniqueIds(value.split(/[,;\s]+/).map((s) => s.trim()));
  }
  if (typeof value === 'object') {
    return uniqueIds(Object.values(value as Record<string, unknown>).map((x) => coerceFirestoreId(x)));
  }
  return [];
}

/** Lê array de IDs de um doc, aceitando variações de nome de campo. */
function readIdArrayFromDoc(
  data: Record<string, unknown> | null | undefined,
  ...fieldNames: string[]
): string[] {
  if (!data || typeof data !== 'object') return [];
  const wanted = new Set(fieldNames.map((f) => f.toLowerCase()));
  const out: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (!wanted.has(String(key).toLowerCase())) continue;
    out.push(...extractIdList(value));
  }
  return uniqueIds(out);
}

async function resolveNutriDestById(id: string): Promise<ComunicacaoDestinatario | null> {
  const key = String(id || '').trim();
  if (!key) return null;
  const full = await resolveNutriById(key);
  if (full) return nutriToDest(full);
  // Sem stub genérico "Nutricionista" — mostra o próprio ID
  return {
    userId: key,
    role: 'nutricionista',
    profileId: key,
    nome: key,
    email: '',
    fotoUrl: null,
    subtitle: 'ID vinculado',
    grupo: 'nutricionistas',
  };
}

async function resolvePersonalDestById(id: string): Promise<ComunicacaoDestinatario | null> {
  const key = String(id || '').trim();
  if (!key) return null;
  const full = await resolvePersonalById(key);
  if (full) return personalToDest(full);
  return {
    userId: key,
    role: 'personal',
    profileId: key,
    nome: key,
    email: '',
    fotoUrl: null,
    subtitle: 'ID vinculado',
    grupo: 'personais',
  };
}

/** Personais ativos do paciente (com fallback sem índice composto). */
async function listPersonaisAtivosDoPaciente(pacienteId: string): Promise<string[]> {
  const pid = String(pacienteId || '').trim();
  if (!pid) return [];
  try {
    const vs = await PacientePersonalTrainerService.listActiveVinculosByPaciente(pid);
    const ids = uniqueIds((vs || []).map((v) => v.personalTrainerId));
    if (ids.length > 0) return ids;
  } catch {
    /* fallback abaixo */
  }
  try {
    const snap = await getDocs(
      query(collection(db, COL_PACIENTE_PERSONAL_TRAINER), where('pacienteId', '==', pid))
    );
    return uniqueIds(
      snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          const status = String(data.status || 'ativo').toLowerCase();
          if (status && status !== 'ativo') return '';
          return coerceFirestoreId(data.personalTrainerId);
        })
        .filter(Boolean)
    );
  } catch (e) {
    console.warn('[comunicacao] listPersonaisAtivosDoPaciente', pid, e);
    return [];
  }
}

/** Nutricionistas ativos do paciente (com fallback sem índice composto). */
async function listNutrisAtivosDoPaciente(pacienteId: string): Promise<string[]> {
  const pid = String(pacienteId || '').trim();
  if (!pid) return [];
  try {
    const vs = await PacienteNutricionistaService.listActiveVinculosByPaciente(pid);
    const ids = uniqueIds((vs || []).map((v) => v.nutricionistaId));
    if (ids.length > 0) return ids;
  } catch {
    /* fallback abaixo */
  }
  try {
    const snap = await getDocs(
      query(collection(db, COL_PACIENTE_NUTRICIONISTA), where('pacienteId', '==', pid))
    );
    return uniqueIds(
      snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          const status = String(data.status || 'ativo').toLowerCase();
          if (status && status !== 'ativo') return '';
          return coerceFirestoreId(data.nutricionistaId);
        })
        .filter(Boolean)
    );
  } catch (e) {
    console.warn('[comunicacao] listNutrisAtivosDoPaciente', pid, e);
    return [];
  }
}

/** Resolve médico só pelo doc — sem filtrar por perfil nutri/personal no mesmo UID. */
async function resolveMedicoDestById(id: string): Promise<ComunicacaoDestinatario | null> {
  const key = String(id || '').trim();
  if (!key) return null;
  const byDoc = await MedicoService.getMedicoById(key).catch(() => null);
  const m = byDoc || (await MedicoService.getMedicoByUserId(key).catch(() => null));
  if (m) return medicoToDest(m);
  return {
    userId: key,
    role: 'medico',
    profileId: key,
    nome: 'Médico',
    email: '',
    fotoUrl: null,
    subtitle: null,
    grupo: 'medicos',
  };
}

/** Fonte: nutricionistas/{id}.medicoVinculadoIds */
async function loadMedicoVinculadoIdsDoNutri(
  selfKeys: string[],
  paramsIds?: string[]
): Promise<string[]> {
  const sources: Record<string, unknown>[] = [];
  for (const key of selfKeys) {
    const fresh = await NutricionistaService.getNutricionistaByUserId(key).catch(() => null);
    if (fresh) sources.push(fresh as unknown as Record<string, unknown>);
  }
  return uniqueIds([
    ...sources.flatMap((d) =>
      readIdArrayFromDoc(
        d,
        'medicoVinculadoIds',
        'medicosVinculadoIds',
        'medicoVinculadosIds',
        'medicosVinculadosIds'
      )
    ),
    ...(paramsIds || []),
  ]);
}

/** Fonte: personal_trainers/{id}.medicoVinculadoIds */
async function loadMedicoVinculadoIdsDoPersonal(
  selfKeys: string[],
  paramsIds?: string[]
): Promise<string[]> {
  const sources: Record<string, unknown>[] = [];
  for (const key of selfKeys) {
    const fresh = await PersonalTrainerService.getPersonalTrainerByUserId(key).catch(() => null);
    if (fresh) sources.push(fresh as unknown as Record<string, unknown>);
  }
  return uniqueIds([
    ...sources.flatMap((d) =>
      readIdArrayFromDoc(
        d,
        'medicoVinculadoIds',
        'medicosVinculadoIds',
        'medicoVinculadosIds',
        'medicosVinculadosIds'
      )
    ),
    ...(paramsIds || []),
  ]);
}

function findProfileInCatalog<T extends { id?: string; userId?: string }>(
  catalog: T[] | null | undefined,
  ...keys: Array<string | null | undefined>
): T | undefined {
  const set = new Set(uniqueIds(keys));
  if (set.size === 0) return undefined;
  return (catalog || []).find(
    (p) => set.has(String(p?.id || '').trim()) || set.has(String(p?.userId || '').trim())
  );
}

/**
 * METAADMIN — destinatários da Comunicação (reescrito do zero).
 *
 * Fonte de vínculo nutri/personal (única):
 *   medicos/{medicoId}.nutricionistaVinculadoIds
 *   medicos/{medicoId}.personalTrainerVinculadoIds
 *
 * Fluxo:
 *  1) pacientes do médico
 *  2) nutris/personais pelos IDs dos arrays acima
 *  3) médicos aptos da organização
 */
export async function loadDestinatariosMetaadmin(params: {
  medico: Medico;
  pacientes: PacienteCompleto[];
  organizationId?: OrganizationId | string;
  /** @deprecated não usado — vínculos vêm só do doc do médico */
  nutricionistasVinculados?: NutricionistaDoc[];
  /** @deprecated não usado — vínculos vêm só do doc do médico */
  personalTrainersVinculados?: PersonalTrainerDoc[];
  medicoAuthUid?: string | null;
}): Promise<ComunicacaoDestinatario[]> {
  const orgId = (params.organizationId || METODO_ORGANIZATION_ID) as OrganizationId;
  const { out, push } = makePush();
  const medico = params.medico;

  // --- 1) Pacientes ---
  for (const p of params.pacientes || []) {
    push(pacienteToDest(p));
  }

  // --- 2) Ler TODOS os docs possíveis do médico e unir os arrays ---
  const medicoKeys = uniqueIds([medico.id, medico.userId, params.medicoAuthUid]);
  const nutriIdsAcc: string[] = [];
  const personalIdsAcc: string[] = [];
  const psiIdsAcc: string[] = [];
  const docsLidos: Array<{
    id: string;
    personalTrainerVinculadoIds: string[];
    nutricionistaVinculadoIds: string[];
    psiquiatraVinculadoIds: string[];
    allPersonalLikeKeys: string[];
  }> = [];
  const seenDocIds = new Set<string>();

  const ingestMedicoData = (docId: string, data: Record<string, unknown>) => {
    if (seenDocIds.has(docId)) return;
    seenDocIds.add(docId);

    // Campo canônico (exato) — prioridade
    const personalExact = extractIdList(data.personalTrainerVinculadoIds);
    const nutriExact = extractIdList(data.nutricionistaVinculadoIds);
    const psiExact = extractIdList(data.psiquiatraVinculadoIds);

    if (data.personalTrainerVinculadoIds != null) {
      console.info('[metaadmin/comunicacao] raw personalTrainerVinculadoIds', {
        docId,
        typeof: typeof data.personalTrainerVinculadoIds,
        isArray: Array.isArray(data.personalTrainerVinculadoIds),
        extracted: personalExact,
      });
    }

    // Aliases + qualquer chave personal*/nutri*/psi* + vincul*
    const personalScan: string[] = [...personalExact];
    const nutriScan: string[] = [...nutriExact];
    const psiScan: string[] = [...psiExact];
    const allPersonalLikeKeys: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      const kl = key.toLowerCase().replace(/[_-]/g, '');
      const ids = extractIdList(value);
      if (ids.length === 0 && value != null && (kl.includes('personal') || kl.includes('trainer'))) {
        allPersonalLikeKeys.push(`${key}:${typeof value}`);
      }
      if (
        (kl.includes('personal') || kl.includes('treinador') || kl.includes('trainer')) &&
        kl.includes('vincul')
      ) {
        personalScan.push(...ids);
        allPersonalLikeKeys.push(`${key}(${ids.length})`);
      }
      if (kl.includes('nutri') && kl.includes('vincul')) {
        nutriScan.push(...ids);
      }
      if (kl.includes('psiquiatra') && kl.includes('vincul')) {
        psiScan.push(...ids);
      }
    }

    const personalIdsDoc = uniqueIds(personalScan);
    const nutriIdsDoc = uniqueIds(nutriScan);
    const psiIdsDoc = uniqueIds(psiScan);
    personalIdsAcc.push(...personalIdsDoc);
    nutriIdsAcc.push(...nutriIdsDoc);
    psiIdsAcc.push(...psiIdsDoc);
    docsLidos.push({
      id: docId,
      personalTrainerVinculadoIds: personalIdsDoc,
      nutricionistaVinculadoIds: nutriIdsDoc,
      psiquiatraVinculadoIds: psiIdsDoc,
      allPersonalLikeKeys,
    });
  };

  for (const key of medicoKeys) {
    try {
      const snap = await getDocFresh(doc(db, 'medicos', key));
      if (snap.exists()) ingestMedicoData(snap.id, snap.data() as Record<string, unknown>);
    } catch (e) {
      console.warn('[metaadmin/comunicacao] getDoc medicos/', key, e);
    }
    // Doc id pode diferir do auth uid — busca por userId
    try {
      const qSnap = await getDocsFresh(query(collection(db, 'medicos'), where('userId', '==', key)));
      for (const d of qSnap.docs) {
        ingestMedicoData(d.id, d.data() as Record<string, unknown>);
      }
    } catch (e) {
      console.warn('[metaadmin/comunicacao] query medicos userId==', key, e);
    }
  }

  // Também lê do objeto em memória (estado do metaadmin), se trouxer o array
  ingestMedicoData(`state:${medico.id || 'medico'}`, {
    ...(medico as unknown as Record<string, unknown>),
    personalTrainerVinculadoIds: (medico as Medico & { personalTrainerVinculadoIds?: unknown })
      .personalTrainerVinculadoIds,
    nutricionistaVinculadoIds: (medico as Medico & { nutricionistaVinculadoIds?: unknown })
      .nutricionistaVinculadoIds,
    psiquiatraVinculadoIds: (medico as Medico & { psiquiatraVinculadoIds?: unknown })
      .psiquiatraVinculadoIds,
  });

  const nutriIds = uniqueIds(nutriIdsAcc);
  let personalIds = uniqueIds(personalIdsAcc);
  const psiIds = uniqueIds(psiIdsAcc);

  // Fallback: personais que listam este médico em medicoVinculadoIds
  if (personalIds.length === 0) {
    const medicoKeysForContains = uniqueIds([
      ...docsLidos.map((d) => d.id).filter((id) => !id.startsWith('state:')),
      medico.id,
      medico.userId,
      params.medicoAuthUid,
    ]);
    for (const mid of medicoKeysForContains) {
      try {
        const snap = await getDocsFresh(
          query(
            collection(db, COL_PERSONAL_TRAINERS),
            where('medicoVinculadoIds', 'array-contains', mid)
          )
        );
        if (snap.empty) continue;
        personalIds = uniqueIds([...personalIds, ...snap.docs.map((d) => d.id)]);
      } catch (e) {
        console.warn('[metaadmin/comunicacao] array-contains personal', mid, e);
      }
    }
  }

  console.info('[metaadmin/comunicacao] vínculos lidos do Firebase', {
    tentouKeys: medicoKeys,
    docsLidos,
    nutricionistaVinculadoIds: nutriIds,
    personalTrainerVinculadoIds: personalIds,
    psiquiatraVinculadoIds: psiIds,
  });

  // --- 3) Nutricionistas (mesmo padrão para personais abaixo) ---
  for (const nutriId of nutriIds) {
    let pushed = false;
    try {
      const snap = await getDoc(doc(db, COL_NUTRICIONISTAS, nutriId));
      if (snap.exists()) {
        const d = snap.data() as Record<string, unknown>;
        const profileId = snap.id;
        push({
          userId: String(d.userId || profileId).trim(),
          role: 'nutricionista',
          profileId,
          nome: String(d.nome || d.email || profileId).trim() || profileId,
          email: String(d.email || '').trim(),
          fotoUrl: (d.fotoPerfilUrl as string | null) || null,
          subtitle: d.registroNumero ? `CRN ${d.registroNumero}` : null,
          grupo: 'nutricionistas',
        });
        pushed = true;
      }
    } catch (e) {
      console.warn('[metaadmin/comunicacao] nutri perfil', nutriId, e);
    }
    if (!pushed) {
      push({
        userId: nutriId,
        role: 'nutricionista',
        profileId: nutriId,
        nome: nutriId,
        email: '',
        fotoUrl: null,
        subtitle: 'ID em nutricionistaVinculadoIds',
        grupo: 'nutricionistas',
      });
    }
  }

  // --- 3b) Psiquiatras vinculados ao médico ---
  for (const psiId of psiIds) {
    push(await resolvePsiDestById(psiId));
  }

  // --- 4) Personais — idêntico ao bloco de nutricionistas ---
  for (const personalId of personalIds) {
    let pushed = false;
    try {
      const snap = await getDoc(doc(db, COL_PERSONAL_TRAINERS, personalId));
      if (snap.exists()) {
        const d = snap.data() as Record<string, unknown>;
        const profileId = snap.id;
        push({
          userId: String(d.userId || profileId).trim(),
          role: 'personal',
          profileId,
          nome: String(d.nome || d.email || profileId).trim() || profileId,
          email: String(d.email || '').trim(),
          fotoUrl: (d.fotoPerfilUrl as string | null) || null,
          subtitle: d.registroNumero ? `CREF ${d.registroNumero}` : null,
          grupo: 'personais',
        });
        pushed = true;
      }
    } catch (e) {
      console.warn('[metaadmin/comunicacao] personal perfil', personalId, e);
    }
    if (!pushed) {
      push({
        userId: personalId,
        role: 'personal',
        profileId: personalId,
        nome: personalId,
        email: '',
        fotoUrl: null,
        subtitle: 'ID em personalTrainerVinculadoIds',
        grupo: 'personais',
      });
    }
  }

  console.info('[metaadmin/comunicacao] destinatários montados', {
    total: out.length,
    nutris: out.filter((d) => d.role === 'nutricionista').length,
    psiquiatras: out.filter((d) => d.role === 'psiquiatra').length,
    personais: out.filter((d) => d.role === 'personal').length,
    personalIds,
  });

  // --- 5) Médicos da org ---
  const skipAsMedico = new Set<string>([
    ...nutriIds,
    ...personalIds,
    ...psiIds,
    medico.id,
    String(medico.userId || ''),
    String(params.medicoAuthUid || ''),
  ]);
  try {
    const all = await MedicoService.getAllMedicos().catch(() => [] as Medico[]);
    for (const m of all || []) {
      if (!m?.id) continue;
      if (!isMedicoAptoParaComunicacao(m as OrgTeamFields, orgId)) continue;
      if (skipAsMedico.has(m.id) || (m.userId && skipAsMedico.has(m.userId))) continue;
      push(medicoToDest(m, medico.id));
    }
  } catch (e) {
    console.warn('[metaadmin/comunicacao] medicos org', e);
  }

  try {
    return out.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  } catch {
    return out;
  }
}

/**
 * Nutricionista →
 *  - médicos em nutricionistas.medicoVinculadoIds
 *  - seus pacientes
 *  - personais em pacientes_completos.personalTrainerVinculadoIds (+ vínculos ativos)
 *  - nutricionistas com o mesmo organizationId
 */
export async function loadDestinatariosMetanutri(params: {
  nutricionistaUserId: string;
  nutricionistaProfileId: string;
  pacientes: PacienteCompleto[];
  pacientesPorMedicoId?: Record<string, string>;
  medicosVinculados?: Array<{ medicoId?: string; id?: string }>;
  medicoVinculadoIds?: string[];
  organizationId?: OrganizationId | string;
}): Promise<ComunicacaoDestinatario[]> {
  const { out, push } = makePush();
  const selfKeys = uniqueIds([params.nutricionistaProfileId, params.nutricionistaUserId]);

  const selfNutri =
    (await resolveNutriById(params.nutricionistaProfileId || params.nutricionistaUserId)) ||
    (await resolveNutriById(params.nutricionistaUserId));
  for (const k of uniqueIds([selfNutri?.id, selfNutri?.userId])) {
    if (!selfKeys.includes(k)) selfKeys.push(k);
  }
  const orgId = resolveOrgIdFromMember(selfNutri, params.organizationId);

  const medicoIds = uniqueIds([
    ...(await loadMedicoVinculadoIdsDoNutri(selfKeys, params.medicoVinculadoIds)),
    ...(params.medicosVinculados || []).flatMap((m) => [m.medicoId, m.id]),
  ]);

  // Pacientes do nutri
  const vinculosNutri = (
    await Promise.all(
      selfKeys.map((k) => PacienteNutricionistaService.listActiveVinculosByNutri(k).catch(() => []))
    )
  ).flat();
  const pacienteIds = uniqueIds([
    ...vinculosNutri.map((v) => v.pacienteId),
    ...(params.pacientes || []).map((p) => p?.id),
  ]);
  const pacienteById = new Map<string, PacienteCompleto>();
  for (const p of params.pacientes || []) {
    if (p?.id) pacienteById.set(p.id, p);
  }

  const personalIdsAcc: string[] = [];
  const psiIdsAcc: string[] = [];
  for (const pacienteId of pacienteIds) {
    let pac = pacienteById.get(pacienteId) || null;
    if (!pac) {
      pac = await resolvePacienteById(pacienteId);
      if (pac) pacienteById.set(pacienteId, pac);
    }
    if (pac) push(pacienteToDest(pac));

    const fromState = extractIdList(
      (pac as PacienteCompleto & { personalTrainerVinculadoIds?: unknown })?.personalTrainerVinculadoIds
    );
    personalIdsAcc.push(...fromState);
    try {
      const snap = await getDocFresh(doc(db, 'pacientes_completos', pacienteId));
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        personalIdsAcc.push(...extractIdList(data.personalTrainerVinculadoIds));
      }
    } catch {
      /* ignore */
    }
    // Fonte de verdade do vínculo (caso espelho vazio/desatualizado)
    personalIdsAcc.push(...(await listPersonaisAtivosDoPaciente(pacienteId)));
    psiIdsAcc.push(...(await listPsiquiatrasAtivosDoPaciente(pacienteId)));
  }

  const personalIds = uniqueIds(personalIdsAcc);
  const psiIds = uniqueIds(psiIdsAcc);

  console.info('[comunicacao/metanutri] vínculos', {
    selfKeys,
    orgId,
    selfOrganizationId: selfNutri?.organizationId ?? null,
    medicoVinculadoIds: medicoIds,
    pacienteIdsCount: pacienteIds.length,
    personalTrainerVinculadoIds: personalIds,
    psiquiatraAtivosIds: psiIds,
  });

  // Personais dos pacientes
  for (const id of personalIds) {
    if (selfKeys.includes(id)) continue;
    let pushed = false;
    try {
      const snap = await getDocFresh(doc(db, COL_PERSONAL_TRAINERS, id));
      if (snap.exists()) {
        const d = snap.data() as Record<string, unknown>;
        push(
          personalToDest({
            id: snap.id,
            userId: String(d.userId || snap.id).trim(),
            nome: String(d.nome || '').trim(),
            email: String(d.email || '').trim(),
            registroNumero: String(d.registroNumero || '').trim(),
            fotoPerfilUrl: (d.fotoPerfilUrl as string | null) || null,
          })
        );
        pushed = true;
      }
    } catch (e) {
      console.warn('[comunicacao/metanutri] personal', id, e);
    }
    if (!pushed) push(await resolvePersonalDestById(id));
  }

  // Psiquiatras com ACL ativa nos pacientes do nutri
  for (const id of psiIds) {
    if (selfKeys.includes(id)) continue;
    push(await resolvePsiDestById(id));
  }

  // Nutricionistas da mesma organização (cadastro.organizationId)
  try {
    const allNutris = await NutricionistaService.getAllNutricionistas().catch(
      () => [] as NutricionistaDoc[]
    );
    let matched = 0;
    for (const n of allNutris || []) {
      if (!n?.id && !n?.userId) continue;
      if (selfKeys.includes(String(n.id || '').trim()) || selfKeys.includes(String(n.userId || '').trim())) {
        continue;
      }
      if (!isProfissionalDaOrganizacao(n as OrgTeamFields, orgId)) continue;
      matched += 1;
      push(nutriToDest(n, params.nutricionistaProfileId || params.nutricionistaUserId));
    }
    console.info('[comunicacao/metanutri] nutris org', {
      orgId,
      totalCatalogo: (allNutris || []).length,
      matched,
    });
  } catch (e) {
    console.warn('[comunicacao/metanutri] nutris org', e);
  }

  // Médicos vinculados
  for (const id of medicoIds) {
    if (selfKeys.includes(id)) continue;
    push(await resolveMedicoDestById(id));
  }

  return out.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
}

/**
 * Personal →
 *  - médicos em personal_trainers.medicoVinculadoIds
 *  - seus pacientes
 *  - nutricionistas em pacientes_completos.nutricionistaVinculadoIds (+ vínculos ativos)
 *  - personais com o mesmo organizationId
 */
export async function loadDestinatariosMetapersonal(params: {
  personalProfileId: string;
  pacientes: PacienteCompleto[];
  pacientesPorMedicoId?: Record<string, string>;
  medicosVinculados?: Array<{ medicoId?: string; id?: string }>;
  medicoVinculadoIds?: string[];
  organizationId?: OrganizationId | string;
}): Promise<ComunicacaoDestinatario[]> {
  const { out, push } = makePush();
  const selfKeys = uniqueIds([params.personalProfileId]);

  const personalDoc = await resolvePersonalById(selfKeys[0] || '');
  for (const k of uniqueIds([personalDoc?.id, personalDoc?.userId])) {
    if (!selfKeys.includes(k)) selfKeys.push(k);
  }
  const orgId = resolveOrgIdFromMember(personalDoc, params.organizationId);

  const medicoIds = uniqueIds([
    ...(await loadMedicoVinculadoIdsDoPersonal(selfKeys, params.medicoVinculadoIds)),
    ...(params.medicosVinculados || []).flatMap((m) => [m.medicoId, m.id]),
  ]);

  // Pacientes do personal
  const vinculosPersonal = (
    await Promise.all(
      selfKeys.map((k) =>
        PacientePersonalTrainerService.listActiveVinculosByPersonal(k).catch(() => [])
      )
    )
  ).flat();
  const pacienteIds = uniqueIds([
    ...vinculosPersonal.map((v) => v.pacienteId),
    ...(params.pacientes || []).map((p) => p?.id),
  ]);
  const pacienteById = new Map<string, PacienteCompleto>();
  for (const p of params.pacientes || []) {
    if (p?.id) pacienteById.set(p.id, p);
  }

  const nutriIdsAcc: string[] = [];
  const psiIdsAcc: string[] = [];
  const nutriPorPaciente: Record<string, string[]> = {};
  for (const pacienteId of pacienteIds) {
    let pac = pacienteById.get(pacienteId) || null;
    if (!pac) {
      pac = await resolvePacienteById(pacienteId);
      if (pac) pacienteById.set(pacienteId, pac);
    }
    if (pac) push(pacienteToDest(pac));

    const idsPac: string[] = [];
    const fromState = extractIdList(
      (pac as PacienteCompleto & { nutricionistaVinculadoIds?: unknown })?.nutricionistaVinculadoIds
    );
    idsPac.push(...fromState);
    try {
      const snap = await getDocFresh(doc(db, 'pacientes_completos', pacienteId));
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        idsPac.push(...extractIdList(data.nutricionistaVinculadoIds));
      }
    } catch {
      /* ignore */
    }
    // Fonte de verdade do vínculo (caso espelho vazio/desatualizado)
    idsPac.push(...(await listNutrisAtivosDoPaciente(pacienteId)));
    const uniqPac = uniqueIds(idsPac);
    nutriPorPaciente[pacienteId] = uniqPac;
    nutriIdsAcc.push(...uniqPac);
    psiIdsAcc.push(...(await listPsiquiatrasAtivosDoPaciente(pacienteId)));
  }

  const nutriIds = uniqueIds(nutriIdsAcc);
  const psiIds = uniqueIds(psiIdsAcc);

  console.info('[comunicacao/metapersonal] vínculos', {
    selfKeys,
    orgId,
    selfOrganizationId: personalDoc?.organizationId ?? null,
    medicoVinculadoIds: medicoIds,
    pacienteIdsCount: pacienteIds.length,
    nutricionistaVinculadoIds: nutriIds,
    psiquiatraAtivosIds: psiIds,
    nutriPorPaciente,
  });

  // Nutricionistas dos pacientes
  for (const id of nutriIds) {
    if (selfKeys.includes(id)) continue;
    let pushed = false;
    try {
      const snap = await getDocFresh(doc(db, COL_NUTRICIONISTAS, id));
      if (snap.exists()) {
        const d = snap.data() as Record<string, unknown>;
        push(
          nutriToDest({
            id: snap.id,
            userId: String(d.userId || snap.id).trim(),
            nome: String(d.nome || '').trim(),
            email: String(d.email || '').trim(),
            registroNumero: String(d.registroNumero || '').trim(),
            fotoPerfilUrl: (d.fotoPerfilUrl as string | null) || null,
          })
        );
        pushed = true;
      }
    } catch (e) {
      console.warn('[comunicacao/metapersonal] nutri', id, e);
    }
    if (!pushed) push(await resolveNutriDestById(id));
  }

  // Psiquiatras com ACL ativa nos pacientes do personal
  for (const id of psiIds) {
    if (selfKeys.includes(id)) continue;
    push(await resolvePsiDestById(id));
  }

  // Personais da mesma organização (cadastro.organizationId)
  try {
    const allPersonais = await PersonalTrainerService.getAllPersonalTrainers().catch(
      () => [] as PersonalTrainerDoc[]
    );
    let matched = 0;
    for (const p of allPersonais || []) {
      if (!p?.id && !p?.userId) continue;
      if (selfKeys.includes(String(p.id || '').trim()) || selfKeys.includes(String(p.userId || '').trim())) {
        continue;
      }
      if (!isProfissionalDaOrganizacao(p as OrgTeamFields, orgId)) continue;
      matched += 1;
      push(personalToDest(p, params.personalProfileId));
    }
    console.info('[comunicacao/metapersonal] personais org', {
      orgId,
      totalCatalogo: (allPersonais || []).length,
      matched,
    });
  } catch (e) {
    console.warn('[comunicacao/metapersonal] personais org', e);
  }

  // Médicos vinculados
  for (const id of medicoIds) {
    if (selfKeys.includes(id)) continue;
    push(await resolveMedicoDestById(id));
  }

  return out.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
}

/** Paciente → médico + nutri + personal + psiquiatra (ACL ativa). */
export async function loadDestinatariosPaciente(params: {
  medico?: Medico | null;
  nutricionista?: {
    id: string;
    nome: string;
    email?: string;
    registroNumero?: string;
    userId?: string;
  } | null;
  personal?: {
    id: string;
    nome: string;
    email?: string;
    registroNumero?: string;
    userId?: string;
  } | null;
  psiquiatra?: {
    id: string;
    nome: string;
    email?: string;
    registroNumero?: string;
    crmUf?: string;
    userId?: string;
    genero?: 'M' | 'F' | '';
    fotoPerfilUrl?: string | null;
  } | null;
  organizationId?: OrganizationId | string;
}): Promise<ComunicacaoDestinatario[]> {
  const { out, push } = makePush();

  if (params.medico?.id) {
    const full = (await resolveMedicoById(params.medico.id)) || params.medico;
    push(medicoToDest(full));
  }

  const nutriId = params.nutricionista?.id || params.nutricionista?.userId;
  if (nutriId) {
    const nutri =
      (await resolveNutriById(nutriId)) ||
      ({
        id: nutriId,
        userId: params.nutricionista?.userId || nutriId,
        nome: params.nutricionista?.nome || 'Nutricionista',
        email: params.nutricionista?.email || '',
        registroNumero: params.nutricionista?.registroNumero || '',
        fotoPerfilUrl: null,
      } as NutricionistaDoc);
    push(nutriToDest(nutri));
  }

  const psiId = params.psiquiatra?.id || params.psiquiatra?.userId;
  if (psiId) {
    const psi =
      (await resolvePsiById(psiId)) ||
      ({
        id: psiId,
        userId: params.psiquiatra?.userId || psiId,
        nome: params.psiquiatra?.nome || 'Psiquiatra',
        email: params.psiquiatra?.email || '',
        registroNumero: params.psiquiatra?.registroNumero || '',
        crmUf: params.psiquiatra?.crmUf || '',
        genero: params.psiquiatra?.genero || '',
        fotoPerfilUrl: params.psiquiatra?.fotoPerfilUrl || null,
      } as PsiquiatraDoc);
    push(psiToDest(psi));
  }

  const personalId = params.personal?.id || params.personal?.userId;
  if (personalId) {
    const personal =
      (await resolvePersonalById(personalId)) ||
      ({
        id: personalId,
        userId: params.personal?.userId || personalId,
        nome: params.personal?.nome || 'Personal',
        email: params.personal?.email || '',
        registroNumero: params.personal?.registroNumero || '',
        fotoPerfilUrl: null,
      } as PersonalTrainerDoc);
    push(personalToDest(personal));
  }

  return out.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
}

/**
 * Psiquiatra →
 *  - médicos em psiquiatras.medicoVinculadoIds
 *  - pacientes com ACL ativa (paciente_psiquiatra) — NÃO medicoVinculadoIds
 *  - nutri/personal dos pacientes com ACL
 *  - peers da mesma organização
 */
export async function loadDestinatariosMetapsi(params: {
  psiquiatraProfileId: string;
  pacientes?: PacienteCompleto[];
  medicosVinculados?: Array<{ medicoId?: string; id?: string }>;
  medicoVinculadoIds?: string[];
  organizationId?: OrganizationId | string;
}): Promise<ComunicacaoDestinatario[]> {
  const { out, push } = makePush();
  const selfKeys = uniqueIds([params.psiquiatraProfileId]);

  const selfPsi = await resolvePsiById(params.psiquiatraProfileId);
  for (const k of uniqueIds([selfPsi?.id, selfPsi?.userId])) {
    if (!selfKeys.includes(k)) selfKeys.push(k);
  }
  const orgId = resolveOrgIdFromMember(selfPsi, params.organizationId);

  const medicoIds = uniqueIds([
    ...(selfPsi?.medicoVinculadoIds || []),
    ...(params.medicoVinculadoIds || []),
    ...(params.medicosVinculados || []).flatMap((m) => [m.medicoId, m.id]),
  ]);

  // Pacientes: SOMENTE ACL ativa (SoT paciente_psiquiatra)
  const visiveis = await PacientePsiquiatraService.listPacientesVisiveisByPsiquiatra(
    params.psiquiatraProfileId
  ).catch(() => []);
  const pacienteById = new Map<string, PacienteCompleto>();
  for (const item of visiveis) {
    if (item.paciente?.id) {
      pacienteById.set(item.paciente.id, item.paciente);
      push(pacienteToDest(item.paciente));
    }
  }
  for (const p of params.pacientes || []) {
    if (p?.id && pacienteById.has(p.id)) {
      /* já incluído via ACL */
    }
  }

  const pacienteIds = uniqueIds([...pacienteById.keys()]);
  const nutriIdsAcc: string[] = [];
  const personalIdsAcc: string[] = [];
  for (const pacienteId of pacienteIds) {
    nutriIdsAcc.push(...(await listNutrisAtivosDoPaciente(pacienteId)));
    personalIdsAcc.push(...(await listPersonaisAtivosDoPaciente(pacienteId)));
  }
  const nutriIds = uniqueIds(nutriIdsAcc);
  const personalIds = uniqueIds(personalIdsAcc);

  for (const id of nutriIds) {
    if (selfKeys.includes(id)) continue;
    push(await resolveNutriDestById(id));
  }
  for (const id of personalIds) {
    if (selfKeys.includes(id)) continue;
    push(await resolvePersonalDestById(id));
  }

  // Peers psiquiatras da organização
  try {
    const all = await PsiquiatraService.getAllPsiquiatras().catch(() => [] as PsiquiatraDoc[]);
    for (const p of all || []) {
      if (!p?.id && !p?.userId) continue;
      if (selfKeys.includes(String(p.id || '').trim()) || selfKeys.includes(String(p.userId || '').trim())) {
        continue;
      }
      if (!isProfissionalDaOrganizacao(p as OrgTeamFields, orgId)) continue;
      push(psiToDest(p, params.psiquiatraProfileId));
    }
  } catch {
    /* ignore peers */
  }

  for (const id of medicoIds) {
    if (selfKeys.includes(id)) continue;
    push(await resolveMedicoDestById(id));
  }

  return out.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
}

/**
 * Outros papéis do mesmo Auth UID (testes multi-painel).
 * Continua permitido; não substitui vínculos.
 */
export async function loadOutrosPapeisMesmoAuthUser(params: {
  userId: string;
  role: ComunicacaoParticipanteRole;
  profileId: string;
  organizationId?: OrganizationId | string;
}): Promise<ComunicacaoDestinatario[]> {
  const uid = String(params.userId || '').trim();
  if (!uid) return [];
  const selfKey = `${params.role}:${String(params.profileId || '').trim()}`;
  const { out, push } = makePush();

  const wrap = (d: ComunicacaoDestinatario | null) => {
    if (!d) return;
    if (`${d.role}:${d.profileId}` === selfKey) return;
    push({
      ...d,
      subtitle: d.subtitle
        ? `${d.subtitle} · seu outro perfil`
        : 'Seu outro perfil (mesmo login)',
    });
  };

  const [medico, nutri, personal, psiquiatra, paciente] = await Promise.all([
    params.role === 'medico' ? Promise.resolve(null) : resolveMedicoById(uid),
    params.role === 'nutricionista' ? Promise.resolve(null) : resolveNutriById(uid),
    params.role === 'personal' ? Promise.resolve(null) : resolvePersonalById(uid),
    params.role === 'psiquiatra' ? Promise.resolve(null) : resolvePsiById(uid),
    params.role === 'paciente'
      ? Promise.resolve(null)
      : PacienteService.getPacienteByUserId(uid).catch(() => null),
  ]);

  if (medico) wrap(medicoToDest(medico));
  if (nutri) wrap(nutriToDest(nutri));
  if (psiquiatra) wrap(psiToDest(psiquiatra));
  if (personal) wrap(personalToDest(personal));
  if (paciente) wrap(pacienteToDest(paciente));

  return out;
}

export function toCurrentUserParticipante(p: ComunicacaoParticipante): ComunicacaoParticipante {
  return { ...p };
}
