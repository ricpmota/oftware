import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/email/transporter';
import {
  assertCronZeptoConfigured,
  cronEmailThrottle,
  getCronZeptoMaxSendsPerRun,
} from '@/lib/email/cronZeptoBatch';
import { dataConclusaoPrevisaoPaciente } from '@/lib/conclusao/dataConclusaoPrevisaoPlano';
import { ensureConclusaoPublicUrl } from '@/lib/conclusao/ensureConclusaoPublicLink';

function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;

  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
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

const EMAIL_DOC_ID = 'conclusao_tratamento_lembrete_conclusao';

async function enviarLembreteConclusao(
  db: Firestore,
  pacienteId: string,
  paciente: Record<string, any>,
  dataConclusao: Date
) {
  const emailPaciente = (
    paciente.email ||
    paciente.dadosIdentificacao?.email ||
    ''
  )
    .toString()
    .trim();
  if (!emailPaciente || !emailPaciente.includes('@')) {
    return { ok: false, skip: true as const, reason: 'sem email' };
  }

  const medicoId = paciente.medicoResponsavelId as string | undefined;
  if (!medicoId?.trim()) {
    return { ok: false, skip: true as const, reason: 'sem medico' };
  }

  const ct = paciente.planoTerapeutico?.conclusaoTratamento;
  if (ct?.pesoFinalKg != null) {
    return { ok: false, skip: true as const, reason: 'medico ja registrou peso final' };
  }

  let medicoNome = 'Médico';
  const medicoDoc = await db.collection('medicos').doc(medicoId).get();
  if (medicoDoc.exists) {
    const medico = medicoDoc.data();
    const genero = (medico?.genero || medico?.gender || 'M').toString().toUpperCase();
    const base = (medico?.nome || medico?.name || 'Médico').toString();
    medicoNome = genero === 'F' || genero === 'FEMALE' ? `Dra. ${base}` : `Dr. ${base}`;
  }

  const nome = (paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente').toString();
  const dataFmt = dataConclusao.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const emailDoc = await db.collection('emails').doc(EMAIL_DOC_ID).get();
  if (!emailDoc.exists) {
    throw new Error('Template lembrete conclusão não configurado');
  }

  const emailTemplate = emailDoc.data();
  let assunto = emailTemplate?.assunto?.trim() || 'Finalize os dados da conclusão do tratamento';
  let html = emailTemplate?.corpoHtml || '';

  let urlConclusao = '';
  try {
    urlConclusao = await ensureConclusaoPublicUrl(db, {
      pacienteId,
      data: dataConclusao,
      medicoId,
    });
  } catch (e) {
    console.error('ensureConclusaoPublicUrl (cron lembrete):', e);
  }

  html = html.replace(/\{nome\}/g, nome);
  html = html.replace(/\{medico\}/g, medicoNome);
  html = html.replace(/\{conclusao\}/g, urlConclusao);
  html = html.replace(/\{data_conclusao\}/g, dataFmt);
  assunto = assunto.replace(/\{nome\}/g, nome);
  assunto = assunto.replace(/\{medico\}/g, medicoNome);
  assunto = assunto.replace(/\{conclusao\}/g, urlConclusao);
  assunto = assunto.replace(/\{data_conclusao\}/g, dataFmt);

  let htmlFinal = html;
  if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
    htmlFinal = `
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

  try {
    const sent = await sendEmail({
      to: emailPaciente,
      subject: assunto,
      html: htmlFinal,
      text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
    });
    envioSucesso = sent.success;
    if (!sent.success) erroEnvio = sent.error;
  } catch (emailError) {
    erroEnvio = (emailError as Error).message;
    console.error('Erro envio lembrete conclusão:', emailError);
    throw emailError;
  }

  const leadId = paciente.userId || pacienteId;
  await db.collection('email_envios').add({
    leadId,
    leadEmail: emailPaciente,
    leadNome: nome,
    emailTipo: EMAIL_DOC_ID,
    assunto,
    enviadoEm: new Date(),
    status: envioSucesso ? 'enviado' : 'falhou',
    tentativas: 1,
    erro: erroEnvio || null,
    tipo: 'automatico',
  });

  return { ok: envioSucesso, skip: false as const };
}

export async function GET(_request: NextRequest) {
  try {
    const zeptoGate = assertCronZeptoConfigured();
    if (!zeptoGate.ok) {
      return NextResponse.json(zeptoGate.body, { status: zeptoGate.status });
    }

    const limitePorExecucao = getCronZeptoMaxSendsPerRun();
    let enviosZeptoNestaExecucao = 0;
    let truncadoPorLimite = false;

    const db = getFirebaseAdmin();
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);

    const snapshot = await db.collection('pacientes_completos').get();
    let enviados = 0;
    let falhas = 0;

    for (const docSnap of snapshot.docs) {
      if (enviosZeptoNestaExecucao >= limitePorExecucao) {
        truncadoPorLimite = true;
        break;
      }
      const paciente = docSnap.data();
      const status = paciente.statusTratamento;
      if (status !== 'em_tratamento' && status !== 'concluido') {
        continue;
      }

      const plano = paciente.planoTerapeutico;
      if (!plano?.startDate || !plano?.injectionDayOfWeek || !plano?.numeroSemanasTratamento) {
        continue;
      }

      const dataConc = dataConclusaoPrevisaoPaciente(plano, paciente.evolucaoSeguimento || []);
      if (!dataConc || dataConc.getTime() !== agora.getTime()) {
        continue;
      }

      const leadId = paciente.userId || docSnap.id;
      let enviosSnap;
      try {
        enviosSnap = await db
          .collection('email_envios')
          .where('leadId', '==', leadId)
          .where('emailTipo', '==', EMAIL_DOC_ID)
          .limit(25)
          .get();
      } catch {
        enviosSnap = await db.collection('email_envios').where('leadId', '==', leadId).limit(40).get();
      }

      const jaHoje = enviosSnap.docs.some((e) => {
        const env = e.data();
        if (env.emailTipo !== EMAIL_DOC_ID) return false;
        const t = env.enviadoEm?.toDate ? env.enviadoEm.toDate() : new Date(env.enviadoEm);
        t.setHours(0, 0, 0, 0);
        return t.getTime() === agora.getTime();
      });
      if (jaHoje) {
        continue;
      }

      try {
        if (enviosZeptoNestaExecucao > 0) await cronEmailThrottle();
        const r = await enviarLembreteConclusao(db, docSnap.id, paciente, dataConc);
        if (!r.skip && r.ok) {
          enviosZeptoNestaExecucao++;
          enviados++;
        } else if (!r.skip && !r.ok) {
          falhas++;
        }
      } catch {
        falhas++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cron lembrete conclusão',
      enviados,
      falhas,
      limitePorExecucao,
      truncadoPorLimiteZepto: truncadoPorLimite,
      provedor: 'ZeptoMail',
    });
  } catch (error) {
    console.error('send-email-conclusao-lembrete:', error);
    return NextResponse.json(
      { error: 'Erro interno', details: (error as Error).message },
      { status: 500 }
    );
  }
}
