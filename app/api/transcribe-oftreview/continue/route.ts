export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as storage from '@/lib/gcp/storage';
import { getServiceAccountEmailSafe } from '@/lib/gcp/auth';
import { loadManifest, saveManifest, getManifestPath } from '@/lib/transcribe/manifest';
import { gcsUriToObjectName } from '@/lib/transcribe/paths';

const BUCKET = process.env.GCS_BUCKET || 'oftware';
const COURSE_PREFIX = process.env.GCS_COURSE_PREFIX || 'OFTREVIEW 2023/';
const TRANSCRIBE_WORKER_URL = process.env.TRANSCRIBE_WORKER_URL || '';

const ContinueSchema = z.object({
  batchId: z.string().uuid(),
  maxToProcess: z.number().int().min(1).max(10).optional().default(3),
  concurrency: z.number().int().min(1).max(5).optional().default(2),
  force: z.boolean().optional().default(false),
});

interface ProcessResult {
  status: 'started' | 'done' | 'skipped' | 'failed';
  objectName?: string;
  errorMessage?: string;
}

async function processOne(
  item: {
    objectName: string;
    outputTxtGcsUri: string;
    outputJsonGcsUri: string;
    outputAudioGcsUri: string;
    status: string;
    operationName?: string;
    error?: { message: string; code?: string; raw?: string };
  },
  force: boolean
): Promise<ProcessResult> {
  const txtObjectName = gcsUriToObjectName(item.outputTxtGcsUri);
  if (!force) {
    const exists = await storage.exists(txtObjectName);
    if (exists) {
      item.status = 'skipped';
      return { status: 'skipped' };
    }
  }

  if (!TRANSCRIBE_WORKER_URL) {
    const errMsg = 'TRANSCRIBE_WORKER_URL não configurado';
    item.status = 'failed';
    item.error = { message: errMsg, raw: errMsg };
    return { status: 'failed', objectName: item.objectName, errorMessage: errMsg };
  }

  try {
    console.log(`[continue] Calling worker for objectName=${item.objectName}`);

    const res = await fetch(`${TRANSCRIBE_WORKER_URL.replace(/\/$/, '')}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucket: BUCKET,
        objectName: item.objectName,
        audioGcsUri: item.outputAudioGcsUri,
        outputTxtGcsUri: item.outputTxtGcsUri,
        outputJsonGcsUri: item.outputJsonGcsUri,
        language: 'pt-BR',
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      done?: boolean;
      skipped?: boolean;
      operationName?: string;
      audioGcsUri?: string;
      error?: string;
    };

    if (!res.ok) {
      throw new Error(data.error || res.statusText || `HTTP ${res.status}`);
    }

    if (!data.ok) {
      throw new Error(data.error || 'Worker retornou erro');
    }

    if (data.skipped) {
      item.status = 'skipped';
      console.log(`[continue] Worker skipped (idempotência): ${item.objectName}`);
      return { status: 'skipped' };
    }

    if (data.done) {
      item.status = 'done';
      if (item.operationName) delete item.operationName;
      console.log(`[continue] Worker ok: transcrição concluída: ${item.objectName}`);
      return { status: 'done' };
    }

    item.status = 'running';
    item.operationName = data.operationName;
    console.log(`[continue] Worker ok: operationName=${data.operationName}`);
    return { status: 'started' };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const errRaw = String(e);
    console.error(`[transcribe/continue] Erro objectName=${item.objectName}:`, errMsg);

    item.status = 'failed';
    item.error = {
      message: errMsg,
      code: (e as { code?: string })?.code,
      raw: errRaw,
    };
    return { status: 'failed', objectName: item.objectName, errorMessage: errMsg };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { batchId, maxToProcess, concurrency, force } = ContinueSchema.parse(body);

    console.log('[auth] using service account:', getServiceAccountEmailSafe());

    if (!BUCKET || !COURSE_PREFIX) {
      return NextResponse.json(
        { error: 'GCS_BUCKET ou GCS_COURSE_PREFIX não configurados' },
        { status: 500 }
      );
    }

    const manifest = await loadManifest(batchId);
    const queuedItems = manifest.items.filter((i) => i.status === 'queued');
    const toProcess = queuedItems.slice(0, maxToProcess);

    let started = 0;
    let skipped = 0;
    let failed = 0;
    const failedPreview: { objectName: string; errorMessage: string }[] = [];

    for (let i = 0; i < toProcess.length; i += concurrency) {
      const batch = toProcess.slice(i, i + concurrency);
      const results = await Promise.all(batch.map((item) => processOne(item, force)));
      for (const r of results) {
        if (r.status === 'started') started++;
        else if (r.status === 'done') started++;
        else if (r.status === 'skipped') skipped++;
        else if (r.status === 'failed') {
          failed++;
          if (r.objectName && r.errorMessage && failedPreview.length < 2) {
            failedPreview.push({ objectName: r.objectName, errorMessage: r.errorMessage });
          }
        }
      }
    }

    await saveManifest(manifest);

    const manifestGcsUri = `gs://${BUCKET}/${getManifestPath(batchId)}`;

    const response: Record<string, unknown> = {
      ok: true,
      batchId,
      attempted: toProcess.length,
      started,
      failed,
      skipped,
      manifestGcsUri,
    };
    if (failedPreview.length > 0) {
      response.failedPreview = failedPreview;
    }

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Body inválido', details: err.errors }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/transcribe-oftreview/continue]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
