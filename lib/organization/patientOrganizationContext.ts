import { isOrganizationTeamMember } from './isOrganizationTeamMember';
import { METODO_ORGANIZATION_ID } from './organizationRegistry';
import { resolveOrganizationFromHost } from './resolveOrganizationFromHost';
import type { OrganizationId } from './organizationTypes';

/** Hint de ambiente (host hoje; shell Capacitor no futuro). Nunca autoriza acesso. */
export type PatientOrganizationHint = OrganizationId | null;

export type PatientOrganizationSource =
  | 'doctor'
  | 'patient_shadow'
  | 'legacy_metodo'
  | 'unknown';

export type PatientOrganizationStatus = 'loading' | 'resolved' | 'unresolved' | 'mismatch';

export type PatientOrganizationFields = {
  medicoResponsavelId?: string | null;
  organizationId?: string | null;
};

export type DoctorOrganizationFields = {
  organizationId?: string | null;
  metodoImagensAtivo?: boolean | null;
};

export type PatientOrganizationContextValue = {
  status: PatientOrganizationStatus;
  organizationHint: PatientOrganizationHint;
  resolvedOrganizationId: OrganizationId | null;
  organizationId: OrganizationId | null;
  organizationMatch: boolean;
  source: PatientOrganizationSource | null;
};

export type ResolvePatientOrganizationContextInput = {
  /** Hint externo (host ou Capacitor). `null` = sem hint; omitir no hook para ler o host. */
  organizationHint?: string | null;
  patient: PatientOrganizationFields | null;
  doctor: DoctorOrganizationFields | null;
  patientLoading?: boolean;
  /** `false` enquanto o `/meta` ainda busca o médico já referenciado. Default `true` nos testes. */
  doctorLookupDone?: boolean;
};

function normalizeOrgId(value: string | null | undefined): OrganizationId | null {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : null;
}

export function resolveOrganizationHintFromHost(
  hostname?: string | null,
): PatientOrganizationHint {
  return resolveOrganizationFromHost(hostname)?.id ?? null;
}

/** Hint do browser atual. Seguro em SSR (retorna null). */
export function readBrowserOrganizationHint(): PatientOrganizationHint {
  if (typeof window === 'undefined') return null;
  return resolveOrganizationHintFromHost(window.location.hostname);
}

function hasMedicoResponsavelId(patient: PatientOrganizationFields | null): boolean {
  return Boolean(normalizeOrgId(patient?.medicoResponsavelId ?? null));
}

function resolveFromDoctor(
  doctor: DoctorOrganizationFields,
): { organizationId: OrganizationId; source: PatientOrganizationSource } | null {
  const explicit = normalizeOrgId(doctor.organizationId);
  if (explicit) {
    return { organizationId: explicit, source: 'doctor' };
  }

  if (isOrganizationTeamMember(doctor, METODO_ORGANIZATION_ID)) {
    return { organizationId: METODO_ORGANIZATION_ID, source: 'legacy_metodo' };
  }

  return null;
}

function resolveFromPatientShadow(
  patient: PatientOrganizationFields | null,
): { organizationId: OrganizationId; source: PatientOrganizationSource } | null {
  const shadow = normalizeOrgId(patient?.organizationId);
  if (!shadow) return null;
  return { organizationId: shadow, source: 'patient_shadow' };
}

/**
 * Deriva a organização da sessão do paciente a partir de dados já carregados.
 * Não consulta Firestore. O hint nunca autoriza acesso.
 */
export function resolvePatientOrganizationContext(
  input: ResolvePatientOrganizationContextInput,
): PatientOrganizationContextValue {
  const organizationHint = normalizeOrgId(input.organizationHint);
  const patientLoading = input.patientLoading === true;
  const doctorLookupDone = input.doctorLookupDone !== false;

  const loadingValue = (): PatientOrganizationContextValue => ({
    status: 'loading',
    organizationHint,
    resolvedOrganizationId: null,
    organizationId: null,
    organizationMatch: true,
    source: null,
  });

  if (patientLoading) {
    return loadingValue();
  }

  if (hasMedicoResponsavelId(input.patient) && !doctorLookupDone) {
    return loadingValue();
  }

  let resolved: { organizationId: OrganizationId; source: PatientOrganizationSource } | null =
    null;

  if (input.doctor) {
    resolved = resolveFromDoctor(input.doctor);
  }

  if (!resolved) {
    resolved = resolveFromPatientShadow(input.patient);
  }

  if (!resolved) {
    return {
      status: 'unresolved',
      organizationHint,
      resolvedOrganizationId: null,
      organizationId: null,
      organizationMatch: organizationHint == null,
      source: input.patient || input.doctor ? 'unknown' : null,
    };
  }

  const organizationMatch =
    organizationHint == null || organizationHint === resolved.organizationId;
  const status: PatientOrganizationStatus = organizationMatch ? 'resolved' : 'mismatch';

  return {
    status,
    organizationHint,
    resolvedOrganizationId: resolved.organizationId,
    organizationId: resolved.organizationId,
    organizationMatch,
    source: resolved.source,
  };
}

export function patientOrganizationContextLogPayload(
  ctx: PatientOrganizationContextValue,
): Record<string, string | boolean | null> {
  return {
    hint: ctx.organizationHint,
    resolved: ctx.resolvedOrganizationId,
    organizationId: ctx.organizationId,
    match: ctx.organizationMatch,
    status: ctx.status,
    source: ctx.source,
  };
}
