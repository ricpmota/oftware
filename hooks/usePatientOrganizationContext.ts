'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { devLog } from '@/lib/devLog';
import {
  patientOrganizationContextLogPayload,
  readBrowserOrganizationHint,
  resolvePatientOrganizationContext,
  type DoctorOrganizationFields,
  type PatientOrganizationContextValue,
  type PatientOrganizationFields,
} from '@/lib/organization/patientOrganizationContext';

type UsePatientOrganizationContextInput = {
  patient: PatientOrganizationFields | null;
  doctor: DoctorOrganizationFields | null;
  patientLoading: boolean;
  doctorLookupDone: boolean;
  /**
   * Hint externo (ex.: shell Capacitor).
   * Omitir para derivar do host atual via organizationRegistry.
   */
  organizationHint?: string | null;
};

const subscribeHostHint = () => () => {};

/**
 * Contexto de organização da sessão do paciente.
 * Somente deriva dados já carregados — zero consultas extras.
 * Não altera UI, autorização nem branding.
 */
export function usePatientOrganizationContext(
  input: UsePatientOrganizationContextInput,
): PatientOrganizationContextValue {
  const hostHint = useSyncExternalStore(
    subscribeHostHint,
    readBrowserOrganizationHint,
    () => null,
  );
  const organizationHint =
    input.organizationHint === undefined ? hostHint : input.organizationHint;

  const ctx = useMemo(
    () =>
      resolvePatientOrganizationContext({
        organizationHint,
        patient: input.patient,
        doctor: input.doctor,
        patientLoading: input.patientLoading,
        doctorLookupDone: input.doctorLookupDone,
      }),
    [
      organizationHint,
      input.patient,
      input.doctor,
      input.patientLoading,
      input.doctorLookupDone,
    ],
  );

  useEffect(() => {
    devLog('[OrganizationContext]', patientOrganizationContextLogPayload(ctx));
  }, [ctx]);

  return ctx;
}
