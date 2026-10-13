import { describe, expect, it } from 'vitest';
import {
  buildMetaadminPacientesUrl,
  buildSolicitacaoAcompanhamentoMedicoTexto,
} from '@/lib/metaadmin/solicitacaoMedicoAvisoWhatsapp';

describe('aviso de solicitação de acompanhamento ao médico', () => {
  it('inclui o nome do paciente, o pedido de aprovação e o link do metaadmin', () => {
    const texto = buildSolicitacaoAcompanhamentoMedicoTexto({
      medicoNome: 'Ricardo Mota',
      medicoGenero: 'M',
      pacienteNome: 'Maria Silva',
    });
    expect(texto).toContain('Olá, Dr. Ricardo Mota!');
    expect(texto).toContain('Maria Silva');
    expect(texto.toLowerCase()).toContain('aguardando aprovação');
    expect(texto).toContain(buildMetaadminPacientesUrl());
    expect(buildMetaadminPacientesUrl()).toContain('/metaadmin?menu=pacientes');
  });
});
