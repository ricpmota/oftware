import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const COLLECTION = 'classificacao_profissionais';
const COLLECTION_ADMIN = 'classificacao_profissionais_admin';

function getFirebaseAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getFirestore(existingApps[0] as any);
  }
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
  const adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey: processedKey }),
  });
  return getFirestore(adminApp);
}

/**
 * Retorna o agregado de classificação do médico (total de votos e média).
 * Usa Firebase Admin para que a página pública /dr/[slug] possa exibir as estrelas
 * sem precisar de usuário autenticado (as regras do Firestore exigem auth para ler as coleções).
 */
export async function GET(request: NextRequest) {
  try {
    const medicoId = request.nextUrl.searchParams.get('medicoId');
    if (!medicoId) {
      return NextResponse.json({ error: 'medicoId é obrigatório' }, { status: 400 });
    }

    const db = getFirebaseAdmin();
    const profissionalTipo = 'medico';

    // 1) Votos reais: classificacao_profissionais onde profissionalTipo==medico e profissionalId==medicoId
    const votosSnap = await db
      .collection(COLLECTION)
      .where('profissionalTipo', '==', profissionalTipo)
      .where('profissionalId', '==', medicoId)
      .get();

    let realCount = 0;
    let realSum = 0;
    votosSnap.docs.forEach((d) => {
      const est = d.data()?.estrelas;
      if (typeof est === 'number' && est >= 1 && est <= 5) {
        realCount += 1;
        realSum += est;
      }
    });

    // 2) Override do admin: classificacao_profissionais_admin doc "medico_${medicoId}"
    const adminDocId = `${profissionalTipo}_${medicoId}`;
    const adminSnap = await db.collection(COLLECTION_ADMIN).doc(adminDocId).get();
    let override: { total: number; sum: number; media: number } | null = null;
    if (adminSnap.exists) {
      const d = adminSnap.data() || {};
      const count5 = Math.max(0, Math.floor(Number(d.count5) || 0));
      const count4 = Math.max(0, Math.floor(Number(d.count4) || 0));
      const count3 = Math.max(0, Math.floor(Number(d.count3) || 0));
      const count2 = Math.max(0, Math.floor(Number(d.count2) || 0));
      const count1 = Math.max(0, Math.floor(Number(d.count1) || 0));
      const total = count5 + count4 + count3 + count2 + count1;
      const sum = 5 * count5 + 4 * count4 + 3 * count3 + 2 * count2 + 1 * count1;
      const media = total > 0 ? Math.round((sum / total) * 10) / 10 : Math.round((Number(d.media) || 0) * 10) / 10;
      override = { total, sum, media };
    }

    // 3) Mesma lógica do ClassificacaoProfissionalService.getAgregado
    if (override && override.total > 0) {
      const total = override.total + realCount;
      const sum = override.sum + realSum;
      const media = total > 0 ? Math.round((sum / total) * 10) / 10 : override.media;
      return NextResponse.json({ count: total, media });
    }
    if (realCount > 0) {
      const media = Math.round((realSum / realCount) * 10) / 10;
      return NextResponse.json({ count: realCount, media });
    }
    return NextResponse.json({ count: 0, media: 0 });
  } catch (err) {
    console.error('Erro em classificacao-medico:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar classificação' },
      { status: 500 }
    );
  }
}
