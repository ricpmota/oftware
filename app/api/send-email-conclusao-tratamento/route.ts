import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';
import crypto from 'crypto';
import type { MedicoPerfilRelatorio } from '@/utils/relatorioPacientePdf';

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

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const asTimestamp = v as { toDate?: () => Date; _seconds?: number };
  if (typeof asTimestamp.toDate === 'function') {
    const d = asTimestamp.toDate();
    return d && !isNaN(d.getTime()) ? d : null;
  }
  if (typeof asTimestamp._seconds === 'number') {
    return new Date(asTimestamp._seconds * 1000);
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Duração do tratamento = número de aplicações realizadas (semanas com dose aplicada).
 * Retorna texto, ex: "4 semanas" ou "1 semana".
 */
function duracaoTratamentoTexto(evolucaoSeguimento: Array<{ doseAplicada?: { data?: unknown; quantidade?: number } }>): string {
  const n = (evolucaoSeguimento || []).filter(
    (e) => e.doseAplicada != null && (e.doseAplicada.data != null || e.doseAplicada.quantidade != null)
  ).length;
  return n === 1 ? '1 semana' : `${n} semanas`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pacienteId, pesoFinal: pesoFinalStr } = body;

    if (!pacienteId || pesoFinalStr === undefined || pesoFinalStr === null || pesoFinalStr === '') {
      return NextResponse.json(
        { error: 'pacienteId e pesoFinal são obrigatórios' },
        { status: 400 }
      );
    }

    const pesoFinal = parseFloat(String(pesoFinalStr).replace(',', '.'));
    if (isNaN(pesoFinal) || pesoFinal < 0) {
      return NextResponse.json(
        { error: 'pesoFinal deve ser um número válido (kg)' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();

    const pacienteRef = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteRef.exists) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      );
    }

    const paciente = pacienteRef.data() as Record<string, unknown>;
    const emailPaciente = (paciente.email || (paciente.dadosIdentificacao as Record<string, unknown>)?.email || '').toString().trim();
    if (!emailPaciente || !emailPaciente.includes('@')) {
      return NextResponse.json(
        { error: 'Paciente sem e-mail válido para envio' },
        { status: 400 }
      );
    }

    const nome = (paciente.nome || (paciente.dadosIdentificacao as Record<string, unknown>)?.nomeCompleto || 'Paciente').toString();
    const medicoId = paciente.medicoResponsavelId as string | undefined;

    let medicoNome = 'Médico';
    let medicoPerfil: MedicoPerfilRelatorio | null = null;
    if (medicoId) {
      const medicoRef = await db.collection('medicos').doc(medicoId).get();
      if (medicoRef.exists) {
        const medico = medicoRef.data() as Record<string, unknown>;
        const genero = (medico.genero || medico.gender || 'M').toString().toUpperCase();
        const base = (medico.nome || medico.name || 'Médico').toString();
        medicoNome = genero === 'F' ? `Dra. ${base}` : `Dr. ${base}`;
        const crm = medico.crm as { estado?: string; numero?: string } | undefined;
        medicoPerfil = {
          nome: base,
          genero,
          crm: crm?.estado && crm?.numero ? { estado: crm.estado, numero: String(crm.numero) } : undefined,
          telefone: (medico.telefone || medico.phone || '')?.toString() || undefined,
          cidades: Array.isArray(medico.cidades) ? medico.cidades as Array<{ cidade?: string; estado?: string }> : undefined,
          localizacao: medico.localizacao && typeof medico.localizacao === 'object' ? { endereco: (medico.localizacao as Record<string, unknown>).endereco as string } : undefined,
        };
      }
    }

    const evolucao = (paciente.evolucaoSeguimento || []) as Array<{
      weekIndex?: number;
      numeroSemana?: number;
      peso?: number;
      dataRegistro?: unknown;
      doseAplicada?: { data?: unknown; quantidade?: number };
    }>;
    const primeiroRegistro = evolucao.find(e => (e.weekIndex || e.numeroSemana) === 1);
    const medidasIniciais = (paciente.dadosClinicos as Record<string, { peso?: number }> | undefined)?.medidasIniciais;
    const pesoInicialNum = primeiroRegistro?.peso ?? medidasIniciais?.peso ?? null;
    const pesoInicial = pesoInicialNum != null ? Number(pesoInicialNum) : null;

    const pesoPerdido = pesoInicial != null ? pesoInicial - pesoFinal : null;
    const percentualPerda =
      pesoInicial != null && pesoInicial > 0 && pesoPerdido != null
        ? ((pesoPerdido / pesoInicial) * 100).toFixed(1)
        : '';

    const duracaoTratamento = duracaoTratamentoTexto(evolucao);

    // Usa sempre o site próprio: NEXT_PUBLIC_APP_URL ou origem do request. Nunca usa Vercel para o link do paciente.
    const originHeader = request.headers.get('origin');
    const refererHeader = request.headers.get('referer');
    const refererOrigin = refererHeader ? (() => { try { return new URL(refererHeader).origin; } catch { return ''; } })() : '';
    const baseUrl =
      (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
      || (typeof originHeader === 'string' ? originHeader.replace(/\/$/, '') : '')
      || refererOrigin
      || 'https://oftware.com.br';
    const baseNorm = baseUrl.replace(/\/$/, '');

    // Gera link seguro do relatório para usar no e-mail (variável {relatorio})
    const token = crypto.randomBytes(32).toString('hex');
    const linkRelatorio = `${baseNorm}/relatorio/${token}`;

    await db.collection('relatorio_paciente_links').doc(token).set({
      pacienteId,
      createdAt: new Date(),
    });

    const emailDoc = await db.collection('emails').doc('conclusao_tratamento_conclusao_tratamento').get();
    if (!emailDoc.exists) {
      return NextResponse.json(
        { error: 'Template de e-mail Conclusão Tratamento não configurado' },
        { status: 404 }
      );
    }

    const template = emailDoc.data() as { assunto?: string; corpoHtml?: string };
    let assunto = template?.assunto || 'Parabéns! Você concluiu seu tratamento 🎉';
    let html = template?.corpoHtml || '';

    const replaceMap: Record<string, string> = {
      nome,
      medico: medicoNome,
      peso_inicial: pesoInicial != null ? pesoInicial.toFixed(1) : '—',
      peso_final: pesoFinal.toFixed(1),
      peso_perdido: pesoPerdido != null ? pesoPerdido.toFixed(1) : '—',
      percentual_perda: percentualPerda || '—',
      duracao_tratamento: duracaoTratamento,
      relatorio: linkRelatorio,
    };

    for (const [key, value] of Object.entries(replaceMap)) {
      const re = new RegExp(`\\{${key}\\}`, 'g');
      assunto = assunto.replace(re, value);
      html = html.replace(re, value);
    }

    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${html}
</body>
</html>
      `.trim();
    }

    let envioSucesso = false;
    let erroEnvio: string | undefined;

    if (isZeptoMailConfigured()) {
      const sent = await sendEmail({
        to: emailPaciente,
        subject: assunto,
        html,
        text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
      });
      envioSucesso = sent.success;
      if (!sent.success) erroEnvio = sent.error;
    } else {
      console.log('📧 SIMULAÇÃO E-MAIL (ZeptoMail não configurado)');
      envioSucesso = true;
    }

    await db.collection('email_envios').add({
      emailTipo: 'conclusao_tratamento_conclusao_tratamento',
      destinatarioEmail: emailPaciente,
      assunto,
      enviadoEm: new Date(),
      status: envioSucesso ? 'enviado' : 'falhou',
      tipo: 'automatico',
      pacienteId,
      pacienteNome: nome,
      medicoNome,
      erro: erroEnvio || null,
    });

    if (!envioSucesso) {
      return NextResponse.json(
        { error: 'Erro ao enviar e-mail', details: erroEnvio },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'E-mail de conclusão de tratamento enviado com sucesso',
    });
  } catch (error) {
    console.error('Erro send-email-conclusao-tratamento:', error);
    return NextResponse.json(
      { error: 'Erro ao processar envio', details: (error as Error).message },
      { status: 500 }
    );
  }
}
