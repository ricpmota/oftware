import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  assertCronZeptoConfigured,
} from '@/lib/email/cronZeptoBatch';
import { acquireCronLock, releaseCronLock } from '@/lib/email/cronExecutionLock';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import {
  beginEmailEnviosAuditScope,
  endEmailEnviosAuditScope,
  EMAIL_ENVIOS_AUDIT_SITES,
} from '@/lib/auditoria/emailEnviosAudit';
import { runSendAutomaticEmailsCron } from '@/services/sendAutomaticEmailsCronService';
import { observeEmailCutoverCronRun } from '@/services/emailCutoverControlService';

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

  return {
    auth: getAuth(adminApp),
    db: getFirestore(adminApp),
  };
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
  const auditScopeId = beginEmailEnviosAuditScope({
    siteId: EMAIL_ENVIOS_AUDIT_SITES.CRON_SEND_AUTOMATIC_EMAILS.id,
    surface: 'cron',
  });

  try {
    const firebase = getFirebaseAdmin();
    db = firebase.db;

    const lock = await acquireCronLock(db, 'send-automatic-emails');
    if (!lock.acquired) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: lock.reason,
        enviados: 0,
        falhas: 0,
        organizations: [],
      });
    }
    lockInstanceId = lock.instanceId;

    const result = await runSendAutomaticEmailsCron({
      db,
      auth: firebase.auth,
      auditScopeId,
    });

    try {
      await observeEmailCutoverCronRun({
        organizations: result.organizations,
        timestamp: result.timestamp,
      });
    } catch (cutoverObserveError) {
      console.error('[cutover] observeEmailCutoverCronRun', cutoverObserveError);
    }

    return NextResponse.json({
      success: result.success,
      timestamp: result.timestamp,
      organizations: result.organizations,
      enviados: result.enviados,
      falhas: result.falhas,
      skipped: result.skipped,
      firestoreReads: result.firestoreReads,
      firestoreWrites: result.firestoreWrites,
      durationMs: result.durationMs,
      provedor: result.provedor,
      emailEnviosQueries: result.emailEnviosQueries,
      emailEnviosDocsLidos: result.emailEnviosDocsLidos,
      note: 'ETAPA 2.0.1 — processamento isolado por organização e engine.',
    });
  } catch (error) {
    console.error('❌ Erro no envio automático:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
        organizations: [],
      },
      { status: 500 },
    );
  } finally {
    endEmailEnviosAuditScope(auditScopeId, {
      cron: 'send-automatic-emails',
    });
    if (db && lockInstanceId) {
      await releaseCronLock(db, 'send-automatic-emails', lockInstanceId);
    }
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
