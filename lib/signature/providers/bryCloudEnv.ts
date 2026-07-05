/**
 * BRy Cloud / Assinatura em nuvem (Integra BRy + BRy KMS / BRYKMS).
 *
 * Produção (Vercel — Etapa 12):
 * SIGNATURE_BRY_API_URL=https://integra.bry.com.br/api/service
 * SIGNATURE_BRY_HUB_API_URL=https://hub2.bry.com.br
 * SIGNATURE_BRY_CLIENT_ID= — credencial do portal de produção
 * SIGNATURE_BRY_CLIENT_SECRET= — credencial do portal de produção
 * SIGNATURE_BRY_REDIRECT_URI=https://www.oftware.com.br/api/signature/bry/callback
 * SIGNATURE_BRY_ENV=production — recomendado após migração
 *
 * Opcional:
 * SIGNATURE_BRY_TOKEN_SERVICE_URL — padrão https://cloud.bry.com.br/token-service/jwt em produção
 * SIGNATURE_BRY_PSC_NAME — ex.: Vidaas, BirdID, SerproID (ver Integra BRy)
 * SIGNATURE_BRY_PSC_SCOPE — signature_session | single_signature | multi_signature
 * SIGNATURE_BRY_PSC_AUTH_LIFETIME_SEC — segundos (padrão 604800 = 7 dias, limite PSC BRy)
 * SIGNATURE_BRY_PSC_NUMBER_OF_DOCUMENTS — padrão 50
 *
 * Opcional (sobrescreve paths da API):
 * SIGNATURE_BRY_PDF_SIGN_PATH=
 * SIGNATURE_BRY_PSC_LINK_PATH= — padrão /psc/link (Integra BRy)
 * SIGNATURE_BRY_HUB_CMS_SIGN_PATH= — padrão /fw/v1/cms/kms/assinaturas
 * SIGNATURE_BRY_HUB_PDF_BATCH_PATH= — legado /fw/v1/pdf/kms/lote/assinaturas
 * SIGNATURE_BRY_USE_CMS_KMS=true — só para submitBryHubIntegraCmsHubSignature (testes)
 * SIGNATURE_BRY_USE_LEGACY_PDF_BATCH — obsoleto; remova do Vercel (false ativava CMS por engano)
 * SIGNATURE_BRY_CMS_INPUT_MODE= — hashes (padrão) | originalDocuments
 * SIGNATURE_BRY_OAUTH_TOKEN_PATH=
 */
export type BryCloudDeployment = 'homologation' | 'production';

/** Entrada do CMS/KMS HUB — multipart originalDocuments[n][hash] ou hashes/nonces no cmsRequest. */
export type BryCmsInputMode = 'originalDocuments' | 'hashes';

/** Endpoints oficiais BRy — produção (não usar *.hom.bry.com.br em deploy). */
export const BRY_CLOUD_PRODUCTION_API_URL = 'https://integra.bry.com.br/api/service';
export const BRY_CLOUD_PRODUCTION_HUB_API_URL = 'https://hub2.bry.com.br';
export const BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL =
  'https://cloud.bry.com.br/token-service/jwt';
export const BRY_CLOUD_PRODUCTION_REDIRECT_URI =
  'https://www.oftware.com.br/api/signature/bry/callback';

const BRY_HOM_HOST_PATTERN = /\.hom\.bry\.com\.br|cloud-hom\.bry\.com\.br/i;

let bryEnvConfigLogged = false;

export function bryConfigContainsHomHost(config: Pick<
  BryCloudEnvConfig,
  'apiUrl' | 'hubApiUrl' | 'applicationTokenUrl' | 'redirectUri'
>): boolean {
  const blob = [config.apiUrl, config.hubApiUrl, config.applicationTokenUrl, config.redirectUri]
    .filter(Boolean)
    .join(' ');
  return BRY_HOM_HOST_PATTERN.test(blob);
}

