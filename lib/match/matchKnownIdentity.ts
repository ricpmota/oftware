import { resolveWhatsappCanonicalDigits } from '@/lib/phone/buildWhatsappUrl';
import { firstDisplayName } from '@/lib/match/matchProfile';
import type { MatchProfileDraft } from '@/lib/match/matchProfile';
import { MedicoService } from '@/services/medicoService';
import { PacienteService } from '@/services/pacienteService';

export type MatchKnownIdentity = {
  displayName: string;
  birthDate?: string;
  city?: string;
  state?: string;
  phoneDigits?: string;
  grammaticalGender: 'm' | 'f' | 'u';
};

function isoFromDate(value: Date | undefined): string | undefined {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  if (year < 1930 || year > new Date().getFullYear()) return undefined;
  return `${year}-${month}-${day}`;
}

function stateUf(value: string | undefined): string | undefined {
  const raw = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(raw) ? raw : undefined;
}

async function loadDoctorIdentity(uid: string): Promise<Pick<MatchKnownIdentity, 'displayName' | 'city' | 'state' | 'grammaticalGender'> | null> {
  try {
    const medico = await MedicoService.getMedicoByUserId(uid);
    if (!medico) return null;
    const place = (medico.cidades || []).find((item) => String(item?.cidade || '').trim());
    const city = String(place?.cidade || '').trim();
    const state = stateUf(place?.estado);
    return {
      displayName: firstDisplayName(medico.nome),
      grammaticalGender: medico.genero === 'M' ? 'm' : medico.genero === 'F' ? 'f' : 'u',
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
    };
  } catch {
    return null;
  }
}

/** O cadastro do paciente, ou do médico, prevalece sobre o que foi digitado só no Match. */
export function applyKnownIdentity(profile: MatchProfileDraft, known: MatchKnownIdentity | null): MatchProfileDraft {
  if (!known) return profile;
  return {
    ...profile,
    identity: {
      ...profile.identity,
      displayName: known.displayName || profile.identity.displayName,
      birthDate: known.birthDate || profile.identity.birthDate,
      city: known.city || profile.identity.city,
      state: known.state || profile.identity.state,
    },
  };
}

/** Nome, idade e cidade já existentes no cadastro. Não copia prontuário. */
export async function loadKnownMatchIdentity(
  uid: string,
  email?: string | null
): Promise<MatchKnownIdentity | null> {
  const byUid = await PacienteService.getPacienteByUserId(uid);
  const paciente = byUid || (email ? await PacienteService.getPacienteByEmail(email) : null);
  if (!paciente) {
    const doctor = await loadDoctorIdentity(uid);
    if (!doctor?.displayName && !doctor?.city) return null;
    return doctor;
  }

  const identity = paciente.dadosIdentificacao;
  const phoneDigits = resolveWhatsappCanonicalDigits({
    telefone: identity?.telefone,
    telefoneDdi: identity?.telefoneDdi,
    telefoneE164: identity?.telefoneE164,
  });
  const city = String(identity?.endereco?.cidade || '').trim();
  const state = stateUf(identity?.endereco?.estado);
  const doctor = city ? null : await loadDoctorIdentity(uid);

  return {
    displayName: firstDisplayName(identity?.nomeCompleto) || doctor?.displayName || '',
    grammaticalGender: identity?.sexoBiologico === 'M' ? 'm' : identity?.sexoBiologico === 'F' ? 'f' : doctor?.grammaticalGender || 'u',
    ...(isoFromDate(identity?.dataNascimento) ? { birthDate: isoFromDate(identity?.dataNascimento) } : {}),
    ...(city ? { city } : doctor?.city ? { city: doctor.city } : {}),
    ...(city ? (state ? { state } : {}) : doctor?.state ? { state: doctor.state } : {}),
    ...(phoneDigits ? { phoneDigits } : {}),
  };
}
