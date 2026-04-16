import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function toDate(v: unknown): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  const t = (v as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Data no formato YYYY-MM-DD como dia de calendário local (evita UTC −1 dia em pt-BR). */
function parseDataChaveLocal(dataStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dataStr).trim());
  if (!m) {
    const d = new Date(dataStr);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  return new Date(y, mo, day, 0, 0, 0, 0);
}

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

/**
 * GET /api/aplicacao/[token]/dados
 * Retorna os dados da aplicação para preenchimento (semana, dose, nome paciente).
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
    const linkRef = await db.collection('aplicacao_links').doc(token).get();
    if (!linkRef.exists) {
      return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    }

    const linkData = linkRef.data() as { pacienteId: string; data: string; semana: number; dose: number };
    const { pacienteId, data, semana, dose } = linkData;
    if (!pacienteId) {
      return NextResponse.json({ error: 'Dados do link inválidos' }, { status: 400 });
    }

    const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const paciente = pacienteSnap.data() as {
      nome?: string;
      dadosIdentificacao?: { nomeCompleto?: string };
      medicoResponsavelId?: string;
      statusTratamento?: string;
      evolucaoSeguimento?: Array<{
        weekIndex?: number;
        numeroSemana?: number;
        dataRegistro?: unknown;
        peso?: number;
        circunferenciaAbdominal?: number;
        doseAplicada?: { quantidade?: number };
        adherence?: string;
        adesao?: string;
      }>;
      dadosClinicos?: { medidasIniciais?: { peso?: number; circunferenciaAbdominal?: number } };
    };
    const nome = paciente?.nome || paciente?.dadosIdentificacao?.nomeCompleto || 'Paciente';

    const dataPrevista = parseDataChaveLocal(data);
    const evolucao = paciente.evolucaoSeguimento || [];
    const registro = evolucao.find((e: any) => {
      if (!e.dataRegistro) return false;
      const dataReg = toDate(e.dataRegistro);
      dataReg.setHours(0, 0, 0, 0);
      const diff = Math.abs((dataReg.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 3;
    });

    const ehPerdida = registro?.adherence === 'MISSED' || registro?.adesao === 'esquecida';
    const jaPreenchido = !!registro?.doseAplicada?.quantidade && registro.doseAplicada.quantidade > 0 && !ehPerdida && registro.peso != null && registro.peso > 0;

    const response: Record<string, unknown> = {
      semana: semana ?? linkData.semana,
      dose: dose ?? linkData.dose,
      data,
      nomePaciente: nome,
      jaPreenchido,
    };

    // Sempre retorna nome e gênero do médico (para exibir no cabeçalho)
    const medicoId = paciente.medicoResponsavelId;
    const statusTrat = paciente.statusTratamento;
    const podeIndicar = medicoId && statusTrat !== 'abandono';
    if (medicoId) {
      const medicoDoc = await db.collection('medicos').doc(medicoId).get();
      if (medicoDoc.exists) {
        const medico = medicoDoc.data() as { nome?: string; genero?: string };
        const medicoNomeVal = (medico?.nome || '').trim();
        const medicoGeneroVal = (medico?.genero || 'M').toString().toUpperCase() === 'F' ? 'F' : 'M';
        if (medicoNomeVal) {
          response.medicoNome = medicoNomeVal;
          response.medicoGenero = medicoGeneroVal;
        }
      }
    }

    if (jaPreenchido && registro) {
      const weekIndex = registro.weekIndex ?? registro.numeroSemana ?? semana;
      const evolucaoOrdenada = [...evolucao].sort((a: any, b: any) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0));
      const anteriores = evolucaoOrdenada.filter((r: any) => (r.weekIndex ?? r.numeroSemana ?? 0) < weekIndex);
      const ultimoAnterior = anteriores.length > 0 ? anteriores[anteriores.length - 1] : null;
      const pesoAnterior = ultimoAnterior?.peso ?? paciente.dadosClinicos?.medidasIniciais?.peso;
      const circunfAnterior = ultimoAnterior?.circunferenciaAbdominal ?? paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;

      let variacaoPeso: number | null = null;
      if (pesoAnterior != null && typeof pesoAnterior === 'number') {
        variacaoPeso = (registro.peso ?? 0) - pesoAnterior;
      }
      let variacaoCircunferencia: number | null = null;
      const circunfAtual = registro.circunferenciaAbdominal;
      if (circunfAtual != null && circunfAnterior != null && typeof circunfAnterior === 'number') {
        variacaoCircunferencia = circunfAtual - circunfAnterior;
      }

      response.variacaoPeso = variacaoPeso != null ? Math.round(variacaoPeso * 10) / 10 : null;
      response.variacaoCircunferencia = variacaoCircunferencia != null ? Math.round(variacaoCircunferencia * 10) / 10 : null;
      response.peso = registro.peso;
      response.circunferenciaAbdominal = circunfAtual ?? null;

      // Link para o paciente indicar o médico (Indicar Médico)
      // Só disponível quando: paciente tem médico responsável E está em_tratamento ou concluido (não abandono/pendente)
      if (podeIndicar && response.medicoNome) {
        const medicoNome = response.medicoNome as string;
        const pacienteNome = (paciente?.nome || paciente?.dadosIdentificacao?.nomeCompleto || nome || 'Paciente').toString().trim();
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
        const slugPaciente = gerarSlug(pacienteNome);
        if (slugMedico && slugPaciente) {
          response.linkIndicacao = `/dr/${slugMedico}/paciente/${slugPaciente}`;
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao obter dados da aplicação:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação', details: (error as Error).message },
      { status: 500 }
    );
  }
}
