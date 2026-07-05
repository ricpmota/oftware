/** Exibição de grau de obesidade (mesma lógica usada no metaadmin / metanutri). */
export function calcularGrauObesidade(imc: number | null | undefined): string | null {
  if (imc == null || Number.isNaN(imc)) return null;
  if (imc < 18.5) return 'Baixo peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade grau I';
  if (imc < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

export function getCorGrauObesidade(grau: string | null): string {
  if (!grau) return 'text-gray-600';
  if (grau.includes('Baixo')) return 'text-blue-600';
  if (grau.includes('normal')) return 'text-green-600';
  if (grau.includes('Sobrepeso')) return 'text-yellow-600';
  if (grau.includes('grau I')) return 'text-orange-600';
  if (grau.includes('grau II')) return 'text-red-600';
  return 'text-red-800';
}

export function formatDateInputValue(date: unknown): string {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date as string | number);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

export function formatDateBr(date: unknown): string {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date as string | number);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}
