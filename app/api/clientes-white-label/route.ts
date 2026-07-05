import { NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { gerarSlugDrMedico, medicoNomeIdentityKey } from '@/utils/medicoDrSlug';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

type StatsAgg = {
  totalPacientes: number;
  acompanhamentosConcluidos: number;
  registrosEmMonitoramento: number;
};

function emptyStats(): StatsAgg {
  return { totalPacientes: 0, acompanhamentosConcluidos: 0, registrosEmMonitoramento: 0 };
}

function resolveMedicoId(data: Record<string, unknown>): string | null {
  const ativo = String(data.medicoResponsavelId || '').trim();
  if (ativo) return ativo;
  const anterior = String(data.medicoResponsavelAnteriorId || '').trim();
  return anterior || null;
}

function accumulateStats(data: Record<string, unknown>, statsMap: Map<string, StatsAgg>) {
  const medicoId = resolveMedicoId(data);
  if (!medicoId) return;

  const agg = statsMap.get(medicoId) ?? emptyStats();
  agg.totalPacientes += 1;

  const status = String(data.statusTratamento || '');
  if (status === 'concluido') {
    agg.acompanhamentosConcluidos += 1;
  }

  if (status === 'em_tratamento' || status === 'pendente') {
    const evolucao = Array.isArray(data.evolucaoSeguimento) ? data.evolucaoSeguimento : [];
    agg.registrosEmMonitoramento += evolucao.length;
  }

  statsMap.set(medicoId, agg);
}

export async function GET() {
  try {
    const db = getFirestoreAdmin();

    const camposPaciente = ['medicoResponsavelId', 'medicoResponsavelAnteriorId', 'statusTratamento', 'evolucaoSeguimento'] as const;

    const [medicosSnap, pacientesSnap, abandonoSnap] = await Promise.all([
      db.collection('medicos').get(),
      db.collection('pacientes_completos').select(...camposPaciente).get(),
      db.collection('pacientes_abandono').select(...camposPaciente).get(),
    ]);

    const statsMap = new Map<string, StatsAgg>();
    pacientesSnap.docs.forEach((doc) => accumulateStats(doc.data() as Record<string, unknown>, statsMap));
    abandonoSnap.docs.forEach((doc) => accumulateStats(doc.data() as Record<string, unknown>, statsMap));

    const todosMedicos = medicosSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    }));

    const clientes = todosMedicos
      .map((medico) => {
        const nome = String(medico.nome || '').trim();
        const fotoPerfilUrl = String(medico.fotoPerfilUrl || '').trim();
        const isVerificado = Boolean(medico.isVerificado);
        const status = String(medico.status || '');
        if (!nome || !isVerificado || status !== 'ativo' || !fotoPerfilUrl) return null;

        const crmNum = String((medico.crm as { numero?: string } | undefined)?.numero || '').trim();
        const crmEst = String((medico.crm as { estado?: string } | undefined)?.estado || '').trim();
        const crm = crmNum && crmEst ? `CRM-${crmEst} ${crmNum}` : crmNum ? `CRM ${crmNum}` : '';

        const cidades = (medico.cidades as { cidade?: string; estado?: string }[] | undefined) ?? [];
        const primeiraCidade = cidades.find((c) => c?.cidade && c?.estado);
        const local = primeiraCidade ? `${primeiraCidade.cidade}, ${primeiraCidade.estado}` : '';

        const { first, last } = medicoNomeIdentityKey(nome);
        const baseSlug = gerarSlugDrMedico(nome);
        let slug = baseSlug;
        if (first) {
          const mesmoPar = todosMedicos.filter((m) => {
            const key = medicoNomeIdentityKey(String(m.nome || ''));
            return key.first === first && key.last === last;
          });
          const idx = mesmoPar.findIndex((m) => m.id === medico.id);
          if (idx > 0) slug = `${baseSlug}${idx + 1}`;
        }

        const stats = statsMap.get(medico.id) ?? emptyStats();

        return {
          id: medico.id,
          nome,
          genero: medico.genero === 'F' ? 'F' : 'M',
          fotoPerfilUrl,
          slug,
          href: `/dr/${slug}`,
          crm,
          local,
          totalPacientes: stats.totalPacientes,
          acompanhamentosConcluidos: stats.acompanhamentosConcluidos,
          registrosEmMonitoramento: stats.registrosEmMonitoramento,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => {
        if (b.totalPacientes !== a.totalPacientes) return b.totalPacientes - a.totalPacientes;
        if (b.registrosEmMonitoramento !== a.registrosEmMonitoramento) {
          return b.registrosEmMonitoramento - a.registrosEmMonitoramento;
        }
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });

    return NextResponse.json(
      { clientes },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Erro em clientes-white-label:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar clientes' },
      { status: 500 }
    );
  }
}
