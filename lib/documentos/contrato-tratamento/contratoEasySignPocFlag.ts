/** Credenciais EasySign dedicadas ou fallback da assinatura médica (SIGNATURE_BRY_*). */
export function hasBryEasySignCredentials(): boolean {
  const token = process.env.BRY_EASYSIGN_ACCESS_TOKEN?.trim();
  const easyClientId = process.env.BRY_EASYSIGN_CLIENT_ID?.trim();
  const easyClientSecret = process.env.BRY_EASYSIGN_CLIENT_SECRET?.trim();
  if (token || (easyClientId && easyClientSecret)) return true;

  const sigClientId = process.env.SIGNATURE_BRY_CLIENT_ID?.trim();
  const sigClientSecret = process.env.SIGNATURE_BRY_CLIENT_SECRET?.trim();
  return Boolean(sigClientId && sigClientSecret);
}

/** EasySign habilitado quando há credenciais BRy (flag false desliga). */
export function isContratoEasySignConfiguredServer(): boolean {
  if (process.env.ENABLE_CONTRATO_EASYSIGN_POC === 'false') return false;
  return hasBryEasySignCredentials();
}

/** @deprecated Preferir isContratoEasySignConfiguredServer */
export function isContratoEasySignPocEnabledServer(): boolean {
  return isContratoEasySignConfiguredServer();
}

/** Cliente: tenta fluxo EasySign salvo desabilitação explícita. */
export function isContratoEasySignPocEnabledClient(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_CONTRATO_EASYSIGN_POC === 'false') return false;
  if (process.env.NEXT_PUBLIC_ENABLE_CONTRATO_EASYSIGN_POC === 'true') return true;
  return true;
}

export function contratoEasySignPocForbiddenMessage(): string {
  return 'Assinatura eletrônica do paciente não configurada. Verifique BRY_EASYSIGN_* no servidor.';
}

export function contratoEasySignNotConfiguredMessage(): string {
  return (
    'Configure BRY_EASYSIGN_ACCESS_TOKEN (ou CLIENT_ID + CLIENT_SECRET) no ambiente de produção. ' +
    'Se a assinatura médica BRy já estiver ativa, use SIGNATURE_BRY_CLIENT_ID + SIGNATURE_BRY_CLIENT_SECRET ' +
    'ou copie os mesmos valores para BRY_EASYSIGN_CLIENT_ID + BRY_EASYSIGN_CLIENT_SECRET.'
  );
}

/** Log seguro — sem valores de credenciais. */
export function contratoEasySignConfigDiagnostics(): Record<string, boolean | string> {
  return {
    flagExplicitFalse: process.env.ENABLE_CONTRATO_EASYSIGN_POC === 'false',
    hasBryEasySignAccessToken: Boolean(process.env.BRY_EASYSIGN_ACCESS_TOKEN?.trim()),
    hasBryEasySignClientCredentials: Boolean(
      process.env.BRY_EASYSIGN_CLIENT_ID?.trim() && process.env.BRY_EASYSIGN_CLIENT_SECRET?.trim()
    ),
    hasSignatureBryClientCredentials: Boolean(
      process.env.SIGNATURE_BRY_CLIENT_ID?.trim() && process.env.SIGNATURE_BRY_CLIENT_SECRET?.trim()
    ),
    hasBryEasySignBaseUrl: Boolean(process.env.BRY_EASYSIGN_BASE_URL?.trim()),
    signatureBryEnv: process.env.SIGNATURE_BRY_ENV?.trim() || '(unset)',
  };
}
