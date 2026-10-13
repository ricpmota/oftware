import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mergeWhatsAppLeadPresets } from '@/lib/paciente360/whatsappLeadPresetDefaults';
import type {
  CreateWhatsAppLeadPresetInput,
  UpdateWhatsAppLeadPresetInput,
  WhatsAppLeadPreset,
  WhatsAppLeadPresetDefaultKey,
} from '@/types/whatsappLeadPreset';

function presetsCollection(medicoId: string) {
  return collection(db, 'medicos', medicoId, 'whatsappLeadPresets');
}

function presetDocRef(medicoId: string, presetId: string) {
  return doc(db, 'medicos', medicoId, 'whatsappLeadPresets', presetId);
}

function mapPresetDoc(id: string, medicoId: string, data: Record<string, unknown>): WhatsAppLeadPreset {
  const defaultKey = data.defaultKey
    ? (String(data.defaultKey) as WhatsAppLeadPresetDefaultKey)
    : undefined;
  return {
    id,
    medicoId: String(data.medicoId || medicoId),
    title: String(data.title || '').trim(),
    body: String(data.body || '').trim(),
    isDefault: Boolean(data.isDefault) || Boolean(defaultKey),
    defaultKey,
    order: typeof data.order === 'number' ? data.order : 100,
    archived: Boolean(data.archived),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
  };
}

export class WhatsAppLeadPresetService {
  static async listStored(medicoId: string): Promise<WhatsAppLeadPreset[]> {
    if (!medicoId) return [];
    const snap = await getDocs(presetsCollection(medicoId));
    return snap.docs.map((d) => mapPresetDoc(d.id, medicoId, d.data() as Record<string, unknown>));
  }

  /** Presets efetivos: padrões da plataforma + overrides/custom do médico. */
  static async listEffective(medicoId: string): Promise<WhatsAppLeadPreset[]> {
    const stored = await this.listStored(medicoId);
    return mergeWhatsAppLeadPresets(medicoId, stored);
  }

  static async createCustom(
    medicoId: string,
    data: CreateWhatsAppLeadPresetInput
  ): Promise<WhatsAppLeadPreset> {
    const title = data.title.trim();
    const body = data.body.trim();
    if (!medicoId || !title || !body) {
      throw new Error('Título e mensagem são obrigatórios.');
    }

    const order = typeof data.order === 'number' ? data.order : 100;
    const payload = {
      medicoId,
      title,
      body,
      isDefault: false,
      order,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(presetsCollection(medicoId), payload);
    return {
      id: ref.id,
      medicoId,
      title,
      body,
      isDefault: false,
      order,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Salva edição de preset padrão (cria doc com id = defaultKey) ou de custom existente.
   */
  static async upsert(
    medicoId: string,
    presetId: string,
    data: UpdateWhatsAppLeadPresetInput & {
      defaultKey?: WhatsAppLeadPresetDefaultKey;
      isDefault?: boolean;
    }
  ): Promise<WhatsAppLeadPreset> {
    if (!medicoId || !presetId) throw new Error('Preset inválido.');

    const title = data.title?.trim();
    const body = data.body?.trim();
    if (title !== undefined && !title) throw new Error('Título é obrigatório.');
    if (body !== undefined && !body) throw new Error('Mensagem é obrigatória.');

    const isDefaultOverride = Boolean(data.defaultKey);
    const docId = isDefaultOverride && data.defaultKey ? data.defaultKey : presetId;
    const ref = presetDocRef(medicoId, docId);

    const payload: Record<string, unknown> = {
      medicoId,
      updatedAt: serverTimestamp(),
      archived: data.archived === true,
    };
    if (title !== undefined) payload.title = title;
    if (body !== undefined) payload.body = body;
    if (data.order !== undefined) payload.order = data.order;
    if (data.defaultKey) {
      payload.defaultKey = data.defaultKey;
      payload.isDefault = true;
    } else if (data.isDefault !== undefined) {
      payload.isDefault = data.isDefault;
    }

    await setDoc(ref, { createdAt: serverTimestamp(), ...payload }, { merge: true });

    return {
      id: docId,
      medicoId,
      title: title || '',
      body: body || '',
      isDefault: Boolean(data.defaultKey) || Boolean(data.isDefault),
      defaultKey: data.defaultKey,
      order: data.order ?? (isDefaultOverride ? 0 : 100),
      archived: data.archived === true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static async updateCustom(
    medicoId: string,
    presetId: string,
    data: UpdateWhatsAppLeadPresetInput
  ): Promise<void> {
    if (!medicoId || !presetId) throw new Error('Preset inválido.');
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new Error('Título é obrigatório.');
      payload.title = title;
    }
    if (data.body !== undefined) {
      const body = data.body.trim();
      if (!body) throw new Error('Mensagem é obrigatória.');
      payload.body = body;
    }
    if (data.order !== undefined) payload.order = data.order;
    if (data.archived !== undefined) payload.archived = data.archived;
    await updateDoc(presetDocRef(medicoId, presetId), payload);
  }

  static async archive(medicoId: string, presetId: string): Promise<void> {
    await this.updateCustom(medicoId, presetId, { archived: true });
  }

  /** Restaura o texto padrão de um preset da plataforma. */
  static async resetDefault(
    medicoId: string,
    defaultKey: WhatsAppLeadPresetDefaultKey
  ): Promise<void> {
    await setDoc(
      presetDocRef(medicoId, defaultKey),
      {
        medicoId,
        defaultKey,
        isDefault: true,
        archived: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}
