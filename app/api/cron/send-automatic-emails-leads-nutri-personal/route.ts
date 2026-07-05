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
import { acquireCronLock, releaseCronLock } from '@/lib/email/cronExecutionLock';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';

const COL_SOLICITACOES_NUTRICIONISTA = 'solicitacoes_nutricionista';
const COL_SOLICITACOES_PERSONAL_TRAINER = 'solicitacoes_personal_trainer';
const STATUS_ACEITA = 'aceita';
const LEADS_ADMIN_EMAIL = process.env.LEADS_ADMIN_EMAIL || 'ricpmota.med@gmail.com';

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
  html: string,
  variaveisExtras?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; erro?: string }> {
  const applyVars = (txt: string) => {
    let out = txt.replace(/\{nome\}/g, toNome || 'Cliente');
    if (variaveisExtras) {
      for (const [key, value] of Object.entries(variaveisExtras)) {
        const safe = value || '';
        const re = new RegExp(`\\{${key}\\}`, 'g');
        out = out.replace(re, safe);
      }
    }
    return out;
  };
  const htmlPersonalizado = applyVars(html);
  const assuntoPersonalizado = applyVars(assunto);
  let htmlFinal = htmlPersonalizado;
  if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
    htmlFinal = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif;">${htmlPersonalizado}</body></html>`;
  }
  const result = await sendEmail({
    to: toEmail,
    subject: assuntoPersonalizado,
    html: htmlFinal,
    text: htmlPersonalizado.replace(/<[^>]*>/g, ''),
  });
  if (!result.success) return { success: false, erro: result.error };
  return { success: true, messageId: result.messageId };
}

function buildLeadsAptosParaAdmin(
  users: { uid: string; email: string; displayName?: string; metadata: { creationTime?: string } }[],
  excludeUids: Set<string>,
  leadIdsComEnvioEmail1: Set<string>
): Array<{ leadId: string; leadEmail: string; leadNome: string }> {
  const aptos: Array<{ leadId: string; leadEmail: string; leadNome: string }> = [];

  for (const user of users) {
    if (excludeUids.has(user.uid)) continue;
    const email = user.email?.toLowerCase().trim();
    if (!email || email === 'sem email' || email === '') continue;
    if (!leadIdsComEnvioEmail1.has(user.uid)) {
      aptos.push({
        leadId: user.uid,
        leadEmail: user.email || '',
        leadNome: user.displayName || user.email || 'Usuário',
      });
    }
  }
  return aptos;
}

