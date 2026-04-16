import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { PacienteCompleto } from '@/types/obesidade';
import type { SeguimentoSemanal } from '@/types/obesidade';

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

function toDate(v: unknown): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  const t = (v as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** YYYY-MM-DD como dia de calendário local (evita deslocamento UTC). */
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

/**
 * POST /api/aplicacao/[token]/atualizar
 * Body: { peso: number, circunferenciaAbdominal: number, localAplicacao: 'abdome'|'coxa'|'braco' }
 * Atualiza ou cria o registro de seguimento da aplicação.
 * Semana 1: grava também em dadosClinicos.medidasIniciais (peso, cintura e IMC se houver altura) para baseline = 1ª aplicação.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const body = await request.json();
    const peso = body.peso != null ? parseFloat(String(body.peso)) : undefined;
    const circunferenciaAbdominal = body.circunferenciaAbdominal != null ? parseFloat(String(body.circunferenciaAbdominal)) : undefined;
    const localAplicacao = ['abdome', 'coxa', 'braco'].includes(body.localAplicacao) ? body.localAplicacao : undefined;

    if (peso == null || isNaN(peso) || peso <= 0) {
      return NextResponse.json({ error: 'Peso atual é obrigatório e deve ser um número positivo' }, { status: 400 });
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

    const paciente = { id: pacienteSnap.id, ...pacienteSnap.data() } as PacienteCompleto;
    const evolucao = (paciente.evolucaoSeguimento || []).slice();

    const dataPrevista = parseDataChaveLocal(data);
    const dataRegistro = new Date();

    // Procurar registro existente (data ±3 dias)
    const idx = evolucao.findIndex((e: SeguimentoSemanal & { dataRegistro?: unknown }) => {
      if (!e.dataRegistro) return false;
      const dataReg = toDate(e.dataRegistro);
      dataReg.setHours(0, 0, 0, 0);
      const diff = Math.abs((dataReg.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 3;
    });

    const weekIndex = semana ?? (evolucao.length > 0 ? Math.max(...evolucao.map((e: any) => e.weekIndex ?? e.numeroSemana ?? 0)) + 1 : 1);

    if (idx >= 0) {
      const registro = evolucao[idx] as SeguimentoSemanal & { dataRegistro?: unknown; doseAplicada?: { quantidade: number; data: unknown; horario: string } };
      registro.peso = peso;
      if (circunferenciaAbdominal != null && !isNaN(circunferenciaAbdominal)) {
        registro.circunferenciaAbdominal = circunferenciaAbdominal;
      }
      if (localAplicacao) registro.localAplicacao = localAplicacao;
      registro.doseAplicada = {
        quantidade: dose,
        data: dataRegistro,
        horario: dataRegistro.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      registro.adherence = 'ON_TIME';
      evolucao[idx] = registro;
    } else {
      const novoRegistro: SeguimentoSemanal & { id?: string } = {
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        weekIndex,
        numeroSemana: weekIndex,
        dataRegistro,
        peso,
        circunferenciaAbdominal: circunferenciaAbdominal != null && !isNaN(circunferenciaAbdominal) ? circunferenciaAbdominal : undefined,
        localAplicacao: localAplicacao as 'abdome' | 'coxa' | 'braco' | undefined,
        doseAplicada: {
          quantidade: dose,
          data: dataRegistro,
          horario: dataRegistro.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
        adherence: 'ON_TIME',
      };
      evolucao.push(novoRegistro);
      evolucao.sort((a: any, b: any) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0));
    }

    const evolucaoFirestore = evolucao.map((s: any) => {
      const seg = { ...s };
      if (seg.dataRegistro && typeof seg.dataRegistro?.toDate === 'function') {
        seg.dataRegistro = (seg.dataRegistro as any).toDate();
      }
      if (seg.doseAplicada?.data && typeof seg.doseAplicada.data?.toDate === 'function') {
        seg.doseAplicada = { ...seg.doseAplicada, data: (seg.doseAplicada.data as any).toDate() };
      }
      return seg;
    });

    const updatePayload: Record<string, unknown> = {
      evolucaoSeguimento: evolucaoFirestore,
    };

    // Semana 1: medidas da aplicação viram medidas iniciais (baseline = 1ª aplicação → variação inicial 0)
    const ehSemanaUm = weekIndex === 1;
    if (ehSemanaUm) {
      updatePayload['dadosClinicos.medidasIniciais.peso'] = peso;
      if (circunferenciaAbdominal != null && !isNaN(circunferenciaAbdominal)) {
        updatePayload['dadosClinicos.medidasIniciais.circunferenciaAbdominal'] = circunferenciaAbdominal;
      }
      const alturaCm = (paciente.dadosClinicos as any)?.medidasIniciais?.altura;
      if (typeof alturaCm === 'number' && alturaCm > 0) {
        const altM = alturaCm / 100;
        updatePayload['dadosClinicos.medidasIniciais.imc'] = Math.round((peso / (altM * altM)) * 10) / 10;
      }
    }

    await db.collection('pacientes_completos').doc(pacienteId).update(updatePayload);

    // Calcular variações para o feedback ao paciente (atual vs. anterior)
    const evolucaoOrdenada = [...evolucao].sort((a: any, b: any) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0));
    const anteriores = evolucaoOrdenada.filter((r: any) => (r.weekIndex ?? r.numeroSemana ?? 0) < weekIndex);
    const ultimoAnterior = anteriores.length > 0 ? anteriores[anteriores.length - 1] : null;
    const circunfAtualNum = circunferenciaAbdominal != null && !isNaN(circunferenciaAbdominal) ? circunferenciaAbdominal : null;

    let variacaoPeso: number | null = null;
    let variacaoCircunferencia: number | null = null;

    if (ehSemanaUm) {
      variacaoPeso = 0;
      if (circunfAtualNum != null) variacaoCircunferencia = 0;
    } else {
      const pesoAnterior = ultimoAnterior?.peso ?? (paciente.dadosClinicos as any)?.medidasIniciais?.peso;
      const circunfAnterior =
        ultimoAnterior?.circunferenciaAbdominal ?? (paciente.dadosClinicos as any)?.medidasIniciais?.circunferenciaAbdominal;

      if (pesoAnterior != null && typeof pesoAnterior === 'number') {
        variacaoPeso = peso - pesoAnterior;
      }
      if (circunfAtualNum != null && circunfAnterior != null && typeof circunfAnterior === 'number') {
        variacaoCircunferencia = circunfAtualNum - circunfAnterior;
      }
    }

    const responseJson: Record<string, unknown> = {
      success: true,
      message: 'Aplicação atualizada com sucesso!',
      variacaoPeso: variacaoPeso != null ? Math.round(variacaoPeso * 10) / 10 : null,
      variacaoCircunferencia: variacaoCircunferencia != null ? Math.round(variacaoCircunferencia * 10) / 10 : null,
      peso,
      circunferenciaAbdominal: circunfAtualNum ?? null,
    };

    // Só retorna link quando: paciente tem médico responsável E status válido para indicação
    const medicoId = paciente.medicoResponsavelId;
    const statusTrat = paciente.statusTratamento;
    const podeIndicar = medicoId && statusTrat !== 'abandono';
    if (podeIndicar) {
      const medicoDoc = await db.collection('medicos').doc(medicoId).get();
      if (medicoDoc.exists) {
        const medico = medicoDoc.data() as { nome?: string; genero?: string };
        const medicoNome = (medico?.nome || '').trim();
        const medicoGenero = (medico?.genero || 'M').toString().toUpperCase() === 'F' ? 'F' : 'M';
        const pacienteNome = (paciente.nome || (paciente.dadosIdentificacao as any)?.nomeCompleto || 'Paciente').toString().trim();
        const normalizar = (str: string) =>
          (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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
          responseJson.linkIndicacao = `/dr/${slugMedico}/paciente/${slugPaciente}`;
          responseJson.medicoNome = medicoNome;
          responseJson.medicoGenero = medicoGenero;
        }
      }
    }

    return NextResponse.json(responseJson);
  } catch (error) {
    console.error('Erro ao atualizar aplicação:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar aplicação', details: (error as Error).message },
      { status: 500 }
    );
  }
}