/** Log temporário pós-migração hom → prod (uma vez por instância). */
export function logBryEnvConfigOnce(config: BryCloudEnvConfig): void {
  if (bryEnvConfigLogged) return;
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') return;
  bryEnvConfigLogged = true;

  const hasHomUrl = bryConfigContainsHomHost(config);
  console.info('[bry_env]', {
    environment: config.deployment,
    apiUrl: config.apiUrl,
    hubUrl: config.hubApiUrl,
    hubSigningMode: 'pdf_pades',
    prescriptionHubEndpoint: config.hubPdfBatchSignPath,
    hubCmsInputMode: config.hubCmsInputMode,
    applicationTokenUrl: config.applicationTokenUrl,
    hasHomUrl,
    legacyPdfBatchEnvDisabled: isLegacyPdfBatchEnvExplicitlyDisabled(),
    useCmsKmsEnv: shouldUseCmsKmsHub(),
  });
  if (isLegacyPdfBatchEnvExplicitlyDisabled()) {
    console.warn(
      '[bry_env] SIGNATURE_BRY_USE_LEGACY_PDF_BATCH=false está definido no Vercel — remova essa variável. Prescrição sempre usa PDF/PAdES (cms ignorado).'
    );
  }
  if (hasHomUrl) {
    console.warn(
      '[bry_env] URL de homologação (.hom.bry.com.br) ainda configurada — atualize SIGNATURE_BRY_* no Vercel para produção.'
    );
  }
}

export type BryPscSignatureScope = 'signature_session' | 'single_signature' | 'multi_signature';

export interface BryCloudEnvConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  pdfSignPath: string;
  /** Integra BRy — gerar link PSC (substitui Portal legado /authorization/url). */
  pscLinkPath: string;
  oauthTokenPath: string;
  pscName: string;
  pscScope: BryPscSignatureScope;
  pscAuthLifetimeSec: number;
  pscNumberOfDocuments: number;
  deployment: BryCloudDeployment;
  applicationTokenUrl: string;
  /** HUB Signer — CMS/KMS (INTEGABRY), fluxo principal. */
  hubApiUrl: string;
  hubCmsSignPath: string;
  /** CMS/KMS — hashes (padrão) ou originalDocuments multipart. */
  hubCmsInputMode: BryCmsInputMode;
  /** HUB Signer — PDF/lote legado (debug / fallback via env). */
  hubPdfBatchSignPath: string;
}

export function parseBryCmsInputMode(raw: string | undefined): BryCmsInputMode {
  const v = sanitizeBryEnvValue(raw || '').toLowerCase();
  if (v === 'originaldocuments' || v === 'original_documents') return 'originalDocuments';
  return 'hashes';
}

/** `SIGNATURE_BRY_USE_LEGACY_PDF_BATCH=false` no Vercel (config antiga — não use). */
export function isLegacyPdfBatchEnvExplicitlyDisabled(): boolean {
  const explicit = sanitizeBryEnvValue(
    process.env.SIGNATURE_BRY_USE_LEGACY_PDF_BATCH || ''
  ).toLowerCase();
  return explicit === 'false' || explicit === '0' || explicit === 'no';
}

