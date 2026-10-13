'use client';

import { useEffect, useMemo, useState } from 'react';
import { devLog } from '@/lib/devLog';
import { metaPacienteAuthFetch } from '@/lib/meta/metaPacienteAuthFetch';
import {
  patientOrganizationBrandingLogPayload,
  resolvePatientOrganizationBrandingState,
  shouldFetchPatientOrganizationBranding,
  type PatientOrganizationBrandingApiOk,
  type PatientOrganizationBrandingFetchStatus,
  type PatientOrganizationBrandingValue,
} from '@/lib/organization/patientOrganizationBranding';
import type { PatientOrganizationContextValue } from '@/lib/organization/patientOrganizationContext';

const brandingCache = new Map<string, PatientOrganizationBrandingApiOk>();
const brandingInFlight = new Map<string, Promise<PatientOrganizationBrandingApiOk | null>>();

async function fetchPatientOrganizationBranding(
  organizationId: string,
): Promise<PatientOrganizationBrandingApiOk | null> {
  const cached = brandingCache.get(organizationId);
  if (cached) return cached;

  const pending = brandingInFlight.get(organizationId);
  if (pending) return pending;

  const request = (async () => {
    try {
      const res = await metaPacienteAuthFetch('/api/meta/organization-branding');
      const json = (await res.json().catch(() => null)) as
        | PatientOrganizationBrandingApiOk
        | { ok?: false }
        | null;
      if (!res.ok || !json || json.ok !== true) return null;
      const payload = json as PatientOrganizationBrandingApiOk;
      const returnedOrganizationId = payload.organizationId?.trim();
      if (returnedOrganizationId && returnedOrganizationId !== organizationId) {
        return payload;
      }
      brandingCache.set(organizationId, payload);
      return payload;
    } catch {
      return null;
    }
  })().finally(() => {
    brandingInFlight.delete(organizationId);
  });

  brandingInFlight.set(organizationId, request);
  return request;
}

/**
 * Carrega branding da organização resolvida na 02A (API da 02B.1).
 * A aplicação visual fica em resolveMetaUiBranding + /meta. Mismatch não autoriza nem bloqueia.
 */
export function usePatientOrganizationBranding(
  organization: PatientOrganizationContextValue,
): PatientOrganizationBrandingValue {
  const organizationId = organization.organizationId;
  const shouldFetch = shouldFetchPatientOrganizationBranding(
    organization.status,
    organizationId,
  );
  const cached = organizationId ? brandingCache.get(organizationId) ?? null : null;

  const [fetchStatus, setFetchStatus] = useState<PatientOrganizationBrandingFetchStatus>(
    cached ? 'success' : 'idle',
  );
  const [payload, setPayload] = useState<PatientOrganizationBrandingApiOk | null>(cached);

  useEffect(() => {
    if (!shouldFetch || !organizationId) {
      setFetchStatus('idle');
      setPayload(null);
      return;
    }

    const existing = brandingCache.get(organizationId);
    if (existing) {
      setPayload(existing);
      setFetchStatus('success');
      return;
    }

    let cancelled = false;
    setFetchStatus('loading');
    void fetchPatientOrganizationBranding(organizationId)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setPayload(result);
          setFetchStatus('success');
          return;
        }
        setPayload(null);
        setFetchStatus('error');
      })
      .catch(() => {
        if (cancelled) return;
        setPayload(null);
        setFetchStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [shouldFetch, organizationId]);

  const value = useMemo(
    () =>
      resolvePatientOrganizationBrandingState({
        organizationStatus: organization.status,
        organizationId,
        fetchStatus,
        payload,
      }),
    [organization.status, organizationId, fetchStatus, payload],
  );

  useEffect(() => {
    devLog('[OrganizationBranding]', patientOrganizationBrandingLogPayload(value));
  }, [value]);

  return value;
}
