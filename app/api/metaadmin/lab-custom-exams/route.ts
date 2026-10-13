import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { LAB_SECTION_LABELS_PT } from '@/lib/labExames/labSectionLabels';
import {
  extraSectionLabelsFromAllCustomExams,
  findSectionIdByLabel,
  LAB_NEW_SECTION_SENTINEL,
  normalizeLabCustomExams,
  reservedExamKeys,
  slugifyCustomSectionId,
  uniqueCustomExamKey,
  type LabCustomExam,
} from '@/lib/labExames/labCustomExams';

export const runtime = 'nodejs';

const COLLECTION = 'platformSettings';
const DOC_ID = 'labExames';
const MAX_CUSTOM_EXAMS = 400;

export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const body = (await request.json()) as {
      label?: unknown;
      unit?: unknown;
      min?: unknown;
      max?: unknown;
      sectionId?: unknown;
      newSectionLabel?: unknown;
    };
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
    const min = typeof body.min === 'number' ? body.min : Number(body.min);
    const max = typeof body.max === 'number' ? body.max : Number(body.max);
    const sectionIdRaw = typeof body.sectionId === 'string' ? body.sectionId.trim() : '';
    const newSectionLabel = typeof body.newSectionLabel === 'string' ? body.newSectionLabel.trim() : '';

    if (!label || label.length < 2) {
      return NextResponse.json({ error: 'Informe o nome do exame.' }, { status: 400 });
    }
    if (!unit) {
      return NextResponse.json({ error: 'Informe a unidade (ex.: mg/dL).' }, { status: 400 });
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return NextResponse.json({ error: 'Informe mínimo e máximo numéricos.' }, { status: 400 });
    }
    if (min > max) {
      return NextResponse.json({ error: 'O mínimo não pode ser maior que o máximo.' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const medicoSnap = await db.collection('medicos').doc(auth.medicoDocId).get();
    const medicoNome =
      typeof medicoSnap.data()?.nome === 'string' ? String(medicoSnap.data()?.nome).trim() : '';

    const ref = db.collection(COLLECTION).doc(DOC_ID);
    const created = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const list = normalizeLabCustomExams(snap.exists ? snap.data()?.labCustomExams : []);
      if (list.length >= MAX_CUSTOM_EXAMS) {
        throw new Error('LIMITE');
      }
      const extraLabels = extraSectionLabelsFromAllCustomExams(list);
      let sectionId = sectionIdRaw;
      let sectionLabel = '';

      if (!sectionId || sectionId === LAB_NEW_SECTION_SENTINEL) {
        if (!newSectionLabel) {
          throw new Error('SETOR');
        }
        const existingId = findSectionIdByLabel(newSectionLabel, extraLabels);
        if (existingId) {
          sectionId = existingId;
          sectionLabel = LAB_SECTION_LABELS_PT[existingId] || extraLabels[existingId] || newSectionLabel;
        } else {
          sectionId = slugifyCustomSectionId(newSectionLabel);
          sectionLabel = newSectionLabel.slice(0, 80);
        }
      } else if (LAB_SECTION_LABELS_PT[sectionId]) {
        sectionLabel = LAB_SECTION_LABELS_PT[sectionId];
      } else if (extraLabels[sectionId]) {
        sectionLabel = extraLabels[sectionId];
      } else {
        throw new Error('SETOR_INVALIDO');
      }

      const dupLabel = list.some((e) => e.label.trim().toLowerCase() === label.toLowerCase());
      if (dupLabel) {
        throw new Error('DUPLICADO');
      }

      const existingKeys = new Set<string>([...reservedExamKeys(), ...list.map((e) => e.key)]);
      const exam: LabCustomExam = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        key: uniqueCustomExamKey(label, existingKeys),
        label: label.slice(0, 80),
        unit: unit.slice(0, 24),
        min,
        max,
        sectionId,
        sectionLabel,
        enabled: true,
        createdByMedicoId: auth.medicoDocId,
        createdByMedicoNome: medicoNome || undefined,
        createdAt: new Date().toISOString(),
      };
      list.push(exam);
      tx.set(ref, { labCustomExams: list, updatedAt: new Date() }, { merge: true });
      return exam;
    });

    return NextResponse.json({ ok: true, exam: created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'LIMITE') {
      return NextResponse.json({ error: 'Limite de exames customizados atingido.' }, { status: 400 });
    }
    if (msg === 'SETOR') {
      return NextResponse.json({ error: 'Informe o setor ou o nome do novo setor.' }, { status: 400 });
    }
    if (msg === 'SETOR_INVALIDO') {
      return NextResponse.json({ error: 'Setor inválido.' }, { status: 400 });
    }
    if (msg === 'DUPLICADO') {
      return NextResponse.json({ error: 'Já existe um exame com esse nome no patrimônio global.' }, { status: 409 });
    }
    console.error('[metaadmin/lab-custom-exams POST]', e);
    return NextResponse.json({ error: 'Falha ao salvar o exame.' }, { status: 500 });
  }
}
