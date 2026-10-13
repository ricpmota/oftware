import { describe, expect, it } from 'vitest';
import { METODO_ORGANIZATION_ID } from './organizationRegistry';
import {
  resolveOrganizationHintFromHost,
  resolvePatientOrganizationContext,
} from './patientOrganizationContext';

const METODO = METODO_ORGANIZATION_ID;

describe('resolveOrganizationHintFromHost', () => {
  it('resolve o host do Método pelo registry existente', () => {
    expect(resolveOrganizationHintFromHost('www.ometodoemagrecer.com.br')).toBe(METODO);
    expect(resolveOrganizationHintFromHost('ometodoemagrecer.com.br')).toBe(METODO);
  });

  it('não inventa hint em host Oftware ou vazio', () => {
    expect(resolveOrganizationHintFromHost('www.oftware.com.br')).toBeNull();
    expect(resolveOrganizationHintFromHost(null)).toBeNull();
    expect(resolveOrganizationHintFromHost('')).toBeNull();
  });
});

describe('resolvePatientOrganizationContext', () => {
  it('Caso A: hint metodo + doctor.organizationId metodo → resolved, match true', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: 'med-1' },
      doctor: { organizationId: METODO },
      doctorLookupDone: true,
    });
    expect(ctx.status).toBe('resolved');
    expect(ctx.resolvedOrganizationId).toBe(METODO);
    expect(ctx.organizationId).toBe(METODO);
    expect(ctx.organizationMatch).toBe(true);
    expect(ctx.source).toBe('doctor');
  });

  it('Caso B: hint null + doctor.organizationId metodo → resolved, válido', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: null,
      patient: { medicoResponsavelId: 'med-1' },
      doctor: { organizationId: METODO },
      doctorLookupDone: true,
    });
    expect(ctx.status).toBe('resolved');
    expect(ctx.resolvedOrganizationId).toBe(METODO);
    expect(ctx.organizationMatch).toBe(true);
    expect(ctx.source).toBe('doctor');
  });

  it('paciente da Kamilla fica na organização dela, mesmo com hint do Método', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: 'med-kamilla' },
      doctor: { organizationId: 'kamilla-montenegro', metodoImagensAtivo: false },
      doctorLookupDone: true,
    });
    expect(ctx.status).toBe('mismatch');
    expect(ctx.organizationId).toBe('kamilla-montenegro');
    expect(ctx.organizationMatch).toBe(false);
    expect(ctx.source).toBe('doctor');
  });

  it('Caso C: hint metodo + doctor de outra org → mismatch, sem bloquear', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: 'med-1' },
      doctor: { organizationId: 'clinica_xyz' },
      doctorLookupDone: true,
    });
    expect(ctx.status).toBe('mismatch');
    expect(ctx.organizationHint).toBe(METODO);
    expect(ctx.resolvedOrganizationId).toBe('clinica_xyz');
    expect(ctx.organizationMatch).toBe(false);
    expect(ctx.source).toBe('doctor');
  });

  it('Caso D: doctor sem organizationId → legado Método (isOrganizationTeamMember)', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: 'med-1' },
      doctor: { organizationId: null, metodoImagensAtivo: false },
      doctorLookupDone: true,
    });
    expect(ctx.status).toBe('resolved');
    expect(ctx.resolvedOrganizationId).toBe(METODO);
    expect(ctx.organizationMatch).toBe(true);
    expect(ctx.source).toBe('legacy_metodo');
  });

  it('Caso D variante: metodoImagensAtivo sem organizationId → legado Método', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: 'med-1' },
      doctor: { metodoImagensAtivo: true },
      doctorLookupDone: true,
    });
    expect(ctx.status).toBe('resolved');
    expect(ctx.resolvedOrganizationId).toBe(METODO);
    expect(ctx.source).toBe('legacy_metodo');
  });

  it('Caso E: paciente ainda carregando → loading, não unresolved', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: null,
      doctor: null,
      patientLoading: true,
    });
    expect(ctx.status).toBe('loading');
    expect(ctx.resolvedOrganizationId).toBeNull();
    expect(ctx.source).toBeNull();
    expect(ctx.organizationMatch).toBe(true);
  });

  it('Caso E variante: médico referenciado ainda não lookup → loading', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: 'med-1' },
      doctor: null,
      patientLoading: false,
      doctorLookupDone: false,
    });
    expect(ctx.status).toBe('loading');
  });

  it('Caso F: médico inexistente após lookup → unresolved controlado', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: 'med-missing' },
      doctor: null,
      doctorLookupDone: true,
    });
    expect(ctx.status).toBe('unresolved');
    expect(ctx.resolvedOrganizationId).toBeNull();
    expect(ctx.organizationId).toBeNull();
    expect(ctx.source).toBe('unknown');
  });

  it('usa shadow do paciente só quando o médico não resolve', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: null, organizationId: METODO },
      doctor: null,
      doctorLookupDone: true,
    });
    expect(ctx.status).toBe('resolved');
    expect(ctx.resolvedOrganizationId).toBe(METODO);
    expect(ctx.source).toBe('patient_shadow');
  });

  it('não deixa shadow do paciente sobrescrever organizationId explícito do médico', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: 'med-1', organizationId: METODO },
      doctor: { organizationId: 'clinica_xyz' },
      doctorLookupDone: true,
    });
    expect(ctx.status).toBe('mismatch');
    expect(ctx.resolvedOrganizationId).toBe('clinica_xyz');
    expect(ctx.source).toBe('doctor');
  });

  it('aceita hint externo (futuro Capacitor) sem depender de host', () => {
    const ctx = resolvePatientOrganizationContext({
      organizationHint: METODO,
      patient: { medicoResponsavelId: 'med-1' },
      doctor: { organizationId: METODO },
    });
    expect(ctx.organizationHint).toBe(METODO);
    expect(ctx.organizationMatch).toBe(true);
  });
});
