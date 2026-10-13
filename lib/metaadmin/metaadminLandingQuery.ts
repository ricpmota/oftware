const LANDING_MENUS = new Set(['pacientes']);

/** Lê `?menu=` da URL do metaadmin (ex.: link do aviso de nova solicitação). */
export function parseMetaadminLandingMenu(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const menu = params.get('menu')?.trim() || '';
  return LANDING_MENUS.has(menu) ? menu : null;
}
