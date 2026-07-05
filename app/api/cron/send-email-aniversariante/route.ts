import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { sendEmail, verifyZeptoMailConnection } from '@/lib/email/transporter';
import {
  assertCronZeptoConfigured,
  cronEmailThrottle,
  getCronZeptoMaxSendsPerRun,
} from '@/lib/email/cronZeptoBatch';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';

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

/** Retorna a data "hoje" no fuso de Brasília (para comparar aniversários no dia certo no Brasil). */
function getHojeBrasilia(requestDate?: string): { dia: number; mes: number; ano: number; label: string } {
  let hoje: Date;
  if (requestDate && /^\d{4}-\d{2}-\d{2}$/.test(requestDate)) {
    hoje = new Date(requestDate + 'T12:00:00.000Z');
  } else {
    hoje = new Date();
    try {
      const br = new Date(hoje.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      hoje = br;
    } catch {
      // fallback: usa data local do servidor
    }
  }
  return {
    dia: hoje.getDate(),
    mes: hoje.getMonth(),
    ano: hoje.getFullYear(),
    label: hoje.toLocaleDateString('pt-BR'),
  };
}

export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') ?? undefined;

    console.log('--- Iniciando Cron Job de E-mail de Aniversariante ---');
    const db = getFirebaseAdmin();

    const { dia: diaHoje, mes: mesHoje, label: hojeLabel } = getHojeBrasilia(dateParam);
    console.log(`📅 Dia (Brasília): ${hojeLabel} (dia=${diaHoje}, mes=${mesHoje})`);

    const emailDoc = await db.collection('emails').doc('aniversariante_parabenizar').get();
    if (!emailDoc.exists) {
      console.log('⚠️ Template de e-mail de aniversariante não configurado');
      return NextResponse.json({ success: false, message: 'Template aniversariante_parabenizar não configurado' });
    }

    const emailTemplate = emailDoc.data();
    const assuntoTemplate = emailTemplate?.assunto || 'Feliz aniversário! 🎂';
    const corpoTemplate = emailTemplate?.corpoHtml || '<p>Olá {nome},</p><p>Seu médico, Dr(a). {medico}, enviou esta mensagem para parabenizá-lo(a)!</p>';

    const pacientesSnapshot = await db.collection('pacientes_completos').get();
    const medicosSnapshot = await db.collection('medicos').get();
    const medicosMap = new Map(medicosSnapshot.docs.map(d => [d.id, { id: d.id, ...d.data() }]));

    const aniversariantes: Array<{
      paciente: { id: string; nome: string; email: string; medicoResponsavelId: string };
      medico: { id: string; nome: string; genero?: string };
    }> = [];

    let totalPacientes = 0;
    let comDataNasc = 0;
    let comMedico = 0;
    let diaMesMatch = 0;

    pacientesSnapshot.docs.forEach(docRef => {
      const p = docRef.data();
      totalPacientes++;
      const dataNascRaw = p.dadosIdentificacao?.dataNascimento ?? p.dataNascimento;
      const dataNasc = toDate(dataNascRaw);
      if (!dataNasc) return;
      comDataNasc++;
      if (!p.medicoResponsavelId) return;
      comMedico++;
      if (dataNasc.getDate() !== diaHoje || dataNasc.getMonth() !== mesHoje) return;
      diaMesMatch++;

      const medico = medicosMap.get(p.medicoResponsavelId);
      if (!medico) return;

      const pacienteEmail = (p.email || p.dadosIdentificacao?.email || '').trim();
      if (!pacienteEmail || !pacienteEmail.includes('@')) return;

      const pacienteNome = p.nome || p.dadosIdentificacao?.nomeCompleto || 'Paciente';
      aniversariantes.push({
        paciente: {
          id: docRef.id,
          nome: pacienteNome,
          email: pacienteEmail,
          medicoResponsavelId: p.medicoResponsavelId,
        },
        medico: {
          id: medico.id,
          nome: medico.nome || medico.name || 'Médico',
          genero: medico.genero || medico.gender,
        },
      });
    });

    console.log(`📊 Pacientes: total=${totalPacientes}, com dataNascimento=${comDataNasc}, com medico=${comMedico}, dia/mês hoje=${diaMesMatch}, aniversariantes=${aniversariantes.length}`);

    if (aniversariantes.length === 0) {
      return NextResponse.json({
        success: true,
        enviados: 0,
        falhas: 0,
        mensagem: 'Nenhum aniversariante hoje',
        debug: { totalPacientes, comDataNascimento: comDataNasc, comMedico, diaMesMatch: diaMesMatch },
      });
    }

    const zeptoGate = assertCronZeptoConfigured();
    if (!zeptoGate.ok) {
      return NextResponse.json(zeptoGate.body, { status: zeptoGate.status });
    }

    const verifyResult = await verifyZeptoMailConnection();
    if (!verifyResult.success) {
      console.error('❌ Erro ao verificar conexão SMTP ZeptoMail:', verifyResult.error);
      return NextResponse.json(
        {
          success: false,
          erro: `Erro ao conectar ao servidor SMTP: ${verifyResult.error}`,
        },
        { status: 500 }
      );
    }

    let emailsEnviados = 0;
    let emailsFalhados = 0;
    const limitePorExecucao = getCronZeptoMaxSendsPerRun();
    let enviosZeptoNestaExecucao = 0;
    let truncadoPorLimite = false;

    for (const { paciente, medico } of aniversariantes) {
      if (enviosZeptoNestaExecucao >= limitePorExecucao) {
        truncadoPorLimite = true;
        break;
      }
      const medicoGenero = medico.genero === 'F' || medico.genero === 'female' ? 'F' : 'M';
      const medicoNomeCompleto = (medicoGenero === 'F' ? 'Dra. ' : 'Dr. ') + medico.nome;

      let assunto = assuntoTemplate.replace(/\{nome\}/g, paciente.nome).replace(/\{medico\}/g, medicoNomeCompleto);
      let html = corpoTemplate.replace(/\{nome\}/g, paciente.nome).replace(/\{medico\}/g, medicoNomeCompleto);

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

      try {
        console.log(`📧 Enviando e-mail de parabéns para ${paciente.nome} (${paciente.email})`);
        if (enviosZeptoNestaExecucao >= limitePorExecucao) {
          truncadoPorLimite = true;
          break;
        }
        if (enviosZeptoNestaExecucao > 0) await cronEmailThrottle();

        const sent = await sendEmail({
          to: paciente.email,
          subject: assunto,
          html,
          text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
        });
        if (!sent.success) throw new Error(sent.error);
        enviosZeptoNestaExecucao++;

        await db.collection('email_envios').add({
          emailTipo: 'aniversariante_parabenizar',
          destinatarioEmail: paciente.email,
          assunto,
          enviadoEm: new Date(),
          status: 'enviado',
          tipo: 'automatico',
          pacienteId: paciente.id,
          pacienteNome: paciente.nome,
          medicoId: medico.id,
          medicoNome: medicoNomeCompleto,
        });

        emailsEnviados++;
        console.log(`✅ E-mail de parabéns enviado para ${paciente.nome}`);
      } catch (error) {
        emailsFalhados++;
        const erroMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro ao enviar e-mail para ${paciente.nome} (${paciente.email}):`, erroMsg);

        await db.collection('email_envios').add({
          emailTipo: 'aniversariante_parabenizar',
          destinatarioEmail: paciente.email,
          assunto,
          enviadoEm: new Date(),
          status: 'falhou',
          erro: erroMsg,
          tipo: 'automatico',
          pacienteId: paciente.id,
          pacienteNome: paciente.nome,
          medicoId: medico.id,
          medicoNome: medicoNomeCompleto,
        });
      }
    }

    return NextResponse.json({
      success: true,
      enviados: emailsEnviados,
      falhas: emailsFalhados,
      mensagem: `${emailsEnviados} e-mail(s) de parabéns enviado(s), ${emailsFalhados} falha(s)`,
      limitePorExecucao,
      truncadoPorLimiteZepto: truncadoPorLimite,
      provedor: 'ZeptoMail',
    });
  } catch (error) {
    console.error('Erro no cron job de aniversariante:', error);
    return NextResponse.json({
      success: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}
