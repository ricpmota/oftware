import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { calcularDeltaAcumuladoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';
import { resolveMedicoWhiteLabelWithMetodo } from '@/lib/server/resolveMedicoWhiteLabelWithMetodo.server';
import { buildOrganizacaoPublicUrl } from '@/lib/tenant/organizacaoPublicOrigin';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';

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

function docIdClassificacao(pacienteId: string, profissionalId: string): string {
  return `${pacienteId}_medico_${profissionalId}`;
}

/**
 * GET /api/conclusao/[token]/dados
 * Retorna dados para o formulário e se já preencheu / já classificou o médico.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const db = getFirebaseAdmin();
    const linkRef = await db.collection('conclusao_links').doc(token).get();
    if (!linkRef.exists) {
      return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    }

    const linkData = linkRef.data() as { pacienteId: string; data: string; medicoId: string };
    const { pacienteId, data, medicoId } = linkData;
    if (!pacienteId || !medicoId) {
      return NextResponse.json({ error: 'Dados do link inválidos' }, { status: 400 });
    }

    const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const paciente = pacienteSnap.data() as {
      nome?: string;
      dadosIdentificacao?: { nomeCompleto?: string };
      evolucaoSeguimento?: Array<{ weekIndex?: number; numeroSemana?: number; peso?: number; circunferenciaAbdominal?: number }>;
      dadosClinicos?: { medidasIniciais?: { peso?: number; circunferenciaAbdominal?: number } };
      planoTerapeutico?: {
        conclusaoTratamento?: {
          pesoFinalKg?: number;
          circunferenciaAbdominalFinalCm?: number;
          depoimento?: string;
          percepcaoResultadoFinal?: string;
          principalConquista?: string;
          estrelasMedico?: number;
        };
      };
    };
    const nome = paciente?.nome || paciente?.dadosIdentificacao?.nomeCompleto || 'Paciente';
    const conclusao = paciente?.planoTerapeutico?.conclusaoTratamento;
    const jaPreenchido = !!(conclusao?.pesoFinalKg != null && conclusao.pesoFinalKg > 0);
    const pesoFinalKg = conclusao?.pesoFinalKg ?? null;
    const circunferenciaAbdominalFinalCm = conclusao?.circunferenciaAbdominalFinalCm ?? null;
    const depoimento = conclusao?.depoimento ?? null;
    const percepcaoResultadoFinal = conclusao?.percepcaoResultadoFinal ?? null;
    const principalConquista = conclusao?.principalConquista ?? null;

    const classificacaoRef = await db.collection('classificacao_profissionais').doc(docIdClassificacao(pacienteId, medicoId)).get();
    const jaClassificouMedico = classificacaoRef.exists && typeof classificacaoRef.data()?.estrelas === 'number';
    const estrelasClassificacao = jaClassificouMedico ? (classificacaoRef.data()?.estrelas as number) : null;
    const estrelasMedico = estrelasClassificacao ?? conclusao?.estrelasMedico ?? null;

    const evolucaoBase = paciente?.evolucaoSeguimento || [];
    const primeiroRegistro = evolucaoBase.find((e: any) => (e.weekIndex ?? e.numeroSemana) === 1);
    const medidasIniciais = paciente?.dadosClinicos?.medidasIniciais as Record<string, unknown> | undefined;
    const pesoInicialKg = primeiroRegistro?.peso ?? (medidasIniciais?.peso as number) ?? null;
    const toNum = (v: unknown): number | null => {
      if (v == null) return null;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return !isNaN(n) && n > 0 ? n : null;
    };
    const circDoRegistro = toNum(primeiroRegistro?.circunferenciaAbdominal);
    const pac = paciente as Record<string, unknown>;
    const medIni = (pac.dadosClinicos as Record<string, unknown> | undefined)?.medidasIniciais as Record<string, unknown> | undefined;
    const circMedidas = medIni
      ? (toNum(medIni.circunferenciaAbdominal) ?? toNum(medIni.circAbdominal) ?? toNum(medIni.comprimentoAbdominal) ?? toNum((pac.medidasIniciais as Record<string, unknown>)?.circunferenciaAbdominal))
      : toNum((pac.medidasIniciais as Record<string, unknown>)?.circunferenciaAbdominal);
    const circunferenciaInicialCm = circDoRegistro ?? circMedidas ?? null;
    const pesoPerdidoAcumulado = calcularDeltaAcumuladoMedida(pesoInicialKg, pesoFinalKg);
    const circunferenciaAbdominalReduzidaCm = calcularDeltaAcumuladoMedida(
      circunferenciaInicialCm,
      circunferenciaAbdominalFinalCm
    );

    let linkRelatorio: string | null = null;
    if (jaPreenchido) {
      const relatorioSnap = await db.collection('relatorio_paciente_links').where('pacienteId', '==', pacienteId).limit(1).get();
      let relatorioToken: string;
      if (!relatorioSnap.empty) {
        relatorioToken = relatorioSnap.docs[0].id;
      } else {
        relatorioToken = crypto.randomBytes(32).toString('hex');
        await db.collection('relatorio_paciente_links').doc(relatorioToken).set({
          pacienteId,
          createdAt: new Date(),
          ...shadowOrganizationFields(),
        });
      }
      linkRelatorio = buildOrganizacaoPublicUrl(`/relatorio/${relatorioToken}`);
    }

    const medicoSnap = await db.collection('medicos').doc(medicoId).get();
    const medicoData = medicoSnap.exists
      ? (medicoSnap.data() as {
          nome?: string;
          genero?: string;
          fotoPerfilUrl?: string | null;
          whiteLabel?: {
            brandName?: string;
            description?: string;
            ogImageUrl?: string;
            primaryColor?: string;
            showPoweredByOftware?: boolean;
          };
          metodoImagensAtivo?: boolean;
        })
      : null;
    const medicoNome = medicoData?.nome?.trim() || 'Médico';
    const medicoGenero = (medicoData?.genero || 'M').toString().toUpperCase() === 'F' ? 'F' : 'M';
    const whiteLabel = await resolveMedicoWhiteLabelWithMetodo({
      nome: medicoNome,
      genero: medicoGenero,
      fotoPerfilUrl: medicoData?.fotoPerfilUrl ?? null,
      whiteLabel: medicoData?.whiteLabel,
      metodoImagensAtivo: medicoData?.metodoImagensAtivo,
      organizationId: (medicoData as { organizationId?: string } | null)?.organizationId ?? null,
    });

    const normalizar = (str: string) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    const gerarSlug = (nomeCompleto: string) => {
      const partes = nomeCompleto.split(/\s+/).filter((p: string) => p.length > 0);
      if (partes.length === 0) return '';
      const first = normalizar(partes[0]);
      const last = partes.length > 1 ? normalizar(partes[partes.length - 1]) : first;
      return `${first}-${last}`;
    };
    const slugMedico = gerarSlug(medicoNome);
    const slugPaciente = gerarSlug(nome);
    const linkIndicacao = slugMedico && slugPaciente ? `/dr/${slugMedico}/paciente/${slugPaciente}` : undefined;

    return NextResponse.json({
      nomePaciente: nome,
      data,
      medicoId,
      medicoNome,
      medicoGenero,
      whiteLabel,
      linkIndicacao,
      jaPreenchido,
      jaClassificouMedico,
      pesoFinalKg,
      circunferenciaAbdominalFinalCm,
      depoimento,
      percepcaoResultadoFinal,
      principalConquista,
      estrelasMedico,
      pesoPerdidoAcumulado,
      circunferenciaAbdominalReduzidaCm,
      linkRelatorio,
    });
  } catch (error) {
    console.error('Erro ao obter dados da conclusão:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação', details: (error as Error).message },
      { status: 500 }
    );
  }
}
