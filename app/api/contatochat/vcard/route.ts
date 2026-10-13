import { NextRequest, NextResponse } from 'next/server';
import { getContatoChatData } from '@/lib/contatochat/getContatoChatData';
import { buildContatoChatVcard, contatoChatVcardFilename } from '@/lib/contatochat/contatoChatVcard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unavailable() {
  return NextResponse.json({ ok: false, error: 'Contato indisponível' }, { status: 404 });
}

export async function GET(request: NextRequest) {
  const medicoId = request.nextUrl.searchParams.get('m')?.trim() || '';
  const slug = request.nextUrl.searchParams.get('slug')?.trim() || '';

  if (!medicoId && !slug) {
    return unavailable();
  }

  const data = await getContatoChatData({ medicoId, slug });
  if (!data.available) {
    return unavailable();
  }

  const vcard = buildContatoChatVcard({
    contactName: data.contactName,
    organizationName: data.organizationName,
    phoneDigits: data.phoneDigits,
    websiteUrl: data.websiteUrl,
    note: data.note,
    photoUrl: data.photoUrl,
  });

  return new NextResponse(vcard, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `inline; filename="${contatoChatVcardFilename(data.contactName)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
