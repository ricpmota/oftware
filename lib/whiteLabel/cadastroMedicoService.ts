import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  CADASTRO_MEDICO_COLLECTION,
  CADASTRO_MEDICO_TOTAL_STEPS,
} from '@/lib/whiteLabel/cadastroMedicoConstants';
import {
  CADASTRO_MEDICO_FORM_KEYS,
  type CadastroMedicoStatus,
} from '@/types/cadastroMedicoWhiteLabel';
import {
  isValidLeadWhiteLabelEmail,
  normalizeLeadWhiteLabelEmail,
  normalizeLeadWhiteLabelWhatsApp,
} from '@/lib/whiteLabel/leadWhiteLabelNormalize';

function asTrimmedString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function extractFormData(raw: Record<string, unknown>): Record<string, string> {
  const form: Record<string, string> = {};
  for (const key of CADASTRO_MEDICO_FORM_KEYS) {
    form[key] = asTrimmedString(raw[key]);
  }
  return form;
}

function timestampToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mapCadastroMedicoDoc(id: string, data: FirebaseFirestore.DocumentData) {
  const form = extractFormData(data);
  return {
    id,
    ...form,
    status: (data.status as CadastroMedicoStatus) || 'rascunho',
    currentStep: typeof data.currentStep === 'number' ? data.currentStep : 0,
    origem: 'whitelabel_cadastromedico' as const,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    concluidoAt: timestampToDate(data.concluidoAt),
  };
}

export type SaveCadastroMedicoInput = {
  draftId?: string;
  form: Record<string, unknown>;
  currentStep: number;
};

export type SaveCadastroMedicoResult = {
  draftId: string;
  status: CadastroMedicoStatus;
};

export async function saveCadastroMedicoDraft(
  input: SaveCadastroMedicoInput
): Promise<SaveCadastroMedicoResult> {
  const db = getFirestoreAdmin();
  const form = extractFormData(input.form);
  const currentStep = Math.max(0, Math.min(input.currentStep, CADASTRO_MEDICO_TOTAL_STEPS - 1));

  const draftId = asTrimmedString(input.draftId);
  const ref = draftId
    ? db.collection(CADASTRO_MEDICO_COLLECTION).doc(draftId)
    : db.collection(CADASTRO_MEDICO_COLLECTION).doc();

  if (draftId) {
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error('Rascunho não encontrado.');
    }
    if (existing.data()?.status === 'concluido') {
      throw new Error('Este cadastro já foi concluído.');
    }
  }

  const payload: Record<string, unknown> = {
    ...form,
    status: 'rascunho',
    currentStep,
    origem: 'whitelabel_cadastromedico',
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!draftId) {
    payload.createdAt = FieldValue.serverTimestamp();
  }

  await ref.set(payload, { merge: true });

  return { draftId: ref.id, status: 'rascunho' };
}

export async function getCadastroMedicoDraft(draftId: string) {
  const db = getFirestoreAdmin();
  const snap = await db.collection(CADASTRO_MEDICO_COLLECTION).doc(draftId).get();
  if (!snap.exists) return null;
  return mapCadastroMedicoDoc(snap.id, snap.data()!);
}

function validateCpfDigits(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  return digits.length === 11;
}

