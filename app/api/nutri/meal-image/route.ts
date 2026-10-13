import { NextRequest, NextResponse } from 'next/server';
import { requireMealImageAccess } from '@/lib/nutri/mealImageAccess.server';
import { readMealImageSignedUrl } from '@/lib/nutri/mealImageReadService.server';

export const runtime = 'nodejs';

/**
 * GET /api/nutri/meal-image?patientId=&refeicaoKey=&slotId=
 * Resolve signed URL a partir do slot no Firestore.
 * Não aceita gcsPath do frontend.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId') || '';
  const auth = await requireMealImageAccess(request, patientId);
  if (auth instanceof NextResponse) return auth;

  const slotIndexRaw = searchParams.get('slotIndex');
  const slotIndexParsed = slotIndexRaw != null && slotIndexRaw !== '' ? Number(slotIndexRaw) : null;
  const slotIndex =
    typeof slotIndexParsed === 'number' && Number.isInteger(slotIndexParsed) ? slotIndexParsed : null;

  const result = await readMealImageSignedUrl({
    patientId: auth.pacienteDocId,
    refeicaoKey: searchParams.get('refeicaoKey') || '',
    slotId: searchParams.get('slotId'),
    slotIndex,
  });

  if (!result.ok) {
    const status =
      result.code === 'INVALID_INPUT' ||
      result.code === 'SLOT_NOT_FOUND' ||
      result.code === 'PLANO_NOT_FOUND'
        ? 400
        : 502;
    return NextResponse.json({ ok: false, code: result.code, error: result.message }, { status });
  }

  return NextResponse.json({
    ok: true,
    imageUrl: result.imageUrl,
    status: result.status,
    ...(result.sourceHash ? { sourceHash: result.sourceHash } : {}),
  });
}
