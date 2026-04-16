import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Função para obter Firestore Admin
function getAdminFirestore() {
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

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore();
    const enviosCollection = db.collection('email_envios');
    
    // Buscar envios mais recentes (caixa de saída = log da aplicação; envios via ZeptoMail SMTP)
    const enviosSnapshot = await enviosCollection
      .orderBy('enviadoEm', 'desc')
      .limit(250)
      .get();
    
    const envios = enviosSnapshot.docs.map(doc => {
      const data = doc.data();
      const destinatarioEmail =
        data.destinatarioEmail ?? data.leadEmail ?? null;
      return {
        id: doc.id,
        leadId: data.leadId ?? null,
        solicitacaoId: data.solicitacaoId ?? null,
        leadEmail: data.leadEmail ?? destinatarioEmail,
        destinatarioEmail,
        leadNome: data.leadNome ?? data.pacienteNome ?? null,
        pacienteNome: data.pacienteNome ?? null,
        emailTipo: data.emailTipo ?? null,
        assunto: data.assunto ?? null,
        enviadoEm: data.enviadoEm?.toDate() || new Date(),
        status: data.status || 'pendente',
        erro: data.erro || null,
        tentativas: data.tentativas ?? 1,
        tipo: data.tipo || 'manual',
        provedor: data.provedor ?? null,
        messageId: data.messageId ?? null,
        medicoNome: data.medicoNome ?? null,
        medicoId: data.medicoId ?? null,
        pacienteId: data.pacienteId ?? null,
        destinatario: data.destinatario ?? null,
      };
    });
    
    return NextResponse.json({
      envios,
      count: envios.length,
      fonteListagem: 'Firestore:email_envios',
      provedorPadraoEnvios: 'ZeptoMail',
    });
  } catch (error) {
    console.error('Erro ao buscar envios:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar envios', details: (error as Error).message },
      { status: 500 }
    );
  }
}
