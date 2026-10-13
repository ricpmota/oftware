import { describe, expect, it } from 'vitest';
import type { Prescricao } from '@/types/prescricao';
import {
  isProtocoloCatalogoProprioMedico,
  prescricaoDeveFicarEmEdicao,
  resolverDestinoSalvarPrescricao,
} from './destinoSalvarPrescricao';

const medicoId = 'med-1';

function proto(over: Partial<Prescricao> = {}): Prescricao {
  return {
    id: 'p1',
    medicoId,
    nome: 'Teste',
    descricao: 'desc',
    itens: [],
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    criadoPor: 'a@b.c',
    isTemplate: false,
    catalogoAba: 'protocolo',
    ...over,
  };
}

describe('destinoSalvarPrescricao', () => {
  it('reconhece protocolo próprio do catálogo', () => {
    expect(isProtocoloCatalogoProprioMedico(proto(), medicoId)).toBe(true);
    expect(isProtocoloCatalogoProprioMedico(proto({ isTemplate: true }), medicoId)).toBe(false);
    expect(isProtocoloCatalogoProprioMedico(proto({ pacienteId: 'pac-1' }), medicoId)).toBe(false);
    expect(isProtocoloCatalogoProprioMedico(proto({ medicoId: 'SISTEMA', isTemplate: true }), medicoId)).toBe(
      false
    );
    expect(isProtocoloCatalogoProprioMedico(proto({ id: 'temp-new' }), medicoId)).toBe(false);
  });

  it('mantém em edição histórico do paciente e protocolo próprio', () => {
    expect(prescricaoDeveFicarEmEdicao(proto({ pacienteId: 'pac-1', catalogoAba: 'prescricao' }), medicoId)).toBe(
      true
    );
    expect(prescricaoDeveFicarEmEdicao(proto(), medicoId)).toBe(true);
    expect(prescricaoDeveFicarEmEdicao(proto({ isTemplate: true, medicoId: 'SISTEMA' }), medicoId)).toBe(false);
  });

  it('template/novo protocolo cria no catálogo; prescrição cria no histórico', () => {
    expect(
      resolverDestinoSalvarPrescricao({
        catalogoAba: 'protocolo',
        atualizarHistoricoPaciente: false,
        atualizarProtocoloCatalogo: false,
      })
    ).toBe('catalogo_protocolo');
    expect(
      resolverDestinoSalvarPrescricao({
        catalogoAba: 'prescricao',
        atualizarHistoricoPaciente: false,
        atualizarProtocoloCatalogo: false,
      })
    ).toBe('historico_paciente');
    expect(
      resolverDestinoSalvarPrescricao({
        catalogoAba: 'protocolo',
        atualizarHistoricoPaciente: false,
        atualizarProtocoloCatalogo: true,
      })
    ).toBe('atualizar');
  });
});
