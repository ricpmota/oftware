/**
 * ETAPA 6 — ACL Comunicação Psiquiatra.
 * Envio bloqueado sem paciente_psiquiatra ativo; sem inventar automações WhatsApp.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const hasActiveMock = vi.fn();

vi.mock('@/lib/metapsi/hasActivePsiquiatraAccess', () => ({
  hasActivePsiquiatraAccess: (...args: unknown[]) => hasActiveMock(...args),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(async () => ({ id: 'msg1' })),
  arrayUnion: vi.fn((x) => x),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  query: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

vi.mock('@/services/pacienteMensagemService', () => ({
  PacienteMensagemService: {
    criarMensagem: vi.fn(async () => 'pm1'),
  },
}));

vi.mock('@/services/pacienteMedicoCompartilhadoService', () => ({
  PacienteMedicoCompartilhadoService: {},
}));

import { OrganizacaoMensagemService } from '@/services/organizacaoMensagemService';

describe('OrganizacaoMensagemService — ACL psiquiatra', () => {
  beforeEach(() => {
    hasActiveMock.mockReset();
  });

  it('bloqueia envio psiquiatra → paciente sem ACL ativa', async () => {
    hasActiveMock.mockResolvedValue(false);
    await expect(
      OrganizacaoMensagemService.criarMensagem({
        organizationId: 'metodo',
        from: {
          userId: 'psi1',
          role: 'psiquiatra',
          profileId: 'psi1',
          nome: 'Psi',
          email: 'psi@x.com',
        },
        to: {
          userId: 'paciente:p1',
          role: 'paciente',
          profileId: 'p1',
          nome: 'Pac',
          email: '',
        },
        titulo: 'Olá',
        mensagem: 'teste',
        mirrorPacienteMensagem: false,
      })
    ).rejects.toThrow(/Sem acesso ativo/);
    expect(hasActiveMock).toHaveBeenCalledWith('p1', 'psi1');
  });

  it('permite envio psiquiatra → paciente com ACL ativa', async () => {
    hasActiveMock.mockResolvedValue(true);
    const id = await OrganizacaoMensagemService.criarMensagem({
      organizationId: 'metodo',
      from: {
        userId: 'psi1',
        role: 'psiquiatra',
        profileId: 'psi1',
        nome: 'Psi',
        email: 'psi@x.com',
      },
      to: {
        userId: 'paciente:p1',
        role: 'paciente',
        profileId: 'p1',
        nome: 'Pac',
        email: '',
      },
      titulo: 'Olá',
      mensagem: 'teste',
      mirrorPacienteMensagem: false,
    });
    expect(id).toBeTruthy();
    expect(hasActiveMock).toHaveBeenCalledWith('p1', 'psi1');
  });

  it('não exige ACL para médico → paciente', async () => {
    hasActiveMock.mockResolvedValue(false);
    const id = await OrganizacaoMensagemService.criarMensagem({
      organizationId: 'metodo',
      from: {
        userId: 'med1',
        role: 'medico',
        profileId: 'med1',
        nome: 'Med',
        email: 'm@x.com',
      },
      to: {
        userId: 'paciente:p1',
        role: 'paciente',
        profileId: 'p1',
        nome: 'Pac',
        email: '',
      },
      titulo: 'Olá',
      mensagem: 'teste',
      mirrorPacienteMensagem: false,
    });
    expect(id).toBeTruthy();
    expect(hasActiveMock).not.toHaveBeenCalled();
  });
});
