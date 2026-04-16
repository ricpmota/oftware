import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/email/transporter';
import {
  assertCronZeptoConfigured,
  cronEmailThrottle,
  getCronZeptoMaxSendsPerRun,
} from '@/lib/email/cronZeptoBatch';

const COL_SOLICITACOES_NUTRICIONISTA = 'solicitacoes_nutricionista';
const COL_SOLICITACOES_PERSONAL_TRAINER = 'solicitacoes_personal_trainer';
const STATUS_ACEITA = 'aceita';

type EmailTipo = 'email1' | 'email2' | 'email3' | 'email4' | 'email5';

function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey || !clientEmail) throw new Error('Firebase Admin não configurado');
    let processedKey = privateKey.replace(/\\n/g, '\n');
    if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
      processedKey = processedKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
        .replace(/\n+/g, '\n');
    }
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: processedKey }),
    });
  }
  return { auth: getAuth(adminApp), db: getFirestore(adminApp) };
}

async function enviarEmail(
  toEmail: string,
  toNome: string,
  assunto: string,
  html: string
): Promise<{ success: boolean; messageId?: string; erro?: string }> {
  const htmlPersonalizado = html.replace(/\{nome\}/g, toNome || 'Cliente');
  let htmlFinal = htmlPersonalizado;
  if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
    htmlFinal = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif;">${htmlPersonalizado}</body></html>`;
  }
  const result = await sendEmail({
    to: toEmail,
    subject: assunto,
    html: htmlFinal,
    text: htmlPersonalizado.replace(/<[^>]*>/g, ''),
  });
  if (!result.success) return { success: false, erro: result.error };
  return { success: true, messageId: result.messageId };
}

function buildLeadsAptos(
  users: { uid: string; email: string; displayName?: string; metadata: { creationTime?: string } }[],
  excludeUids: Set<string>,
  enviosPorLead: Map<string, { emailTipo: string }[]>,
  prefix: 'leads_nutri' | 'leads_personal',
  agora: Date
): Array<{ leadId: string; leadEmail: string; leadNome: string; proximoEmail: EmailTipo; proximoEnvio: Date }> {
  const emailTypes: EmailTipo[] = ['email1', 'email2', 'email3', 'email4', 'email5'];
  const thresholds = [1, 24, 72, 168, 336]; // horas
  const aptos: Array<{ leadId: string; leadEmail: string; leadNome: string; proximoEmail: EmailTipo; proximoEnvio: Date }> = [];

  for (const user of users) {
    if (excludeUids.has(user.uid)) continue;
    const email = user.email?.toLowerCase().trim();
    if (!email || email === 'sem email' || email === '') continue;
    const createdAt = user.metadata?.creationTime ? new Date(user.metadata.creationTime) : null;
    if (!createdAt) continue;
    const horasDesdeCriacao = (agora.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const enviosDoLead = enviosPorLead.get(user.uid) || [];
    const emailTipoKey = (t: EmailTipo) => `${prefix}_${t}`;
    const enviado = (t: EmailTipo) => enviosDoLead.some(e => e.emailTipo === emailTipoKey(t));
    let proximoEmail: EmailTipo | undefined;
    let proximoEnvio: Date | undefined;
    if (!enviado('email1') && horasDesdeCriacao >= 1) {
      proximoEmail = 'email1';
      proximoEnvio = new Date(createdAt.getTime() + 60 * 60 * 1000);
    } else if (enviado('email1') && !enviado('email2') && horasDesdeCriacao >= 24) {
      proximoEmail = 'email2';
      proximoEnvio = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    } else if (enviado('email2') && !enviado('email3') && horasDesdeCriacao >= 72) {
      proximoEmail = 'email3';
      proximoEnvio = new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);
    } else if (enviado('email3') && !enviado('email4') && horasDesdeCriacao >= 168) {
      proximoEmail = 'email4';
      proximoEnvio = new Date(createdAt.getTime() + 168 * 60 * 60 * 1000);
    } else if (enviado('email4') && !enviado('email5') && horasDesdeCriacao >= 336) {
      proximoEmail = 'email5';
      proximoEnvio = new Date(createdAt.getTime() + 336 * 60 * 60 * 1000);
    }
    if (proximoEmail && proximoEnvio && proximoEnvio <= agora) {
      aptos.push({
        leadId: user.uid,
        leadEmail: user.email || '',
        leadNome: user.displayName || user.email || 'Usuário',
        proximoEmail,
        proximoEnvio,
      });
    }
  }
  return aptos;
}

