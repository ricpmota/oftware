/**
 * ChatNutri Server Service - Firestore Admin (ETAPA 1)
 * Usado apenas por API routes - usa firebase-admin
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { ChatNutriMessage, ChatNutriDayTotals } from '@/lib/chatnutri/types';

const COL_PACIENTES = 'pacientes_completos';

function getAdminFirestore() {
  const existingApps = getApps();
  let adminApp = existingApps[0] as ReturnType<typeof initializeApp> | undefined;
  if (!adminApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey || !clientEmail) throw new Error('Firebase Admin: variáveis de ambiente não configuradas');
    const processedKey = privateKey.replace(/\\n/g, '\n');
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: processedKey }),
    });
  }
  return getFirestore(adminApp);
}

export async function getPatientStatusTratamento(patientId: string): Promise<string | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(COL_PACIENTES).doc(patientId).get();
  return snap.exists ? (snap.data()?.statusTratamento ?? null) : null;
}

/**
 * Monta um contexto resumido do paciente para o ChatNutri (Gemini).
 * Inclui: sexo, peso atual, altura, IMC, peso perdido, doses aplicadas, dose atual, exames recentes.
 */
export async function getPatientContextForChat(patientId: string): Promise<string> {
  const db = getAdminFirestore();
  const snap = await db.collection(COL_PACIENTES).doc(patientId).get();
  if (!snap.exists) return '';

  const data = snap.data();
  const medidasIniciais = data?.dadosClinicos?.medidasIniciais;
  const evolucao = (data?.evolucaoSeguimento || []) as Array<{
    peso?: number;
    dataRegistro?: { toDate?: () => Date } | string | Date;
    doseAplicada?: { quantidade?: number };
  }>;
  const planoTerapeutico = data?.planoTerapeutico;
  const exames = (data?.examesLaboratoriais || []) as Array<{
    dataColeta?: { toDate?: () => Date } | string | Date;
    hemoglobinaGlicada?: number;
    glicemiaJejum?: number;
    colesterolTotal?: number;
    ldl?: number;
    hdl?: number;
    triglicerides?: number;
    tsh?: number;
  }>;

  const sexo = data?.dadosIdentificacao?.sexoBiologico;
  const sexoTexto = sexo === 'M' ? 'homem' : sexo === 'F' ? 'mulher' : null;

  const alturaCm = medidasIniciais?.altura ?? null;
  const pesoInicial = medidasIniciais?.peso ?? null;

  const evolucaoOrdenada = [...evolucao].sort((a, b) => {
    const da = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : typeof a.dataRegistro === 'object' && (a.dataRegistro as { toDate?: () => Date })?.toDate ? (a.dataRegistro as { toDate: () => Date }).toDate().getTime() : new Date(String(a.dataRegistro)).getTime();
    const db = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : typeof b.dataRegistro === 'object' && (b.dataRegistro as { toDate?: () => Date })?.toDate ? (b.dataRegistro as { toDate: () => Date }).toDate().getTime() : new Date(String(b.dataRegistro)).getTime();
    return db - da;
  });
  const pesoAtual = evolucaoOrdenada.find((e) => e.peso != null)?.peso ?? pesoInicial ?? null;

  const imcAtual =
    pesoAtual != null && alturaCm != null && alturaCm > 0
      ? (pesoAtual / (alturaCm / 100) ** 2).toFixed(1)
      : medidasIniciais?.imc?.toFixed(1) ?? null;

  const pesoPerdido =
    pesoAtual != null && pesoInicial != null && pesoInicial > pesoAtual
      ? (pesoInicial - pesoAtual).toFixed(1)
      : null;

  const dosesAplicadas = evolucao.filter((e) => e.doseAplicada != null).length;
  const historicoDoses = (planoTerapeutico?.historicoDoses || []) as Array<{ dose?: number }>;
  const totalDoses = dosesAplicadas > 0 ? dosesAplicadas : historicoDoses.length;
  const doseAtual = planoTerapeutico?.currentDoseMg ?? null;

  const examesOrdenados = [...exames].sort((a, b) => {
    const da = a.dataColeta instanceof Date ? a.dataColeta.getTime() : typeof a.dataColeta === 'object' && (a.dataColeta as { toDate?: () => Date })?.toDate ? (a.dataColeta as { toDate: () => Date }).toDate().getTime() : new Date(String(a.dataColeta || 0)).getTime();
    const db = b.dataColeta instanceof Date ? b.dataColeta.getTime() : typeof b.dataColeta === 'object' && (b.dataColeta as { toDate?: () => Date })?.toDate ? (b.dataColeta as { toDate: () => Date }).toDate().getTime() : new Date(String(b.dataColeta || 0)).getTime();
    return db - da;
  });
  const ultimoExame = examesOrdenados[0];
  const examesTexto =
    ultimoExame != null
      ? [
          ultimoExame.hemoglobinaGlicada != null ? `HbA1c ${ultimoExame.hemoglobinaGlicada}%` : null,
          ultimoExame.glicemiaJejum != null ? `glicemia jejum ${ultimoExame.glicemiaJejum} mg/dL` : null,
          ultimoExame.colesterolTotal != null ? `CT ${ultimoExame.colesterolTotal} mg/dL` : null,
          ultimoExame.ldl != null ? `LDL ${ultimoExame.ldl} mg/dL` : null,
          ultimoExame.hdl != null ? `HDL ${ultimoExame.hdl} mg/dL` : null,
          ultimoExame.triglicerides != null ? `TG ${ultimoExame.triglicerides} mg/dL` : null,
          ultimoExame.tsh != null ? `TSH ${ultimoExame.tsh} µUI/mL` : null,
        ]
          .filter(Boolean)
          .join('; ') || 'dados básicos'
      : null;

  const nomeCompleto = data?.nome ?? data?.dadosIdentificacao?.nomeCompleto ?? '';
  const primeiroNome = nomeCompleto ? nomeCompleto.trim().split(/\s+/)[0] || nomeCompleto : '';

  const linhas: string[] = [];
  if (primeiroNome) linhas.push(`Nome (primeiro): ${primeiroNome}`);
  if (sexoTexto) linhas.push(`Sexo: ${sexoTexto}`);
  if (pesoAtual != null) linhas.push(`Peso atual: ${pesoAtual} kg`);
  if (alturaCm != null) linhas.push(`Altura: ${alturaCm} cm`);
  if (imcAtual != null) linhas.push(`IMC atual: ${imcAtual} kg/m²`);
  if (pesoPerdido != null) linhas.push(`Peso perdido: ${pesoPerdido} kg`);
  if (totalDoses > 0) linhas.push(`Doses aplicadas: ${totalDoses}`);
  if (doseAtual != null) linhas.push(`Dose atual: ${doseAtual} mg`);
  if (examesTexto) linhas.push(`Últimos exames: ${examesTexto}`);

  if (linhas.length === 0) return '';
  return `Contexto do paciente:\n${linhas.join('\n')}`;
}

