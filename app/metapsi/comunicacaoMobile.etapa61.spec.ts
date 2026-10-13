/**
 * ETAPA 6.1 — smoke: mobile Comunicação /metapsi reutiliza loadDestinatariosMetapsi + ACL.
 * Não mocka UI; garante que o loader usado pelo modal/desktop é o SoT ACL.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  getDocsFromServer: vi.fn(async () => ({ docs: [] })),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

const listVisiveis = vi.fn();

vi.mock('@/services/pacientePsiquiatraService', () => ({
  PacientePsiquiatraService: {
    listPacientesVisiveisByPsiquiatra: (...a: unknown[]) => listVisiveis(...a),
    listActiveVinculosByPaciente: vi.fn(async () => []),
  },
}));

vi.mock('@/services/psiquiatraService', () => ({
  formatPsiquiatraRegistroAdmin: () => 'N/A',
  PsiquiatraService: {
    getPsiquiatraByUserId: vi.fn(async () => ({
      id: 'psi-x',
      userId: 'psi-x',
      nome: 'Psi X',
      email: 'x@x.com',
      registroNumero: '1',
      crmUf: 'SP',
      medicoVinculadoIds: ['med-1'],
      organizationId: 'metodo',
      fotoPerfilUrl: null,
      genero: 'M',
    })),
    getAllPsiquiatras: vi.fn(async () => []),
  },
}));

vi.mock('@/services/medicoService', () => ({
  MedicoService: {
    getMedicoById: vi.fn(async () => null),
    getMedicoByUserId: vi.fn(async () => null),
    getAllMedicos: vi.fn(async () => []),
  },
}));

vi.mock('@/services/nutricionistaService', () => ({
  NutricionistaService: {
    getNutricionistaByUserId: vi.fn(async () => null),
    getAllNutricionistas: vi.fn(async () => []),
  },
}));

vi.mock('@/services/personalTrainerService', () => ({
  PersonalTrainerService: {
    getPersonalTrainerByUserId: vi.fn(async () => null),
    getAllPersonalTrainers: vi.fn(async () => []),
  },
}));

vi.mock('@/services/pacienteNutricionistaService', () => ({
  PacienteNutricionistaService: {
    listActiveVinculosByNutri: vi.fn(async () => []),
    listActiveVinculosByPaciente: vi.fn(async () => []),
  },
}));

vi.mock('@/services/pacientePersonalTrainerService', () => ({
  PacientePersonalTrainerService: {
    listActiveVinculosByPersonal: vi.fn(async () => []),
    listActiveVinculosByPaciente: vi.fn(async () => []),
  },
}));

vi.mock('@/services/pacienteService', () => ({
  PacienteService: {
    getPacienteById: vi.fn(async () => null),
    getPacienteByUserId: vi.fn(async () => null),
  },
}));

import { loadDestinatariosMetapsi } from '@/lib/organizacaoMensagem/loadDestinatarios';

describe('ETAPA 6.1 — Comunicação mobile /metapsi (ACL destinatários)', () => {
  it('lista só pacientes com ACL ativa (mesmo loader do modal mobile)', async () => {
    listVisiveis.mockResolvedValue([
      {
        pacienteId: 'pac-A',
        paciente: {
          id: 'pac-A',
          nome: 'Paciente A',
          email: 'a@a.com',
          userId: 'ua',
        },
        medicoId: 'med-1',
        status: 'ativo',
      },
    ]);

    const dest = await loadDestinatariosMetapsi({
      psiquiatraProfileId: 'psi-x',
      medicoVinculadoIds: ['med-1'],
    });

    expect(listVisiveis).toHaveBeenCalledWith('psi-x');
    const pacientes = dest.filter((d) => d.role === 'paciente');
    expect(pacientes.map((p) => p.profileId)).toEqual(['pac-A']);
    expect(pacientes.some((p) => p.profileId === 'pac-B')).toBe(false);
  });

  it('sem ACL ativa → nenhum paciente na lista', async () => {
    listVisiveis.mockResolvedValue([]);
    const dest = await loadDestinatariosMetapsi({
      psiquiatraProfileId: 'psi-x',
      medicoVinculadoIds: ['med-1', 'med-2'],
    });
    expect(dest.filter((d) => d.role === 'paciente')).toHaveLength(0);
  });
});
