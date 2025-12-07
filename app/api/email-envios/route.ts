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
    
    // Buscar todos os envios ordenados por data (mais recentes primeiro)
    const enviosSnapshot = await enviosCollection
      .orderBy('enviadoEm', 'desc')
      .limit(100) // Limitar a 100 envios mais recentes
      .get();
    
    const envios = enviosSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        leadId: data.leadId,
        leadEmail: data.leadEmail,
        leadNome: data.leadNome,
        emailTipo: data.emailTipo,
        assunto: data.assunto,
        enviadoEm: data.enviadoEm?.toDate() || new Date(),
        status: data.status || 'pendente',
        erro: data.erro || null,
        tentativas: data.tentativas || 1,
        // Determinar se foi manual ou automático (por enquanto, assumimos que todos são manuais até implementar o automático)
        tipo: data.tipo || 'manual', // 'manual' ou 'automatico'
      };
    });
    
    return NextResponse.json({ envios, count: envios.length });
  } catch (error) {
    console.error('Erro ao buscar envios:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar envios', details: (error as Error).message },
      { status: 500 }
    );
  }
}
