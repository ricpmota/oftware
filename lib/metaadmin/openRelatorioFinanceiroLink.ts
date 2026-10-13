/**
 * Abre o link público do relatório financeiro do paciente em nova aba.
 */
export async function openRelatorioFinanceiroLink(
  pacienteId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `/api/relatorio-financeiro/link?pacienteId=${encodeURIComponent(pacienteId)}`
    );
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data?.url) {
      return {
        ok: false,
        error: data?.error || 'Não foi possível abrir o relatório financeiro.',
      };
    }
    window.open(data.url, '_blank', 'noopener,noreferrer');
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: 'Erro ao obter link do relatório financeiro.' };
  }
}