function validateStep(form: Record<string, string>, step: number): string | null {
  switch (step) {
    case 0:
      if (!form.tratamento) return 'Selecione o tratamento.';
      if (!form.nome.trim()) return 'Informe o nome.';
      if (!form.sobrenome.trim()) return 'Informe o sobrenome.';
      if (!form.nomeMarca.trim()) return 'Informe o nome da marca.';
      if (!form.especialidade.trim()) return 'Informe a especialidade.';
      if (!form.cidade.trim()) return 'Informe a cidade.';
      if (!form.estado.trim()) return 'Selecione o estado.';
      return null;
    case 1:
      if (!form.dominioDesejado.trim()) return 'Informe o domínio desejado.';
      if (!form.extensaoDominio.trim()) return 'Selecione a extensão do domínio.';
      if (!form.statusDominio) return 'Verifique a disponibilidade do domínio.';
      if (form.statusDominio === 'indisponivel') {
        return 'Selecione um domínio disponível na lista.';
      }
      return null;
    case 2:
      if (!form.cepEntrega.replace(/\D/g, '')) return 'Informe o CEP.';
      if (!form.ruaEntrega.trim()) return 'Informe a rua.';
      if (!form.numeroEntrega.trim()) return 'Informe o número.';
      if (!form.bairroEntrega.trim()) return 'Informe o bairro.';
      if (!form.cidadeEntrega.trim()) return 'Informe a cidade.';
      if (!form.estadoEntrega.trim()) return 'Selecione o estado.';
      if (!form.nomeRecebedor.trim()) return 'Informe quem receberá.';
      if (form.telefoneEntrega.replace(/\D/g, '').length < 10) return 'Informe um telefone válido.';
      return null;
    case 3: {
      if (!form.nomeCompletoContrato.trim()) return 'Informe o nome completo.';
      if (!validateCpfDigits(form.cpf)) return 'Informe um CPF válido.';
      if (!form.rg.trim()) return 'Informe o RG.';
      if (!form.dataNascimento.trim()) return 'Informe a data de nascimento.';
      if (!form.estadoCivil.trim()) return 'Selecione o estado civil.';
      if (!form.nacionalidade.trim()) return 'Informe a nacionalidade.';
      if (!form.crm.trim()) return 'Informe o CRM.';
      if (!form.crmUf.trim()) return 'Selecione a UF do CRM.';
      if (!isValidLeadWhiteLabelEmail(normalizeLeadWhiteLabelEmail(form.emailContrato))) {
        return 'Informe um e-mail válido.';
      }
      if (normalizeLeadWhiteLabelWhatsApp(form.whatsappContrato).length < 12) {
        return 'Informe um WhatsApp válido.';
      }
      if (form.usarMesmoEnderecoEntrega === 'nao') {
        if (!form.cepContrato.replace(/\D/g, '')) return 'Informe o CEP do endereço contratual.';
        if (!form.ruaContrato.trim()) return 'Informe a rua do endereço contratual.';
        if (!form.numeroContrato.trim()) return 'Informe o número do endereço contratual.';
        if (!form.bairroContrato.trim()) return 'Informe o bairro do endereço contratual.';
        if (!form.cidadeContrato.trim()) return 'Informe a cidade do endereço contratual.';
        if (!form.estadoContrato.trim()) return 'Selecione o estado do endereço contratual.';
      }
      return null;
    }
    case 4:
      if (!form.tipoPessoa.trim()) return 'Selecione o tipo de pessoa.';
      if (!form.diaVencimento.trim()) return 'Selecione o dia de vencimento.';
      if (form.tipoPessoa === 'juridica') {
        if (!form.cnpj.replace(/\D/g, '')) return 'Informe o CNPJ.';
        if (!form.razaoSocial.trim()) return 'Informe a razão social.';
        if (!isValidLeadWhiteLabelEmail(normalizeLeadWhiteLabelEmail(form.emailFinanceiro))) {
          return 'Informe um e-mail financeiro válido.';
        }
      }
      return null;
    case 5:
      return null;
    case 6:
      if (form.confirmoVeracidade !== 'true') return 'Confirme que as informações são verdadeiras.';
      if (form.autorizoUsoDados !== 'true') return 'Autorize a utilização dos dados.';
      return null;
    default:
      return null;
  }
}

export function validateCadastroMedicoStep(
  form: Record<string, string>,
  step: number
): string | null {
  return validateStep(form, step);
}

export function validateCadastroMedicoForm(form: Record<string, string>): string | null {
  for (let s = 0; s < CADASTRO_MEDICO_TOTAL_STEPS; s += 1) {
    const err = validateStep(form, s);
    if (err) return err;
  }
  return null;
}

export async function submitCadastroMedico(input: {
  draftId: string;
  form: Record<string, unknown>;
}): Promise<{ id: string }> {
  const draftId = asTrimmedString(input.draftId);
  if (!draftId) throw new Error('Rascunho inválido.');

  const form = extractFormData(input.form);
  const validationError = validateCadastroMedicoForm(form);
  if (validationError) throw new Error(validationError);

  const db = getFirestoreAdmin();
  const ref = db.collection(CADASTRO_MEDICO_COLLECTION).doc(draftId);
  const existing = await ref.get();
  if (!existing.exists) throw new Error('Rascunho não encontrado.');
  if (existing.data()?.status === 'concluido') throw new Error('Este cadastro já foi concluído.');

  await ref.set(
    {
      ...form,
      status: 'concluido',
      currentStep: CADASTRO_MEDICO_TOTAL_STEPS - 1,
      origem: 'whitelabel_cadastromedico',
      concluidoAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { id: draftId };
}

export async function listCadastroMedicoForAdmin() {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(CADASTRO_MEDICO_COLLECTION)
    .orderBy('updatedAt', 'desc')
    .get();
  return snap.docs.map((doc) => mapCadastroMedicoDoc(doc.id, doc.data()));
}

export async function deleteCadastroMedico(id: string) {
  const db = getFirestoreAdmin();
  const ref = db.collection(CADASTRO_MEDICO_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Cadastro não encontrado.');
  await ref.delete();
}
