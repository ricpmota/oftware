import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdmin() {
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
    const db = getFirebaseAdmin();
    const pacientesSnapshot = await db.collection('pacientes_completos').get();
    
    const pacientes = pacientesSnapshot.docs
      .map(doc => {
        const data = doc.data();
        const email = data.email || data.dadosIdentificacao?.email || '';
        const nome = data.nome || data.dadosIdentificacao?.nomeCompleto || 'Sem nome';
        
        // Filtrar apenas pacientes com email válido
        if (!email || email === 'sem email' || email === '') {
          return null;
        }
        
        return {
          id: doc.id,
          nome,
          email,
        };
      })
      .filter(p => p !== null)
      .sort((a, b) => (a?.nome || '').localeCompare(b?.nome || ''));
    
    return NextResponse.json({ pacientes });
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pacientes', details: (error as Error).message },
      { status: 500 }
    );
  }
}

