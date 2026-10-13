export type RelatorioShareCopyInput = {
  pacienteNome?: string | null;
  medicoNome?: string | null;
  medicoGenero?: string | null;
};

export type RelatorioShareCopy = {
  title: string;
  description: string;
};

function medicoLabel(nome: string, genero: string | null | undefined): string {
  const titulo = String(genero || '').toUpperCase() === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${nome}`;
}

/** Texto do cartão de compartilhamento do /relatorio (título e descrição). */
export function buildRelatorioShareCopy(input: RelatorioShareCopyInput = {}): RelatorioShareCopy {
  const pacienteNome = (input.pacienteNome || '').replace(/\s+/g, ' ').trim();
  const medicoNome = (input.medicoNome || '').replace(/\s+/g, ' ').trim();
  const title = (pacienteNome ? `Relatório de ${pacienteNome}` : 'Relatório do paciente').slice(0, 70);
  const description = (
    medicoNome
      ? `Evolução do tratamento, exames e acompanhamento com ${medicoLabel(medicoNome, input.medicoGenero)}.`
      : 'Evolução do tratamento, exames e acompanhamento deste paciente.'
  ).slice(0, 160);
  return { title, description };
}