export async function getChatNutriDailyImageCount(patientId: string, dateKey: string): Promise<number> {
  const db = getAdminFirestore();
  const docId = `chatNutri_${dateKey}`;
  const snap = await db.collection(COL_PACIENTES).doc(patientId).collection('usage').doc(docId).get();
  return snap.exists ? (snap.data()?.count ?? 0) : 0;
}

export async function incrementChatNutriDailyImageCount(patientId: string, dateKey: string): Promise<number> {
  const db = getAdminFirestore();
  const docId = `chatNutri_${dateKey}`;
  const ref = db.collection(COL_PACIENTES).doc(patientId).collection('usage').doc(docId);
  const snap = await ref.get();
  const current = snap.exists ? (snap.data()?.count ?? 0) : 0;
  const next = current + 1;
  await ref.set({ count: next });
  return next;
}

export async function saveChatNutriMessage(
  patientId: string,
  dateKey: string,
  message: (Omit<ChatNutriMessage, 'createdAt'> & { createdAt?: string }) | (Omit<ChatNutriMessage, 'id' | 'createdAt'> & { createdAt?: string })
): Promise<string> {
  const db = getAdminFirestore();
  const colRef = db.collection(COL_PACIENTES).doc(patientId).collection('chatNutri').doc(dateKey).collection('messages');
  const createdAt = message.createdAt ?? new Date().toISOString();
  const { id, ...rest } = message as ChatNutriMessage & { createdAt?: string };
  const data = { ...rest, createdAt };

  if (id) {
    await colRef.doc(id).set(data);
    return id;
  }
  const docRef = await colRef.add(data);
  return docRef.id;
}

export async function upsertChatNutriDayTotals(
  patientId: string,
  dateKey: string,
  dayTotals: ChatNutriDayTotals
): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection(COL_PACIENTES).doc(patientId).collection('chatNutri').doc(dateKey);
  await ref.set({ dayTotals }, { merge: true });
}

export async function addDateToChatNutriDatasComFotos(patientId: string, dateKey: string): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection(COL_PACIENTES).doc(patientId);
  const snap = await ref.get();
  const data = snap.data();
  const datas: string[] = data?.chatNutriDatasComFotos ?? [];
  if (!datas.includes(dateKey)) {
    datas.push(dateKey);
    datas.sort((a, b) => b.localeCompare(a));
    await ref.update({ chatNutriDatasComFotos: datas });
  }
}

export async function getChatNutriDayTotals(patientId: string, dateKey: string): Promise<ChatNutriDayTotals | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(COL_PACIENTES).doc(patientId).collection('chatNutri').doc(dateKey).get();
  return snap.exists && snap.data()?.dayTotals ? snap.data().dayTotals : null;
}

