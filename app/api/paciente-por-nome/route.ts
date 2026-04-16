import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;

  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "oftware-9201e";
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
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: processedKey,
      }),
    });
  }

  return getFirestore(adminApp);
}

/**
 * GET /api/paciente-por-nome?nome=joao-silva&medicoId=xxx
 * Busca paciente por slug (nome-sobrenome). Se medicoId informado, filtra por medicoResponsavelId.
 * Usado na página /dr/[medico]/paciente/[slugPaciente] para indicação de paciente.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nomeSobrenome = searchParams.get('nome');
    const medicoId = searchParams.get('medicoId') || undefined;
    const incluirEvolucao = searchParams.get('incluirEvolucao') === 'true';

    if (!nomeSobrenome) {
      return NextResponse.json(
        { error: 'Parâmetro "nome" é obrigatório' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();

    const normalizar = (str: string) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const partesSlug = nomeSobrenome.split('-').filter((p) => p.length > 0);
    const firstSlug = partesSlug[0] ? normalizar(partesSlug[0]) : '';
    const lastSlug = partesSlug.length > 1 ? normalizar(partesSlug[partesSlug.length - 1]) : firstSlug;

    let pacientesSnapshot;
    if (medicoId) {
      pacientesSnapshot = await db
        .collection('pacientes_completos')
        .where('medicoResponsavelId', '==', medicoId)
        .get();
    } else {
      pacientesSnapshot = await db.collection('pacientes_completos').get();
    }

    const pacientes = pacientesSnapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        const base = {
          id: docSnap.id,
          nome: data.nome || data.dadosIdentificacao?.nomeCompleto || '',
          userId: data.userId,
          email: data.email,
          medicoResponsavelId: data.medicoResponsavelId,
          status: data.status,
          statusTratamento: data.statusTratamento,
        };
        if (incluirEvolucao) {
          const evolucao = (data.evolucaoSeguimento || []) as Array<{ weekIndex?: number; numeroSemana?: number; peso?: number; dataRegistro?: unknown }>;
          const medidasIniciais = (data.dadosClinicos as { medidasIniciais?: { peso?: number } } | undefined)?.medidasIniciais;
          const pesoInicial = medidasIniciais?.peso;
          const pontos = evolucao
            .filter((e) => e.peso != null && e.peso > 0)
            .map((e) => ({
              weekIndex: e.weekIndex ?? e.numeroSemana ?? 0,
              peso: e.peso,
              dataRegistro: e.dataRegistro,
            }))
            .sort((a, b) => a.weekIndex - b.weekIndex);
          return { ...base, evolucaoPeso: pontos, pesoInicial };
        }
        return base;
      })
      .filter((p: any) => {
        const nomeCompleto = (p.nome || '').trim();
        if (!nomeCompleto) return false;
        const partes = nomeCompleto.split(/\s+/).filter((pn: string) => pn.length > 0);
        if (partes.length === 0) return false;
        const firstNome = normalizar(partes[0]);
        const lastNome = partes.length > 1 ? normalizar(partes[partes.length - 1]) : firstNome;
        if (firstNome !== firstSlug || lastNome !== lastSlug) return false;
        // No fluxo de indicação (medicoId informado): só pacientes em_tratamento ou concluido
        if (medicoId) {
          const st = p.statusTratamento;
          if (st === 'abandono' || st === 'pendente') return false;
          if (p.status !== 'ativo') return false;
        }
        return true;
      });

    if (pacientes.length === 0) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      );
    }

    const paciente = pacientes[0];

    const res: Record<string, unknown> = {
      id: paciente.id,
      nome: paciente.nome,
      userId: paciente.userId,
      email: paciente.email,
      medicoResponsavelId: paciente.medicoResponsavelId,
      status: paciente.status || 'ativo',
      statusTratamento: paciente.statusTratamento,
    };
    if ((paciente as { evolucaoPeso?: unknown; pesoInicial?: number }).evolucaoPeso) {
      res.evolucaoPeso = (paciente as { evolucaoPeso: unknown }).evolucaoPeso;
      res.pesoInicial = (paciente as { pesoInicial?: number }).pesoInicial;
    }
    return NextResponse.json(res);
  } catch (error) {
    console.error('Erro ao buscar paciente por nome:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar paciente', details: (error as Error).message },
      { status: 500 }
    );
  }
}