/** CMS/KMS — CAdES destacado; não usar para prescrição PDF/PAdES. */
export function shouldUseCmsKmsHub(): boolean {
  const raw = sanitizeBryEnvValue(process.env.SIGNATURE_BRY_USE_CMS_KMS || '').toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

/**
 * HUB Integra — PDF/PAdES (`/fw/v1/pdf/kms/lote/assinaturas`).
 * Padrão para prescrições. CMS só com `SIGNATURE_BRY_USE_CMS_KMS=true` (função CMS dedicada).
 * Nota: `SIGNATURE_BRY_USE_LEGACY_PDF_BATCH=false` não desativa PAdES (evita confusão com “legado”).
 */
export function shouldUseHubPdfPadesSigning(): boolean {
  return !shouldUseCmsKmsHub();
}

/** @deprecated Preferir `shouldUseHubPdfPadesSigning`. */
export function shouldUseLegacyPdfBatchHub(): boolean {
  return shouldUseHubPdfPadesSigning();
}

/** Remove aspas, quebras de linha e BOM ao colar no Vercel. */
export function sanitizeBryEnvValue(value: string): string {
  let v = value.trim();
  if (v.charCodeAt(0) === 0xfeff) v = v.slice(1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\s+/g, '');
}

function looksLikeJwt(value: string): boolean {
  return /^eyJ[\w-]*\.[\w-]*\.[\w-]*$/i.test(value.trim());
}

/** Aviso quando o secret no Vercel parece valor errado (ex.: JWT da UI). */
export function diagnoseBryClientSecretFormat(secret: string): string | null {
  const s = sanitizeBryEnvValue(secret);
  if (!s) return 'SIGNATURE_BRY_CLIENT_SECRET está vazio.';
  if (looksLikeJwt(s)) {
    return (
      'O valor em SIGNATURE_BRY_CLIENT_SECRET parece um access token JWT (botão "Emitir token JWT"), ' +
      'não a API-Key. Use o client_secret do arquivo "Download credencial" ou de "Emitir client_secret".'
    );
  }
  if (s.length < 8) {
    return 'SIGNATURE_BRY_CLIENT_SECRET parece incompleto (muito curto). Baixe novamente em Download credencial.';
  }
  return null;
}

export function resolveBryCloudDeployment(apiUrl: string): BryCloudDeployment {
  const forced = sanitizeBryEnvValue(process.env.SIGNATURE_BRY_ENV || '').toLowerCase();
  if (forced === 'hom' || forced === 'homologation' || forced === 'homologacao') {
    return 'homologation';
  }
  if (forced === 'prod' || forced === 'production' || forced === 'producao') {
    return 'production';
  }
  return /hom\.|cloud-hom|integra\.hom/i.test(apiUrl) ? 'homologation' : 'production';
}

export function bryCloudDeploymentLabel(deployment: BryCloudDeployment): string {
  return deployment === 'homologation'
    ? 'homologação (cloud-hom.bry.com.br)'
    : 'produção (cloud.bry.com.br)';
}

export function getBryCloudEnvConfig(): BryCloudEnvConfig {
  const apiUrl = sanitizeBryEnvValue(process.env.SIGNATURE_BRY_API_URL || '').replace(/\/$/, '');
  const deployment = resolveBryCloudDeployment(apiUrl);
  const applicationTokenUrl = resolveBryApplicationTokenUrl(apiUrl);
  const config: BryCloudEnvConfig = {
    apiUrl,
    clientId: sanitizeBryEnvValue(process.env.SIGNATURE_BRY_CLIENT_ID || ''),
    clientSecret: sanitizeBryEnvValue(process.env.SIGNATURE_BRY_CLIENT_SECRET || ''),
    redirectUri: sanitizeBryEnvValue(process.env.SIGNATURE_BRY_REDIRECT_URI || ''),
    deployment,
    applicationTokenUrl,
    pdfSignPath: (process.env.SIGNATURE_BRY_PDF_SIGN_PATH || '/assinadores/pdf/assinar').trim(),
    pscLinkPath: (
      process.env.SIGNATURE_BRY_PSC_LINK_PATH ||
      process.env.SIGNATURE_BRY_AUTH_URL_PATH ||
      '/psc/link'
    ).trim(),
    oauthTokenPath: (process.env.SIGNATURE_BRY_OAUTH_TOKEN_PATH || '/oauth/token').trim(),
    pscName: sanitizeBryEnvValue(process.env.SIGNATURE_BRY_PSC_NAME || ''),
    pscScope: parseBryPscScope(process.env.SIGNATURE_BRY_PSC_SCOPE),
    pscAuthLifetimeSec: parseBryPositiveInt(process.env.SIGNATURE_BRY_PSC_AUTH_LIFETIME_SEC, 604800),
    pscNumberOfDocuments: parseBryPositiveInt(process.env.SIGNATURE_BRY_PSC_NUMBER_OF_DOCUMENTS, 50),
    hubApiUrl: sanitizeBryEnvValue(process.env.SIGNATURE_BRY_HUB_API_URL || '').replace(/\/$/, ''),
    hubCmsSignPath: (
      process.env.SIGNATURE_BRY_HUB_CMS_SIGN_PATH || '/fw/v1/cms/kms/assinaturas'
    ).trim(),
    hubCmsInputMode: parseBryCmsInputMode(process.env.SIGNATURE_BRY_CMS_INPUT_MODE),
    hubPdfBatchSignPath: (
      process.env.SIGNATURE_BRY_HUB_PDF_BATCH_PATH || '/fw/v1/pdf/kms/lote/assinaturas'
    ).trim(),
  };
  logBryEnvConfigOnce(config);
  return config;
}

export function isBryHubEnvConfigured(): boolean {
  return !!getBryCloudEnvConfig().hubApiUrl;
}

export function joinBryHubApiPath(hubBase: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${hubBase.replace(/\/$/, '')}${p}`;
}

function parseBryPscScope(raw: string | undefined): BryPscSignatureScope {
  const v = sanitizeBryEnvValue(raw || '').toLowerCase();
  if (v === 'single_signature' || v === 'multi_signature' || v === 'signature_session') {
    return v;
  }
  // Sessão reutilizável para múltiplas prescrições na mesma autorização PSC.
  return 'signature_session';
}

function parseBryPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(sanitizeBryEnvValue(raw || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function isBryCloudEnvConfigured(): boolean {
  const c = getBryCloudEnvConfig();
  return !!(c.apiUrl && c.hubApiUrl && c.clientId && c.clientSecret && c.redirectUri);
}

export function bryCloudMissingEnvMessage(): string {
  const missing: string[] = [];
  const c = getBryCloudEnvConfig();
  if (!c.apiUrl) missing.push('SIGNATURE_BRY_API_URL');
  if (!c.clientId) missing.push('SIGNATURE_BRY_CLIENT_ID');
  if (!c.clientSecret) missing.push('SIGNATURE_BRY_CLIENT_SECRET');
  if (!c.redirectUri) missing.push('SIGNATURE_BRY_REDIRECT_URI');
  if (!c.hubApiUrl) missing.push('SIGNATURE_BRY_HUB_API_URL');
  return `BRy Cloud não configurado no servidor (defina: ${missing.join(', ')}).`;
}

/** JWT da aplicação (client_credentials) — homologação vs produção. */
export function resolveBryApplicationTokenUrl(apiUrl: string): string {
  const override = sanitizeBryEnvValue(process.env.SIGNATURE_BRY_TOKEN_SERVICE_URL || '');
  if (override) return override.replace(/\/$/, '');
  return resolveBryCloudDeployment(apiUrl) === 'homologation'
    ? 'https://cloud-hom.bry.com.br/token-service/jwt'
    : BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL;
}

export function bryCloudJwtCredentialHint(deployment: BryCloudDeployment): string {
  return (
    `Use o par do arquivo "Download credencial" em ${bryCloudDeploymentLabel(deployment)}: ` +
    'client_id + client_secret (API-Key de "Emitir client_secret"). Não use o access token de "Emitir token JWT". ' +
    'Se regenerou o secret na BRy, atualize o Vercel e faça redeploy.'
  );
}

export function bryCloudJwtAuthErrorHint(
  deployment: BryCloudDeployment,
  message: string,
  clientSecret: string
): string {
  const formatHint = diagnoseBryClientSecretFormat(clientSecret);
  if (formatHint) return formatHint;
  if (/client secret incorreto/i.test(message)) {
    return bryCloudJwtCredentialHint(deployment);
  }
  if (/client id incorreto/i.test(message)) {
    return bryCloudJwtCredentialHint(deployment);
  }
  return bryCloudJwtCredentialHint(deployment);
}

export function joinBryApiPath(base: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/$/, '')}${p}`;
}
