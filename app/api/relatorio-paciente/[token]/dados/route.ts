import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { MedicoPerfilRelatorio } from '@/utils/relatorioPacientePdf';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  isValidPublicLinkToken,
  normalizePublicLinkToken,
} from '@/lib/publicLinks/publicLinkToken';
import { gerarSlugDrMedico } from '@/utils/medicoDrSlug';
import { normalizeMedicoInstagramUsuario } from '@/utils/instagramUsuario';
import { resolveMedicoWhiteLabel } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { DEFAULT_DR_PAGE_BACKGROUND, DEFAULT_DR_PAGE_TEXT } from '@/lib/whiteLabel/publicPagesTheme';
import { mapSolicitacaoExamesFromFirestore } from '@/utils/solicitacaoExamesPdfDownload';

function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;

  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!privateKey || !clientEmail) {
      throw new Error('Variáveis de ambiente do Firebase Admin não configuradas');
    }

    let processedKey = privateKey.replace(/\\n/g, '\n');
    if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
      processedKey = processedKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
        .replace(/\n+/g, '\n');
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: processedKey,
      }),
    });
  }

  return getFirestore(adminApp);
}

function serializeForJson(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  const t = obj as Record<string, unknown>;
  if (typeof t.toDate === 'function') return (t.toDate as () => Date)().toISOString();
  if (Array.isArray(obj)) return obj.map(serializeForJson);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(t)) out[k] = serializeForJson(v);
  return out;
}

/**
 * GET /api/relatorio-paciente/[token]/dados
 * Retorna os dados do relatório (paciente + médico) para a página /relatorio/[token] exibir.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = normalizePublicLinkToken((await params).token);
    if (!isValidPublicLinkToken(token)) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const db = getFirebaseAdmin();
    const linkRef = await db.collection('relatorio_paciente_links').doc(token).get();
    if (!linkRef.exists) {
      return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    }

    const linkData = linkRef.data() as { pacienteId: string };
    const pacienteId = linkData?.pacienteId;
    if (!pacienteId) {
      return NextResponse.json({ error: 'Dados do link inválidos' }, { status: 400 });
    }

    const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const paciente = {
      ...(pacienteSnap.data() as PacienteCompleto),
      id: pacienteSnap.id,
    };
    const medicoId = paciente.medicoResponsavelId as string | undefined;

    let medicoPerfil: MedicoPerfilRelatorio | null = null;
    if (medicoId) {
      const medicoRef = await db.collection('medicos').doc(medicoId).get();
      if (medicoRef.exists) {
        const medico = medicoRef.data() as Record<string, unknown>;
        const genero = (medico.genero || medico.gender || 'M').toString().toUpperCase();
        const base = (medico.nome || medico.name || 'Médico').toString();
        const crm = medico.crm as { estado?: string; numero?: string } | undefined;
        const fotoPerfilUrl =
          typeof medico.fotoPerfilUrl === 'string' && medico.fotoPerfilUrl.trim()
            ? medico.fotoPerfilUrl.trim()
            : null;
        const wl = resolveMedicoWhiteLabel({
          nome: base,
          genero: genero === 'F' ? 'F' : 'M',
          fotoPerfilUrl,
          whiteLabel: (medico.whiteLabel as Parameters<typeof resolveMedicoWhiteLabel>[0]['whiteLabel']) ?? null,
          organizationId: typeof medico.organizationId === 'string' ? medico.organizationId : null,
        });
        medicoPerfil = {
          id: medicoId,
          nome: base,
          genero,
          crm: crm?.estado && crm?.numero ? { estado: crm.estado, numero: String(crm.numero) } : undefined,
          telefone: (medico.telefone || medico.phone || '')?.toString() || undefined,
          telefoneDdi: typeof medico.telefoneDdi === 'string' ? medico.telefoneDdi : undefined,
          telefonePais: typeof medico.telefonePais === 'string' ? medico.telefonePais : undefined,
          cidades: Array.isArray(medico.cidades) ? medico.cidades as Array<{ cidade?: string; estado?: string }> : undefined,
          localizacao: medico.localizacao && typeof medico.localizacao === 'object' ? { endereco: (medico.localizacao as Record<string, unknown>).endereco as string } : undefined,
          fotoPerfilUrl: wl.profilePhotoUrl || fotoPerfilUrl,
          isVerificado: medico.isVerificado === true,
          slug: gerarSlugDrMedico(base),
          primaryColor: wl.primaryColor,
          pageBg: wl.publicPages.dr.backgroundColor || DEFAULT_DR_PAGE_BACKGROUND,
          pageText: wl.publicPages.dr.textColor || DEFAULT_DR_PAGE_TEXT,
          instagramUsuario: normalizeMedicoInstagramUsuario(medico.instagramUsuario),
        };
      }
    }

    const [pagamentoSnap, prescricoesSnap, solicitacoesSnap] = await Promise.all([
      db.collection('pagamentos_pacientes').doc(pacienteId).get(),
      db.collection('prescricoes').where('pacienteId', '==', pacienteId).get(),
      db
        .collection('pacientes_completos')
        .doc(pacienteId)
        .collection('solicitacoesExames')
        .get(),
    ]);

    const pagamento = pagamentoSnap.exists
      ? { ...(pagamentoSnap.data() as Record<string, unknown>), pacienteId }
      : null;

    const prescricoes = prescricoesSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Record<string, unknown>) }))
      .filter((p) => p.isTemplate !== true);

    const solicitacoesExames = solicitacoesSnap.docs
      .map((docSnap) =>
        mapSolicitacaoExamesFromFirestore(
          docSnap.id,
          pacienteId,
          docSnap.data() as Record<string, unknown>
        )
      )
      .filter((s) => Boolean(s.signedPdfUrl));

    let pacienteFotoPerfilUrl: string | null = null;
    const pacienteUserId =
      typeof paciente.userId === 'string' ? paciente.userId.trim() : '';
    if (pacienteUserId) {
      try {
        const authUser = await getAuth(getApps()[0]).getUser(pacienteUserId);
        const photo = authUser.photoURL?.trim();
        if (photo) pacienteFotoPerfilUrl = photo;
      } catch {
        /* Auth indisponível — segue sem foto */
      }
    }

    return NextResponse.json({
      paciente: serializeForJson(paciente),
      medicoPerfil: medicoPerfil ? serializeForJson(medicoPerfil) : null,
      pagamento: pagamento ? serializeForJson(pagamento) : null,
      prescricoes: serializeForJson(prescricoes),
      solicitacoesExames: serializeForJson(solicitacoesExames),
      pacienteFotoPerfilUrl,
    });
  } catch (error) {
    console.error('Erro ao buscar dados do relatório:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação', details: (error as Error).message },
      { status: 500 }
    );
  }
}
