import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { reconstruirDatasAplicacaoIndividuaisDaGrade } from '@/utils/datasAplicacaoSemanaPlano';

const METAADMINGERAL_EMAIL = 'ricpmota.med@gmail.com';

async function requireMetaAdminGeral(request: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false, res: NextResponse.json({ error: 'Token obrigatório.' }, { status: 401 }) };
  }
  try {
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(token);
    if (decoded.email !== METAADMINGERAL_EMAIL) {
      return { ok: false, res: NextResponse.json({ error: 'Acesso negado. Apenas MetaAdminGeral.' }, { status: 403 }) };
    }
    return { ok: true };
  } catch {
    return { ok: false, res: NextResponse.json({ error: 'Token inválido.' }, { status: 401 }) };
  }
}

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const t = (v as { toDate?: () => Date })?.toDate?.();
  if (t) return t.toISOString();
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function contaNoTotal(seg: Record<string, unknown>): boolean {
  const doseAplicada = seg.doseAplicada as Record<string, unknown> | undefined;
  const adherence = String(seg.adherence ?? seg.adesao ?? '').toUpperCase();
  return Boolean(doseAplicada) && adherence !== 'MISSED';
}

function appBaseUrl(): string {
  return (
    (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://oftware.com.br'
  ).replace(/\/$/, '');
}

/**
 * GET /api/metaadmingeral/pacientes/[pacienteId]/aplicacoes
 * Lista registros em evolucaoSeguimento (fonte do total) e tokens em aplicacao_links.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;

  const { pacienteId } = await params;
  const pid = pacienteId?.trim();
  if (!pid) {
    return NextResponse.json({ error: 'pacienteId obrigatório.' }, { status: 400 });
  }

  try {
    const db = getFirestoreAdmin();
    const pacienteSnap = await db.collection('pacientes_completos').doc(pid).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
    }

    const data = pacienteSnap.data() || {};
    const evolucao = (data.evolucaoSeguimento || []) as Record<string, unknown>[];

    const doses = evolucao.map((seg, index) => {
      const doseAplicada = seg.doseAplicada as Record<string, unknown> | undefined;
      return {
        index,
        seguimentoId: String(seg.id || `idx_${index}`),
        weekIndex: Number(seg.weekIndex ?? seg.numeroSemana ?? index + 1),
        dataRegistro: toIso(seg.dataRegistro),
        doseMg: doseAplicada?.quantidade != null ? Number(doseAplicada.quantidade) : null,
        doseData: toIso(doseAplicada?.data),
        adherence: String(seg.adherence ?? seg.adesao ?? ''),
        peso: seg.peso != null ? Number(seg.peso) : null,
        contaNoTotal: contaNoTotal(seg),
      };
    });

    const totalContado = doses.filter((d) => d.contaNoTotal).length;

    const linksSnap = await db.collection('aplicacao_links').where('pacienteId', '==', pid).get();
    const base = appBaseUrl();
    const links = linksSnap.docs
      .map((doc) => {
        const ld = doc.data();
        return {
          token: doc.id,
          data: String(ld.data || ''),
          semana: Number(ld.semana ?? 0),
          dose: Number(ld.dose ?? 0),
          key: String(ld.key || ''),
          createdAt: toIso(ld.createdAt),
          url: `${base}/aplicacao/${doc.id}`,
        };
      })
      .sort((a, b) => {
        const da = a.data || '';
        const db_ = b.data || '';
        if (da !== db_) return db_.localeCompare(da);
        return b.semana - a.semana;
      });

    return NextResponse.json({
      pacienteId: pid,
      totalContado,
      fonteTotal: 'pacientes_completos.evolucaoSeguimento',
      criterioTotal: 'doseAplicada preenchida e adherence !== MISSED',
      doses,
      links,
    });
  } catch (e) {
    console.error('[metaadmingeral/pacientes/aplicacoes GET]', e);
    return NextResponse.json({ error: 'Falha ao listar aplicações.' }, { status: 500 });
  }
}

/**
 * DELETE body:
 * - { type: 'link', token: string }
 * - { type: 'dose', seguimentoId: string } — remove registro de evolucaoSeguimento (ajusta o total)
 * - { type: 'link_e_dose', token: string, seguimentoId: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;

  const { pacienteId } = await params;
  const pid = pacienteId?.trim();
  if (!pid) {
    return NextResponse.json({ error: 'pacienteId obrigatório.' }, { status: 400 });
  }

  let body: { type?: string; token?: string; seguimentoId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 });
  }

  const type = String(body.type || '').trim();
  const token = String(body.token || '').trim();
  const seguimentoId = String(body.seguimentoId || '').trim();

  if (!['link', 'dose', 'link_e_dose'].includes(type)) {
    return NextResponse.json({ error: 'type deve ser link, dose ou link_e_dose.' }, { status: 400 });
  }
  if ((type === 'link' || type === 'link_e_dose') && !token) {
    return NextResponse.json({ error: 'token obrigatório.' }, { status: 400 });
  }
  if ((type === 'dose' || type === 'link_e_dose') && !seguimentoId) {
    return NextResponse.json({ error: 'seguimentoId obrigatório.' }, { status: 400 });
  }

  try {
    const db = getFirestoreAdmin();
    const pacienteRef = db.collection('pacientes_completos').doc(pid);
    const pacienteSnap = await pacienteRef.get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
    }

    if (type === 'link' || type === 'link_e_dose') {
      const linkRef = db.collection('aplicacao_links').doc(token);
      const linkSnap = await linkRef.get();
      if (!linkSnap.exists) {
        return NextResponse.json({ error: 'Link não encontrado.' }, { status: 404 });
      }
      if (String(linkSnap.data()?.pacienteId || '') !== pid) {
        return NextResponse.json({ error: 'Link não pertence a este paciente.' }, { status: 403 });
      }
      await linkRef.delete();
    }

    if (type === 'dose' || type === 'link_e_dose') {
      const data = pacienteSnap.data() || {};
      const evolucao = ((data.evolucaoSeguimento || []) as Record<string, unknown>[]).slice();
      const idx = evolucao.findIndex((seg, i) => {
        const id = String(seg.id || `idx_${i}`);
        return id === seguimentoId || `idx_${i}` === seguimentoId;
      });
      if (idx < 0) {
        return NextResponse.json({ error: 'Registro de dose não encontrado.' }, { status: 404 });
      }
      evolucao.splice(idx, 1);

      const plano = data.planoTerapeutico as Record<string, unknown> | undefined;
      const updatePayload: Record<string, unknown> = { evolucaoSeguimento: evolucao };
      if (plano) {
        const datasMap = reconstruirDatasAplicacaoIndividuaisDaGrade(
          plano as import('@/utils/datasAplicacaoSemanaPlano').PlanoDatasSlice,
          evolucao as import('@/utils/datasAplicacaoSemanaPlano').EvolucaoSemanaRef[]
        );
        updatePayload['planoTerapeutico.datasAplicacaoIndividuais'] = datasMap ?? null;
      }
      await pacienteRef.update(updatePayload);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[metaadmingeral/pacientes/aplicacoes DELETE]', e);
    return NextResponse.json({ error: 'Falha ao excluir.' }, { status: 500 });
  }
}
