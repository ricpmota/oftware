import { CONTRATO_TIRZEPATIDA_TEMPLATE } from '@/lib/contratos/contratoTirzepatidaTemplate';

let cachedTemplate: string | null | undefined;
let cacheExpiresAt = 0;
const CACHE_MS = 60_000;

export function invalidateContratoPadraoTemplateClientCache(): void {
  cachedTemplate = undefined;
  cacheExpiresAt = 0;
}

export async function getContratoPadraoTemplateText(): Promise<string> {
  if (typeof window === 'undefined') {
    const { getContratoPadraoTemplateTextFromFirestore } = await import(
      '@/lib/contratos/contratoPadraoService.server'
    );
    return getContratoPadraoTemplateTextFromFirestore();
  }

  const now = Date.now();
  if (cachedTemplate !== undefined && cacheExpiresAt > now) {
    return cachedTemplate ?? CONTRATO_TIRZEPATIDA_TEMPLATE;
  }

  try {
    const res = await fetch('/api/contrato-padrao/template', { cache: 'no-store' });
    if (!res.ok) {
      return CONTRATO_TIRZEPATIDA_TEMPLATE;
    }
    const data = (await res.json()) as { template?: string };
    const template = typeof data.template === 'string' ? data.template.trim() : '';
    cachedTemplate = template || null;
    cacheExpiresAt = now + CACHE_MS;
    return template || CONTRATO_TIRZEPATIDA_TEMPLATE;
  } catch (error) {
    console.error('[contratoPadraoService] Falha ao carregar template:', error);
    return CONTRATO_TIRZEPATIDA_TEMPLATE;
  }
}
