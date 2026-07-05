import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';

const TOKENS_COLLECTION = 'google_calendar_tokens';
const TIMEZONE = 'America/Sao_Paulo';

type GoogleCalendarTokenDoc = {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp | Date;
};

export type CreateWhiteLabelMeetingInput = {
  doctorName: string;
  doctorEmail: string;
  doctorPhone: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type CreateWhiteLabelMeetingResult = {
  eventId: string;
  meetLink: string;
  htmlLink: string;
};

function toDateTimeIso(date: string, time: string): string {
  return `${date}T${time}:00`;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { access_token: string; expires_in?: number };
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 3600));
  return { accessToken: data.access_token, expiresAt };
}

async function getAdminCalendarToken(): Promise<GoogleCalendarTokenDoc | null> {
  const db = getFirestoreAdmin();
  const configuredUserId = process.env.WHITELABEL_GOOGLE_CALENDAR_USER_ID?.trim();

  if (configuredUserId) {
    const doc = await db.collection(TOKENS_COLLECTION).doc(configuredUserId).get();
    if (doc.exists) {
      return { userId: doc.id, ...(doc.data() as Omit<GoogleCalendarTokenDoc, 'userId'>) };
    }
  }

  const snap = await db.collection(TOKENS_COLLECTION).get();
  const adminEmail = METAADMIN_GERAL_EMAIL.trim().toLowerCase();

  for (const doc of snap.docs) {
    const data = doc.data() as Omit<GoogleCalendarTokenDoc, 'userId'>;
    if ((data.email || '').trim().toLowerCase() === adminEmail && data.accessToken) {
      return { userId: doc.id, ...data };
    }
  }

  return null;
}

async function getValidAccessToken(): Promise<{ accessToken: string; userId: string } | null> {
  const token = await getAdminCalendarToken();
  if (!token?.accessToken) return null;

  const expiresAt =
    token.expiresAt instanceof Timestamp ? token.expiresAt.toDate() : new Date(token.expiresAt);
  const isExpired = Number.isNaN(expiresAt.getTime()) || new Date() >= expiresAt;

  if (!isExpired) {
    return { accessToken: token.accessToken, userId: token.userId };
  }

  if (!token.refreshToken) return null;

  const refreshed = await refreshAccessToken(token.refreshToken);
  if (!refreshed) return null;

  const db = getFirestoreAdmin();
  await db.collection(TOKENS_COLLECTION).doc(token.userId).set(
    {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { accessToken: refreshed.accessToken, userId: token.userId };
}

export async function isWhiteLabelCalendarConfigured(): Promise<boolean> {
  const token = await getAdminCalendarToken();
  return !!(token?.accessToken || token?.refreshToken);
}

export async function getWhiteLabelCalendarStatus(): Promise<{
  configured: boolean;
  authorized: boolean;
  email: string | null;
  userId: string | null;
  hasRefreshToken: boolean;
}> {
  const token = await getAdminCalendarToken();
  const valid = await getValidAccessToken();
  return {
    configured: !!(token?.accessToken || token?.refreshToken),
    authorized: !!valid,
    email: token?.email?.trim() || null,
    userId: token?.userId || null,
    hasRefreshToken: !!token?.refreshToken,
  };
}

export async function saveGoogleCalendarTokenAdmin(input: {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}) {
  const db = getFirestoreAdmin();
  await db.collection(TOKENS_COLLECTION).doc(input.userId).set(
    {
      userId: input.userId,
      email: input.email,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      sincronizadoEm: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function createWhiteLabelMeetingEvent(
  input: CreateWhiteLabelMeetingInput
): Promise<CreateWhiteLabelMeetingResult> {
  const auth = await getValidAccessToken();
  if (!auth) {
    throw new Error(
      'Google Calendar não autorizado. Conecte a agenda em Metaadmin Geral → Leads White Label → Configurações.'
    );
  }

  const requestId = `whitelabel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const summary = `Reunião White Label Oftware - Dr(a). ${input.doctorName}`;
  const description = [
    'Reunião com médico interessado na Plataforma White Label da Oftware.',
    '',
    `Nome: ${input.doctorName}`,
    `E-mail: ${input.doctorEmail}`,
    `Telefone: ${input.doctorPhone}`,
    '',
    'Origem: Formulário /whitelabel',
  ].join('\n');

  const eventBody = {
    summary,
    description,
    start: {
      dateTime: toDateTimeIso(input.date, input.startTime),
      timeZone: TIMEZONE,
    },
    end: {
      dateTime: toDateTimeIso(input.date, input.endTime),
      timeZone: TIMEZONE,
    },
    attendees: [{ email: input.doctorEmail }],
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: true,
    },
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[calendarService] Erro ao criar evento:', errorText);
    throw new Error('Falha ao criar evento no Google Calendar.');
  }

  const data = (await response.json()) as {
    id: string;
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: {
      entryPoints?: { entryPointType?: string; uri?: string }[];
    };
  };

  const meetLink =
    data.hangoutLink ||
    data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ||
    '';

  if (!meetLink) {
    throw new Error('Evento criado, mas o link do Google Meet não foi retornado.');
  }

  return {
    eventId: data.id,
    meetLink,
    htmlLink: data.htmlLink || '',
  };
}