export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  const zeptoGate = assertCronZeptoConfigured();
  if (!zeptoGate.ok) {
    return NextResponse.json(zeptoGate.body, { status: zeptoGate.status });
  }

  let db: ReturnType<typeof getFirebaseAdmin>['db'] | undefined;
  let lockInstanceId: string | null = null;

  try {
    const firebase = getFirebaseAdmin();
    db = firebase.db;

    const lock = await acquireCronLock(db, 'send-automatic-emails-leads-nutri-personal');
    if (!lock.acquired) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: lock.reason,
        enviadosNutri: 0,
        enviadosPersonal: 0,
      });
    }
    lockInstanceId = lock.instanceId;

    const { auth } = firebase;
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

    const limitePorExecucao = getCronZeptoMaxSendsPerRun();
    const janelaEnviosDias = Number(process.env.CRON_LEADS_EMAIL_LOOKBACK_DAYS || 180);
    const dataMinEnvio = new Date(Date.now() - janelaEnviosDias * 24 * 60 * 60 * 1000);

    const emailTypes: EmailTipo[] = ['email1'];
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

    type LeadRuntime = {
      uid: string;
      email: string;
      displayName?: string;
      metadata: { creationTime?: string };
    };
    let allUsers: LeadRuntime[] = [];
    const leadsSnap = await db.collection('leads').get();
    if (!leadsSnap.empty) {
      allUsers = leadsSnap.docs.map((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        const createdAtValue =
          (d.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ||
          (d.createdAtFirestore as { toDate?: () => Date } | undefined)?.toDate?.() ||
          (d.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ||
          new Date();
        return {
          uid: String(d.uid || docSnap.id),
          email: String(d.email || ''),
          displayName: String(d.name || d.displayName || d.email || 'Usuário'),
          metadata: {
            creationTime:
              createdAtValue instanceof Date
                ? createdAtValue.toISOString()
                : new Date(String(createdAtValue)).toISOString(),
          },
        };
      });
    } else {
      let nextPageToken: string | undefined;
      do {
        const list = await auth.listUsers(1000, nextPageToken);
        allUsers = allUsers.concat(
          list.users.map((u) => ({
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || u.email || 'Usuário',
            metadata: u.metadata || {},
          }))
        );
        nextPageToken = list.pageToken;
      } while (nextPageToken);
    }

    const solicitacoesMedico = await db.collection('solicitacoes_medico').where('pacienteEmail', '!=', null).get();
    const solicitacaoMedicoEmails = new Set<string>();
    solicitacoesMedico.docs.forEach(d => {
      const email = d.data().pacienteEmail?.toLowerCase().trim();
      if (email) solicitacaoMedicoEmails.add(email);
    });
    const pacientesComMedico = await db.collection('pacientes_completos').where('medicoResponsavelId', '!=', null).get();
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

    const [enviosNutriSnapshot, enviosPersonalSnapshot] = await Promise.all([
      db
        .collection('email_envios')
        .where('emailTipo', '==', 'leads_nutri_email1')
        .where('enviadoEm', '>=', dataMinEnvio)
        .get(),
      db
        .collection('email_envios')
        .where('emailTipo', '==', 'leads_personal_email1')
        .where('enviadoEm', '>=', dataMinEnvio)
        .get(),
    ]);
    const leadIdsComEnvioNutriEmail1 = new Set<string>();
    const leadIdsComEnvioPersonalEmail1 = new Set<string>();
    enviosNutriSnapshot.docs.forEach((docSnap) => {
      const leadId = String(docSnap.data().leadId || '').trim();
      if (leadId) leadIdsComEnvioNutriEmail1.add(leadId);
    });
    enviosPersonalSnapshot.docs.forEach((docSnap) => {
      const leadId = String(docSnap.data().leadId || '').trim();
      if (leadId) leadIdsComEnvioPersonalEmail1.add(leadId);
    });

    const usersList = allUsers.map(u => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      metadata: u.metadata || {},
    }));
    const mapLeadByUid = new Map<string, Record<string, unknown>>();
    leadsSnap.docs.forEach((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      mapLeadByUid.set(docSnap.id, d);
      if (d.uid) mapLeadByUid.set(String(d.uid), d);
    });
    const mapNutriByUid = new Map<string, Record<string, unknown>>();
    const mapPersonalByUid = new Map<string, Record<string, unknown>>();

    let enviadosNutri = 0;
    let enviadosPersonal = 0;
    const enviosRef = db.collection('email_envios');
    let orcamento = limitePorExecucao;
    /** Tentativas reais de envio (consomem cota Zepto nesta execução). */
    let enviadosNestaExecucao = 0;
    let truncadoPorLimite = false;

    const aptosNutri = ativoNutri
      ? buildLeadsAptosParaAdmin(usersList, excludeNutri, leadIdsComEnvioNutriEmail1)
      : [];
    const aptosPersonal = ativoPersonal
      ? buildLeadsAptosParaAdmin(usersList, excludePersonal, leadIdsComEnvioPersonalEmail1)
      : [];

    if (ativoNutri) {
      const t = templatesNutri.email1;
      if (t?.assunto && t?.corpoHtml) {
      for (const lead of aptosNutri) {
        if (orcamento <= 0) {
          truncadoPorLimite = true;
          break;
        }
        if (enviadosNestaExecucao > 0) await cronEmailThrottle();
        const leadData = mapLeadByUid.get(lead.leadId) || {};
        if (!mapNutriByUid.has(lead.leadId)) {
          const nutriDoc = await db.collection('nutricionistas').doc(lead.leadId).get();
          mapNutriByUid.set(lead.leadId, (nutriDoc.data() as Record<string, unknown>) || {});
        }
        const nutriDoc = mapNutriByUid.get(lead.leadId) || {};
        const res = await enviarEmail(LEADS_ADMIN_EMAIL, lead.leadNome, t.assunto, t.corpoHtml, {
          foto_registro: String(
            leadData.docVerificacaoRegistroUrl ||
              nutriDoc.docVerificacaoRegistroUrl ||
              ''
          ),
          selfie: String(
            leadData.docVerificacaoSelfieUrl ||
              nutriDoc.docVerificacaoSelfieUrl ||
              ''
          ),
          cnh: String(
            leadData.docVerificacaoCnhUrl || nutriDoc.docVerificacaoCnhUrl || ''
          ),
          lead_email: lead.leadEmail || '',
        });
        orcamento--;
        enviadosNestaExecucao++;
        await enviosRef.add({
          leadId: lead.leadId,
          leadEmail: lead.leadEmail,
          leadNome: lead.leadNome,
          destinatarioEmail: LEADS_ADMIN_EMAIL,
          emailTipo: 'leads_nutri_email1',
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
    }

    if (ativoPersonal) {
      const t = templatesPersonal.email1;
      if (t?.assunto && t?.corpoHtml) {
      for (const lead of aptosPersonal) {
        if (orcamento <= 0) {
          truncadoPorLimite = true;
          break;
        }
        if (enviadosNestaExecucao > 0) await cronEmailThrottle();
        const leadData = mapLeadByUid.get(lead.leadId) || {};
        if (!mapPersonalByUid.has(lead.leadId)) {
          const personalDoc = await db.collection('personal_trainers').doc(lead.leadId).get();
          mapPersonalByUid.set(lead.leadId, (personalDoc.data() as Record<string, unknown>) || {});
        }
        const personalDoc = mapPersonalByUid.get(lead.leadId) || {};
        const res = await enviarEmail(LEADS_ADMIN_EMAIL, lead.leadNome, t.assunto, t.corpoHtml, {
          foto_registro: String(
            leadData.docVerificacaoRegistroUrl ||
              personalDoc.docVerificacaoRegistroUrl ||
              ''
          ),
          selfie: String(
            leadData.docVerificacaoSelfieUrl ||
              personalDoc.docVerificacaoSelfieUrl ||
              ''
          ),
          cnh: String(
            leadData.docVerificacaoCnhUrl || personalDoc.docVerificacaoCnhUrl || ''
          ),
          lead_email: lead.leadEmail || '',
        });
        orcamento--;
        enviadosNestaExecucao++;
        await enviosRef.add({
          leadId: lead.leadId,
          leadEmail: lead.leadEmail,
          leadNome: lead.leadNome,
          destinatarioEmail: LEADS_ADMIN_EMAIL,
          emailTipo: 'leads_personal_email1',
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
      destinoAdmin: LEADS_ADMIN_EMAIL,
      truncadoPorLimiteZepto: truncadoPorLimite,
      provedor: 'ZeptoMail',
    });
  } catch (error) {
    console.error('Erro cron leads nutri/personal:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  } finally {
    if (db && lockInstanceId) {
      await releaseCronLock(db, 'send-automatic-emails-leads-nutri-personal', lockInstanceId);
    }
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
