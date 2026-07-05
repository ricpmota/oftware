import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { gerarSlugDrMedico, medicoNomeIdentityKey } from '@/utils/medicoDrSlug';

const COLLECTION_MEDICOS = 'medicos';
const COLLECTION_CLASSIFICACAO = 'classificacao_profissionais';
const COLLECTION_CLASSIFICACAO_ADMIN = 'classificacao_profissionais_admin';

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

export async function GET() {
  try {
    const db = getFirebaseAdmin();
    const [medicosSnapshot, votosSnapshot, adminSnapshot] = await Promise.all([
      db.collection(COLLECTION_MEDICOS).get(),
      db.collection(COLLECTION_CLASSIFICACAO).where('profissionalTipo', '==', 'medico').get(),
      db.collection(COLLECTION_CLASSIFICACAO_ADMIN).get(),
    ]);

    const todosMedicos = medicosSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    }));

    const votosReaisMap = new Map<string, { count: number; sum: number }>();
    votosSnapshot.docs.forEach((d) => {
      const data = d.data();
      const profissionalId = String(data.profissionalId || '');
      const estrelas = data.estrelas;
      if (!profissionalId || typeof estrelas !== 'number' || estrelas < 1 || estrelas > 5) return;
      const atual = votosReaisMap.get(profissionalId) || { count: 0, sum: 0 };
      votosReaisMap.set(profissionalId, { count: atual.count + 1, sum: atual.sum + estrelas });
    });

    const overrideMap = new Map<string, { total: number; sum: number; media: number }>();
    adminSnapshot.docs.forEach((doc) => {
      const docId = doc.id || '';
      if (!docId.startsWith('medico_')) return;
      const medicoId = docId.replace(/^medico_/, '');
      if (!medicoId) return;

      const d = doc.data() || {};
      const count5 = Math.max(0, Math.floor(Number(d.count5) || 0));
      const count4 = Math.max(0, Math.floor(Number(d.count4) || 0));
      const count3 = Math.max(0, Math.floor(Number(d.count3) || 0));
      const count2 = Math.max(0, Math.floor(Number(d.count2) || 0));
      const count1 = Math.max(0, Math.floor(Number(d.count1) || 0));
      const total = count5 + count4 + count3 + count2 + count1;
      const sum = 5 * count5 + 4 * count4 + 3 * count3 + 2 * count2 + 1 * count1;
      const media = total > 0 ? Math.round((sum / total) * 10) / 10 : Math.round((Number(d.media) || 0) * 10) / 10;
      overrideMap.set(medicoId, { total, sum, media });
    });

    const medicosElegiveis = todosMedicos
      .map((medico) => {
        const nome = String(medico.nome || '').trim();
        const fotoPerfilUrl = String(medico.fotoPerfilUrl || '').trim();
        const isVerificado = Boolean(medico.isVerificado);
        if (!nome || !isVerificado || !fotoPerfilUrl) return null;

        const real = votosReaisMap.get(medico.id) || { count: 0, sum: 0 };
        const override = overrideMap.get(medico.id);
        const count = override && override.total > 0 ? override.total + real.count : real.count;
        const sum = override && override.total > 0 ? override.sum + real.sum : real.sum;
        const media = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

        const { first, last } = medicoNomeIdentityKey(nome);
        const baseSlug = gerarSlugDrMedico(nome);
        let slug = baseSlug;
        if (first) {
          const mesmoPar = todosMedicos.filter((m) => {
            const key = medicoNomeIdentityKey(String(m.nome || ''));
            return key.first === first && key.last === last;
          });
          const idx = mesmoPar.findIndex((m) => m.id === medico.id);
          if (idx > 0) slug = `${baseSlug}${idx + 1}`;
        }

        return {
          id: medico.id,
          nome,
          genero: medico.genero === 'F' ? 'F' : 'M',
          fotoPerfilUrl,
          slug,
          totalAvaliacoes: count,
          mediaAvaliacoes: media,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => {
        if (b.totalAvaliacoes !== a.totalAvaliacoes) return b.totalAvaliacoes - a.totalAvaliacoes;
        if (b.mediaAvaliacoes !== a.mediaAvaliacoes) return b.mediaAvaliacoes - a.mediaAvaliacoes;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });

    return NextResponse.json({ medicos: medicosElegiveis });
  } catch (error) {
    console.error('Erro ao listar médicos para home:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar médicos' },
      { status: 500 }
    );
  }
}