export async function deleteChatNutriMessage(
  patientId: string,
  dateKey: string,
  messageId: string
): Promise<{ ok: boolean; dayTotals?: ChatNutriDayTotals | null; error?: string }> {
  const db = getAdminFirestore();
  const colRef = db.collection(COL_PACIENTES).doc(patientId).collection('chatNutri').doc(dateKey).collection('messages');
  let msgRef = colRef.doc(messageId);
  let msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    // Fallback: buscar por id no campo do documento (algumas mensagens podem ter sido salvas com id no body e doc id diferente)
    const allSnap = await colRef.get();
    const found = allSnap.docs.find((d) => d.id === messageId || String(d.data().id) === String(messageId));
    if (!found) {
      console.warn('[deleteChatNutriMessage] Mensagem não encontrada', { patientId, dateKey, messageId, totalDocs: allSnap.size });
      return { ok: false, error: 'Mensagem não encontrada.' };
    }
    msgRef = found.ref;
    msgSnap = found;
  }
  const data = msgSnap.data()!;
  const relatedId = data?.relatedMessageId as string | undefined;
  const type = (data?.type ?? 'chat') as string;
  let totals = data?.totals as { calories?: number; protein?: number; carbs?: number; fat?: number } | undefined;
  if (!totals && relatedId) {
    const relatedSnap = await colRef.doc(relatedId).get();
    totals = relatedSnap.data()?.totals as typeof totals;
  }

  const batch = db.batch();
  batch.delete(msgRef);
  if (relatedId) {
    const relatedRef = colRef.doc(relatedId);
    const relatedSnap = await relatedRef.get();
    if (relatedSnap.exists) batch.delete(relatedRef);
  }
  await batch.commit();

  if (type === 'meal' && totals) {
    const dayRef = db.collection(COL_PACIENTES).doc(patientId).collection('chatNutri').doc(dateKey);
    const daySnap = await dayRef.get();
    const day = daySnap.data()?.dayTotals;
    const current = { calories: day?.calories ?? 0, protein: day?.protein ?? 0, carbs: day?.carbs ?? 0, fat: day?.fat ?? 0 };
    const next = {
      calories: Math.max(0, current.calories - (totals.calories ?? 0)),
      protein: Math.max(0, current.protein - (totals.protein ?? 0)),
      carbs: Math.max(0, current.carbs - (totals.carbs ?? 0)),
      fat: Math.max(0, current.fat - (totals.fat ?? 0)),
    };
    await dayRef.set({ dayTotals: next }, { merge: true });
    const usageRef = db.collection(COL_PACIENTES).doc(patientId).collection('usage').doc(`chatNutri_${dateKey}`);
    const usageSnap = await usageRef.get();
    const count = Math.max(0, (usageSnap.data()?.count ?? 0) - 1);
    await usageRef.set({ count });
  }

  const remaining = await colRef.get();
  const hasFotos = remaining.docs.some((d) => d.data().gcsPath);
  if (!hasFotos) {
    const patientRef = db.collection(COL_PACIENTES).doc(patientId);
    const patientSnap = await patientRef.get();
    const datas: string[] = patientSnap.data()?.chatNutriDatasComFotos ?? [];
    if (datas.includes(dateKey)) {
      await patientRef.update({ chatNutriDatasComFotos: datas.filter((d) => d !== dateKey) });
    }
  }

  const dayTotals = await getChatNutriDayTotals(patientId, dateKey);
  return { ok: true, dayTotals };
}

export async function clearChatNutriDay(patientId: string, dateKey: string): Promise<void> {
  const db = getAdminFirestore();
  const messagesRef = db
    .collection(COL_PACIENTES)
    .doc(patientId)
    .collection('chatNutri')
    .doc(dateKey)
    .collection('messages');
  const snap = await messagesRef.get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  const usageRef = db.collection(COL_PACIENTES).doc(patientId).collection('usage').doc(`chatNutri_${dateKey}`);
  await usageRef.set({ count: 0 });

  const dayRef = db.collection(COL_PACIENTES).doc(patientId).collection('chatNutri').doc(dateKey);
  await dayRef.set({ dayTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }, { merge: true });

  const patientRef = db.collection(COL_PACIENTES).doc(patientId);
  const patientSnap = await patientRef.get();
  const datas: string[] = patientSnap.data()?.chatNutriDatasComFotos ?? [];
  if (datas.includes(dateKey)) {
    const newDatas = datas.filter((d) => d !== dateKey);
    await patientRef.update({ chatNutriDatasComFotos: newDatas });
  }
}

export async function listChatNutriMessages(patientId: string, dateKey: string): Promise<ChatNutriMessage[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(COL_PACIENTES)
    .doc(patientId)
    .collection('chatNutri')
    .doc(dateKey)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt = typeof data.createdAt === 'string'
      ? data.createdAt
      : (data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString());
    return {
      id: d.id,
      role: data.role ?? 'assistant',
      type: (data.type ?? 'chat') as ChatNutriMessage['type'],
      text: data.text ?? '',
      createdAt,
      imageUrl: data.imageUrl ?? null,
      gcsPath: data.gcsPath ?? null,
      totals: data.totals,
      confidence: data.confidence,
      relatedMessageId: data.relatedMessageId ?? null,
    } as ChatNutriMessage;
  });
}
