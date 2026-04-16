export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import * as storage from '@/lib/gcp/storage';
import { getServiceAccountEmailSafe } from '@/lib/gcp/auth';
import { createManifestItem, getManifestPath } from '@/lib/transcribe/manifest';
import { isVideoFile } from '@/lib/transcribe/paths';

const COURSE_PREFIX = process.env.GCS_COURSE_PREFIX || 'OFTREVIEW 2023/';
const BUCKET = process.env.GCS_BUCKET || 'oftware';

const StartSchema = z.object({
  maxFiles: z.number().int().min(1).max(1000).optional().default(500),
  force: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { maxFiles, force } = StartSchema.parse(body);

    console.log('[auth] using service account:', getServiceAccountEmailSafe());

    // Listar objetos com prefix fixo (nunca do client)
    const allNames = await storage.listObjects(COURSE_PREFIX);
    const videoNames = allNames.filter(isVideoFile);
    const limited = videoNames.slice(0, maxFiles);

    const batchId = randomUUID();
    const items: Awaited<ReturnType<typeof createManifestItem>>[] = [];
    let skippedExisting = 0;

    for (const objectName of limited) {
      const item = createManifestItem(objectName);
      if (!force) {
        const txtObjectName = item.outputTxtGcsUri.replace(`gs://${BUCKET}/`, '');
        const txtExists = await storage.exists(txtObjectName);
        if (txtExists) {
          item.status = 'skipped';
          skippedExisting++;
        }
      }
      items.push(item);
    }

    const manifest = {
      batchId,
      coursePrefix: COURSE_PREFIX,
      bucket: BUCKET,
      createdAt: new Date().toISOString(),
      items,
    };

    await storage.writeJson(getManifestPath(batchId), manifest);

    const manifestGcsUri = `gs://${BUCKET}/${getManifestPath(batchId)}`;
    const queued = items.filter((i) => i.status === 'queued').length;

    return NextResponse.json({
      ok: true,
      batchId,
      totalFound: videoNames.length,
      queued,
      skippedExisting,
      manifestGcsUri,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Body inválido', details: err.errors }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/transcribe-oftreview/start]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
