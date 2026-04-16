import { NextResponse } from 'next/server';

/**
 * GET /api/exercises/status
 * Verifica se as variáveis da ExerciseDB estão disponíveis no servidor.
 * Útil para debug: local vs Vercel, redeploy, etc.
 */
export async function GET() {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST;
  const base = process.env.EXERCISEDB_BASE_URL;

  return NextResponse.json({
    configured: !!key,
    hasHost: !!host,
    hasBaseUrl: !!base,
    keyLength: key ? key.length : 0,
  });
}