export async function GET(request: NextRequest) {
  try {
    const { auth, db } = getFirebaseAdmin();
    const agora = new Date();
    const emailsCollection = db.collection('emails');
    const configDoc = await emailsCollection.doc('config').get();
    if (!configDoc.exists) {
      return NextResponse.json({ success: true, message: 'Config não encontrada', enviadosNutri: 0, enviadosPersonal: 0 });
    }
    const configData = configDoc.data() || {};
    const ativoNutri = !!configData.envioAutomaticoLeadsNutri?.ativo;
    const ativoPersonal = !!configData.envioAutomaticoLeadsPersonal?.ativo;
    if (!ativoNutri && !ativoPersonal) {
      return NextResponse.json({ success: true, message: 'Envio automático Nutri/Personal desativado', enviadosNutri: 0, enviadosPersonal: 0 });
    }

    const zeptoGate = assertCronZeptoConfigured();
    if (!zeptoGate.ok) {
      return NextResponse.json(zeptoGate.body, { status: zeptoGate.status });
    }

    const limitePorExecucao = getCronZeptoMaxSendsPerRun();

    const emailTypes: EmailTipo[] = ['email1', 'email2', 'email3', 'email4', 'email5'];
    const templatesNutri: Record<string, { assunto: string; corpoHtml: string }> = {};
    const templatesPersonal: Record<string, { assunto: string; corpoHtml: string }> = {};
    for (const t of emailTypes) {
      const docNutri = await emailsCollection.doc(`leads_nutri_${t}`).get();
      if (docNutri.exists) {
        const d = docNutri.data()!;
        templatesNutri[t] = { assunto: d.assunto || '', corpoHtml: d.corpoHtml || '' };
      }
      const docPersonal = await emailsCollection.doc(`leads_personal_${t}`).get();
      if (docPersonal.exists) {
        const d = docPersonal.data()!;
        templatesPersonal[t] = { assunto: d.assunto || '', corpoHtml: d.corpoHtml || '' };
      }
    }

    let allUsers: any[] = [];
    let nextPageToken: string | undefined;
    do {
      const list = await auth.listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(list.users);
      nextPageToken = list.pageToken;
    } while (nextPageToken);

    const solicitacoesMedico = await db.collection('solicitacoes_medico').get();
    const solicitacaoMedicoEmails = new Set<string>();
    solicitacoesMedico.docs.forEach(d => {
      const email = d.data().pacienteEmail?.toLowerCase().trim();
      if (email) solicitacaoMedicoEmails.add(email);
    });
    const pacientesComMedico = await db.collection('pacientes_completos').get();
    const pacientesComMedicoEmails = new Set<string>();
    pacientesComMedico.docs.forEach(d => {
      const p = d.data();
      if (p.email && p.medicoResponsavelId) pacientesComMedicoEmails.add(String(p.email).toLowerCase().trim());
    });

    const solicitacoesNutriAceitas = await db.collection(COL_SOLICITACOES_NUTRICIONISTA).where('status', '==', STATUS_ACEITA).get();
    const uidsComNutri = new Set<string>();
    solicitacoesNutriAceitas.docs.forEach(d => {
      const pacienteId = d.data().pacienteId;
      if (pacienteId) uidsComNutri.add(String(pacienteId));
    });
    const solicitacoesPersonalAceitas = await db.collection(COL_SOLICITACOES_PERSONAL_TRAINER).where('status', '==', STATUS_ACEITA).get();
    const uidsComPersonal = new Set<string>();
    solicitacoesPersonalAceitas.docs.forEach(d => {
      const pacienteId = d.data().pacienteId;
      if (pacienteId) uidsComPersonal.add(String(pacienteId));
    });

    const excludeNutri = new Set<string>(uidsComNutri);
    allUsers.forEach(u => {
      const email = u.email?.toLowerCase().trim();
      if (solicitacaoMedicoEmails.has(email!) || pacientesComMedicoEmails.has(email!)) excludeNutri.add(u.uid);
    });
    const excludePersonal = new Set<string>(uidsComPersonal);
    allUsers.forEach(u => {
      const email = u.email?.toLowerCase().trim();
      if (solicitacaoMedicoEmails.has(email!) || pacientesComMedicoEmails.has(email!)) excludePersonal.add(u.uid);
    });

    const enviosSnapshot = await db.collection('email_envios').get();
    const enviosPorLead = new Map<string, { emailTipo: string }[]>();
    enviosSnapshot.docs.forEach(doc => {
      const d = doc.data();
      const leadId = d.leadId;
      if (!leadId) return;
      if (!enviosPorLead.has(leadId)) enviosPorLead.set(leadId, []);
      enviosPorLead.get(leadId)!.push({ emailTipo: d.emailTipo });
    });

    const usersList = allUsers.map(u => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      metadata: u.metadata || {},
    }));

    let enviadosNutri = 0;
    let enviadosPersonal = 0;
    const enviosRef = db.collection('email_envios');
    let orcamento = limitePorExecucao;
    /** Tentativas reais de envio (consomem cota Zepto nesta execução). */
    let enviadosNestaExecucao = 0;
    let truncadoPorLimite = false;

    const aptosNutri = ativoNutri ? buildLeadsAptos(usersList, excludeNutri, enviosPorLead, 'leads_nutri', agora) : [];
    const aptosPersonal = ativoPersonal ? buildLeadsAptos(usersList, excludePersonal, enviosPorLead, 'leads_personal', agora) : [];

    if (ativoNutri) {
      for (const lead of aptosNutri) {
        const t = templatesNutri[lead.proximoEmail];
        if (!t?.assunto || !t?.corpoHtml) continue;
        if (orcamento <= 0) {
          truncadoPorLimite = true;
          break;
        }
        if (enviadosNestaExecucao > 0) await cronEmailThrottle();
        const res = await enviarEmail(lead.leadEmail, lead.leadNome, t.assunto, t.corpoHtml);
        orcamento--;
        enviadosNestaExecucao++;
        await enviosRef.add({
          leadId: lead.leadId,
          leadEmail: lead.leadEmail,
          leadNome: lead.leadNome,
          emailTipo: `leads_nutri_${lead.proximoEmail}`,
          assunto: t.assunto,
          enviadoEm: agora,
          status: res.success ? 'enviado' : 'falhou',
          tentativas: 1,
          erro: res.erro || null,
          tipo: 'automatico',
        });
        if (res.success) enviadosNutri++;
      }
    }

    if (ativoPersonal) {
      for (const lead of aptosPersonal) {
        const t = templatesPersonal[lead.proximoEmail];
        if (!t?.assunto || !t?.corpoHtml) continue;
        if (orcamento <= 0) {
          truncadoPorLimite = true;
          break;
        }
        if (enviadosNestaExecucao > 0) await cronEmailThrottle();
        const res = await enviarEmail(lead.leadEmail, lead.leadNome, t.assunto, t.corpoHtml);
        orcamento--;
        enviadosNestaExecucao++;
        await enviosRef.add({
          leadId: lead.leadId,
          leadEmail: lead.leadEmail,
          leadNome: lead.leadNome,
          emailTipo: `leads_personal_${lead.proximoEmail}`,
          assunto: t.assunto,
          enviadoEm: agora,
          status: res.success ? 'enviado' : 'falhou',
          tentativas: 1,
          erro: res.erro || null,
          tipo: 'automatico',
        });
        if (res.success) enviadosPersonal++;
      }
    }

    const aptosNutriTotal = aptosNutri.length;
    const aptosPersonalTotal = aptosPersonal.length;

    return NextResponse.json({
      success: true,
      timestamp: agora.toISOString(),
      enviadosNutri,
      enviadosPersonal,
      limitePorExecucao,
      enviadosNestaExecucao,
      aptosNutriTotal,
      aptosPersonalTotal,
      truncadoPorLimiteZepto: truncadoPorLimite,
      provedor: 'ZeptoMail',
    });
  } catch (error) {
    console.error('Erro cron leads nutri/personal:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
