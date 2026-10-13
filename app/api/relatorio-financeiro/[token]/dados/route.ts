import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';
import {
  isValidPublicLinkToken,
  normalizePublicLinkToken,
} from '@/lib/publicLinks/publicLinkToken';

function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;

  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'oftware-9201e';
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

export type MedicoRelatorioFinanceiroDto = {
  id?: string;
  nome?: string;
  genero?: string;
  crm?: { estado?: string; numero?: string };
  telefone?: string;
  whiteLabel?: { pdfLogoUrl?: string };
};

/**
 * GET /api/relatorio-financeiro/[token]/dados
 * Dados para a página /relatoriofinanceiro/[token].
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
    const linkRef = await db.collection('relatorio_financeiro_links').doc(token).get();
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

    const paciente = { id: pacienteId, ...(pacienteSnap.data() as PacienteCompleto) };
    const medicoId = paciente.medicoResponsavelId as string | undefined;

    let medico: MedicoRelatorioFinanceiroDto | null = null;
    if (medicoId) {
      const medicoRef = await db.collection('medicos').doc(medicoId).get();
      if (medicoRef.exists) {
        const m = medicoRef.data() as Record<string, unknown>;
        const genero = (m.genero || m.gender || 'M').toString().toUpperCase();
        const crm = m.crm as { estado?: string; numero?: string } | undefined;
        const whiteLabel = m.whiteLabel as { pdfLogoUrl?: string } | undefined;
        medico = {
          id: medicoId,
          nome: (m.nome || m.name || 'Médico').toString(),
          genero,
          crm:
            crm?.estado && crm?.numero
              ? { estado: crm.estado, numero: String(crm.numero) }
              : undefined,
          telefone: (m.telefone || m.phone || '')?.toString() || undefined,
          whiteLabel: whiteLabel?.pdfLogoUrl
            ? { pdfLogoUrl: whiteLabel.pdfLogoUrl }
            : undefined,
        };
      }
    }

    const pagamentoSnap = await db.collection('pagamentos_pacientes').doc(pacienteId).get();
    const pagamento = pagamentoSnap.exists
      ? ({ pacienteId, ...(pagamentoSnap.data() as PagamentoPaciente) } as PagamentoPaciente)
      : null;

    return NextResponse.json({
      paciente: serializeForJson(paciente),
      medico: medico ? serializeForJson(medico) : null,
      pagamento: pagamento ? serializeForJson(pagamento) : null,
    });
  } catch (error) {
    console.error('Erro ao buscar dados do relatório financeiro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação', details: (error as Error).message },
      { status: 500 }
    );
  }
}
