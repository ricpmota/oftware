import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';

/** Remove qualquer material de token OAuth antes de expor ao browser. */
export function sanitizeDoctorSignatureProviderForClient(
  config: DoctorSignatureProvider | null | undefined
): DoctorSignatureProvider | null | undefined {
  if (!config) return config;

  if (!config.connection) return config;

  const {
    accessToken: _a,
    refreshToken: _r,
    accessTokenEncrypted: _ae,
    refreshTokenEncrypted: _re,
    pscSigningKmsTokenEncrypted: _pte,
    integraBrySigningTokenEncrypted: _ibte,
    pscSigningKmsUser: _pu,
    pscSigningKmsUuidCert: _puuid,
    integraSessionApiKey: _isk,
    authorizationContextId: _aci,
    ...safeConnection
  } = config.connection;

  return { ...config, connection: safeConnection };
}

export function sanitizeMedicoDoctorSignatureProvider<T extends { doctorSignatureProvider?: DoctorSignatureProvider }>(
  medico: T
): T {
  if (!medico.doctorSignatureProvider) return medico;
  return {
    ...medico,
    doctorSignatureProvider: sanitizeDoctorSignatureProviderForClient(
      medico.doctorSignatureProvider
    ) as DoctorSignatureProvider,
  };
}
