import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import {
  deveArquivarConclusao,
  mergeHistoricoConclusaoNoPlano,
  snapshotConclusaoParaHistorico,
} from '@/utils/conclusaoTratamentoHistorico';
import { calcularDeltaAcumuladoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';
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
 * POST /api/conclusao/[token]/atualizar
 * Body: { pesoFinalKg: number, circunferenciaAbdominalFinalCm?: number, estrelasMedico?: number (1-5) }
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
    const pesoFinalKg = body.pesoFinalKg != null ? parseFloat(String(body.pesoFinalKg)) : undefined;
    const circunferenciaAbdominalFinalCm = body.circunferenciaAbdominalFinalCm != null ? parseFloat(String(body.circunferenciaAbdominalFinalCm)) : undefined;
    const estrelasMedico = body.estrelasMedico != null ? Math.max(1, Math.min(5, Math.round(Number(body.estrelasMedico)))) : undefined;
    const depoimentoRaw = body.depoimento != null ? String(body.depoimento).trim() : '';
    const depoimento = depoimentoRaw.length > 0 ? depoimentoRaw.slice(0, 3000) : undefined;
    const percepcaoResultadoFinalRaw = body.percepcaoResultadoFinal != null ? String(body.percepcaoResultadoFinal).trim() : '';
    const percepcaoResultadoFinal = percepcaoResultadoFinalRaw.length > 0 ? percepcaoResultadoFinalRaw.slice(0, 200) : undefined;
    const principalConquistaRaw = body.principalConquista != null ? String(body.principalConquista).trim() : '';
    const principalConquista = principalConquistaRaw.length > 0 ? principalConquistaRaw.slice(0, 200) : undefined;

    const db = getFirebaseAdmin();
    const linkRef = await db.collection('conclusao_links').doc(token).get();
    if (!linkRef.exists) {
      return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    }

    const linkData = linkRef.data() as { pacienteId: string; data: string; medicoId: string };
    const { pacienteId, data, medicoId } = linkData;
    if (!pacienteId) {
      return NextResponse.json({ error: 'Dados do link inválidos' }, { status: 400 });
    }

    const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const paciente = pacienteSnap.data() as Record<string, unknown> & {
      evolucaoSeguimento?: Array<Record<string, unknown> & { id?: string; comentarioMedico?: string; weekIndex?: number; numeroSemana?: number; peso?: number; circunferenciaAbdominal?: number }>;
      dadosClinicos?: { medidasIniciais?: { peso?: number; circunferenciaAbdominal?: number } };
      planoTerapeutico?: Record<string, unknown> & {
        numeroSemanasTratamento?: number;
        conclusaoTratamento?: { dataConclusao?: unknown; pesoFinalKg?: number; circunferenciaAbdominalFinalCm?: number };
      };
    };

    const planoPre = paciente.planoTerapeutico || {};
    const conclusaoExistente = planoPre.conclusaoTratamento as Record<string, unknown> | undefined;
    const pesoExistente = conclusaoExistente?.pesoFinalKg != null ? parseFloat(String(conclusaoExistente.pesoFinalKg)) : undefined;
    const jaPreenchidoParcial = pesoExistente != null && !isNaN(pesoExistente) && pesoExistente > 0;

    let pesoFinalResolved = pesoFinalKg;
    if ((pesoFinalResolved == null || isNaN(pesoFinalResolved) || pesoFinalResolved <= 0) && jaPreenchidoParcial && pesoExistente) {
      pesoFinalResolved = pesoExistente;
    }

    if (pesoFinalResolved == null || isNaN(pesoFinalResolved) || pesoFinalResolved <= 0) {
      return NextResponse.json({ error: 'Peso final é obrigatório e deve ser um número positivo' }, { status: 400 });
    }

    const circExistente = conclusaoExistente?.circunferenciaAbdominalFinalCm != null
      ? parseFloat(String(conclusaoExistente.circunferenciaAbdominalFinalCm))
      : undefined;
    let circunferenciaFinalResolved = circunferenciaAbdominalFinalCm;
    if ((circunferenciaFinalResolved == null || isNaN(circunferenciaFinalResolved)) && circExistente != null && !isNaN(circExistente)) {
      circunferenciaFinalResolved = circExistente;
    }

    const evolucaoBase = paciente.evolucaoSeguimento || [];
    const primeiroRegistro = evolucaoBase.find((e: any) => (e.weekIndex ?? e.numeroSemana) === 1);
    const medidasIniciais = paciente.dadosClinicos?.medidasIniciais as Record<string, unknown> | undefined;
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
    const circunferenciaInicialCm = circDoRegistro ?? circMedidas;

    const pesoPerdidoAcumulado = calcularDeltaAcumuladoMedida(pesoInicialKg, pesoFinalResolved);
    const circunferenciaAbdominalReduzidaCm = calcularDeltaAcumuladoMedida(
      circunferenciaInicialCm,
      circunferenciaFinalResolved != null && !isNaN(circunferenciaFinalResolved) ? circunferenciaFinalResolved : null
    );

    const dataConclusao = new Date(data);
    dataConclusao.setHours(12, 0, 0, 0);

    const planoTerapeuticoRaw = paciente.planoTerapeutico || {};
    const anterior = planoTerapeuticoRaw.conclusaoTratamento as Record<string, unknown> | undefined;
    let planoBase: Record<string, unknown> = { ...planoTerapeuticoRaw };

    if (anterior && deveArquivarConclusao(anterior)) {
      let estrelasArq: number | null = null;
      if (medicoId) {
        const classSnap = await db.collection('classificacao_profissionais').doc(docIdClassificacao(pacienteId, medicoId)).get();
        const e = classSnap.data()?.estrelas;
        if (typeof e === 'number') estrelasArq = Math.min(5, Math.max(1, Math.round(e)));
      }
      const snap = snapshotConclusaoParaHistorico(anterior, {
        estrelas: estrelasArq,
        evolucaoSeguimento: paciente.evolucaoSeguimento,
      });
      planoBase = mergeHistoricoConclusaoNoPlano(planoBase, snap);
    }

    const conclusaoTratamento: Record<string, unknown> = {
      dataConclusao,
      pesoFinalKg: pesoFinalResolved,
      updatedAt: new Date(),
      ...(circunferenciaFinalResolved != null && !isNaN(circunferenciaFinalResolved)
        ? { circunferenciaAbdominalFinalCm: circunferenciaFinalResolved }
        : {}),
      ...(depoimento != null && depoimento.length > 0
        ? { depoimento }
        : conclusaoExistente?.depoimento
          ? { depoimento: conclusaoExistente.depoimento }
          : {}),
      ...(percepcaoResultadoFinal
        ? { percepcaoResultadoFinal }
        : conclusaoExistente?.percepcaoResultadoFinal
          ? { percepcaoResultadoFinal: conclusaoExistente.percepcaoResultadoFinal }
          : {}),
      ...(principalConquista
        ? { principalConquista }
        : conclusaoExistente?.principalConquista
          ? { principalConquista: conclusaoExistente.principalConquista }
          : {}),
      ...(estrelasMedico != null ? { estrelasMedico } : conclusaoExistente?.estrelasMedico != null ? { estrelasMedico: conclusaoExistente.estrelasMedico } : {}),
    };

    const planoTerapeutico = {
      ...planoBase,
      conclusaoTratamento,
    };

    const numeroSemanas = Number(paciente.planoTerapeutico?.numeroSemanasTratamento) || 18;
    const evolucao = (paciente.evolucaoSeguimento || []).slice();

    const ehConclusao = (r: Record<string, unknown>) =>
      (typeof r.id === 'string' && r.id.startsWith('seguimento-conclusao-')) ||
      (typeof r.comentarioMedico === 'string' && r.comentarioMedico.toLowerCase().includes('conclusão'));

    const idxConclusao = evolucao.findIndex((r: Record<string, unknown>) => ehConclusao(r as any));
    const seguimentoConclusao = {
      id: `seguimento-conclusao-${Date.now()}`,
      weekIndex: numeroSemanas + 1,
      numeroSemana: numeroSemanas + 1,
      dataRegistro: dataConclusao,
      peso: pesoFinalResolved,
      ...(circunferenciaFinalResolved != null && !isNaN(circunferenciaFinalResolved) ? { circunferenciaAbdominal: circunferenciaFinalResolved } : {}),
      comentarioMedico: 'Semana de Conclusão',
      doseAplicada: { quantidade: 0, data: dataConclusao, horario: dataConclusao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
      adherence: 'ON_TIME',
    };

    if (idxConclusao >= 0) {
      evolucao[idxConclusao] = { ...evolucao[idxConclusao], ...seguimentoConclusao } as any;
    } else {
      evolucao.push(seguimentoConclusao as any);
      evolucao.sort((a: any, b: any) => (a.weekIndex ?? a.numeroSemana ?? 0) - (b.weekIndex ?? b.numeroSemana ?? 0));
    }

    const updateData: Record<string, unknown> = {
      planoTerapeutico,
      evolucaoSeguimento: evolucao,
      statusTratamento: 'concluido',
    };

    await db.collection('pacientes_completos').doc(pacienteId).update(updateData);

    // Mover Lead de Em Tratamento para Concluído (buscar pelo e-mail do paciente)
    const pacienteEmail = ((paciente.email || (paciente.dadosIdentificacao as Record<string, unknown>)?.email || '') as string)?.trim();
    if (pacienteEmail && pacienteEmail.includes('@')) {
      try {
        const leadsSnap = await db.collection('leads_medico').where('medicoId', '==', medicoId).get();
        const emailNorm = pacienteEmail.toLowerCase();
        const leadDoc = leadsSnap.docs.find((d) => ((d.data().email || '') as string).toLowerCase() === emailNorm);
        if (leadDoc) {
          const leadData = leadDoc.data() as { status?: string };
          if (leadData.status === 'em_tratamento') {
            await leadDoc.ref.update({
              status: 'concluido',
              dataStatus: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      } catch (leadErr) {
        console.warn('Erro ao atualizar lead (não crítico):', leadErr);
      }
    }

    if (estrelasMedico != null && medicoId) {
      const docId = docIdClassificacao(pacienteId, medicoId);
      await db.collection('classificacao_profissionais').doc(docId).set({
        pacienteId,
        profissionalTipo: 'medico',
        profissionalId: medicoId,
        estrelas: estrelasMedico,
        updatedAt: new Date(),
      }, { merge: true });
    }

    // Obter ou criar link do relatório (mesmo enviado por e-mail na Conclusão do Tratamento)
    let linkRelatorio: string | null = null;
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

    let medicoNome: string | undefined;
    let medicoGenero: 'M' | 'F' = 'M';
    let linkIndicacao: string | undefined;
    if (medicoId) {
      const medicoSnap = await db.collection('medicos').doc(medicoId).get();
      if (medicoSnap.exists) {
        const medico = medicoSnap.data() as { nome?: string; genero?: string };
        medicoNome = (medico?.nome || '').trim() || undefined;
        medicoGenero = (medico?.genero || 'M').toString().toUpperCase() === 'F' ? 'F' : 'M';
        const pacienteNome = (paciente.nome || (paciente.dadosIdentificacao as Record<string, unknown>)?.nomeCompleto || 'Paciente').toString().trim();
        const normalizar = (str: string) =>
          (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const gerarSlug = (n: string) => {
          const partes = n.split(/\s+/).filter((p: string) => p.length > 0);
          if (partes.length === 0) return '';
          const first = normalizar(partes[0]);
          const last = partes.length > 1 ? normalizar(partes[partes.length - 1]) : first;
          return `${first}-${last}`;
        };
        const slugMedico = gerarSlug(medicoNome || '');
        const slugPaciente = gerarSlug(pacienteNome);
        if (slugMedico && slugPaciente) linkIndicacao = `/dr/${slugMedico}/paciente/${slugPaciente}`;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Conclusão registrada com sucesso!',
      pesoPerdidoAcumulado,
      circunferenciaAbdominalReduzidaCm,
      linkRelatorio,
      linkIndicacao,
      medicoNome,
      medicoGenero,
      depoimento: depoimento ?? (conclusaoExistente?.depoimento as string | undefined) ?? null,
      percepcaoResultadoFinal: percepcaoResultadoFinal ?? (conclusaoExistente?.percepcaoResultadoFinal as string | undefined) ?? null,
      principalConquista: principalConquista ?? (conclusaoExistente?.principalConquista as string | undefined) ?? null,
      estrelasMedico: estrelasMedico ?? (conclusaoExistente?.estrelasMedico as number | undefined) ?? null,
    });
  } catch (error) {
    console.error('Erro ao atualizar conclusão:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar conclusão', details: (error as Error).message },
      { status: 500 }
    );
  }
}
