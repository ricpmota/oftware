export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/gcp/storage';
import { getServiceAccountEmailSafe } from '@/lib/gcp/auth';
import { loadManifest, saveManifest } from '@/lib/transcribe/manifest';
import { gcsUriToObjectName } from '@/lib/transcribe/paths';
import type { Progress, ManifestItem } from '@/lib/transcribe/types';

const COURSE_PREFIX = process.env.GCS_COURSE_PREFIX || 'OFTREVIEW 2023/';
const MAX_RUNNING_PER_CALL = 20;

/** Extrai subject: objectName.split('/')[1] (pasta após "OFTREVIEW 2023/"). */
function getSubject(objectName: string): string {
  const parts = objectName.split('/');
  return parts[1] ?? '(raiz)';
}

interface WorkerResultResponse {
  ok: boolean;
  done?: boolean;
  transcriptText?: string;
  raw?: unknown;
  error?: string;
}

function computeProgress(manifest: Awaited<ReturnType<typeof loadManifest>>): Progress {
  const items = manifest.items;
  return {
    total: items.length,
    done: items.filter((i) => i.status === 'done').length,
    running: items.filter((i) => i.status === 'running').length,
    queued: items.filter((i) => i.status === 'queued').length,
    skipped: items.filter((i) => i.status === 'skipped').length,
    failed: items.filter((i) => i.status === 'failed').length,
  };
}

async function fetchWorkerResult(
  base: string,
  operationName: string
): Promise<WorkerResultResponse & { errorRaw?: string }> {
  const url = `${base}/result?operationName=${encodeURIComponent(operationName)}`;
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as WorkerResultResponse;
  if (!res.ok) {
    return {
      ok: false,
      done: true,
      error: data.error ?? res.statusText ?? `HTTP ${res.status}`,
      errorRaw: JSON.stringify(data),
    };
  }
  if (data.ok === false && data.done === true) {
    return { ...data, errorRaw: JSON.stringify(data) };
  }
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const batchId = request.nextUrl.searchParams.get('batchId');
    if (!batchId) {
      return NextResponse.json({ error: 'batchId obrigatório' }, { status: 400 });
    }

    const base = process.env.TRANSCRIBE_WORKER_URL?.replace(/\/+$/, '');
    if (!base) {
      return NextResponse.json({ ok: false, error: 'TRANSCRIBE_WORKER_URL missing' }, { status: 500 });
    }

    console.log('[auth] using service account:', getServiceAccountEmailSafe());

    const manifest = await loadManifest(batchId);
    let manifestModified = false;

    const runningItems = manifest.items.filter(
      (i) => i.status === 'running' && i.operationName
    );
    const toProcess = runningItems.slice(0, MAX_RUNNING_PER_CALL);

    for (const item of toProcess) {
      const operationName = item.operationName!;
      const result = await fetchWorkerResult(base, operationName);

      if (result.ok === true && result.done === false) {
        continue;
      }

      if (result.ok === false || (result.done === true && result.error)) {
        item.status = 'failed';
        item.error = {
          message: result.error ?? 'Erro desconhecido',
          raw: (result as { errorRaw?: string }).errorRaw ?? JSON.stringify(result),
        };
        delete item.operationName;
        manifestModified = true;
        continue;
      }

      // ok:true, done:true, transcriptText, raw — extrair texto limpo e JSON legível
      const raw = result.raw ?? {};
      const results = Array.isArray(raw.results) ? raw.results : [];
      const text =
        results
          .map((r: { alternatives?: Array<{ transcript?: string }> }) =>
            r?.alternatives?.[0]?.transcript ?? ''
          )
          .join('\n') || (result.transcriptText ?? '');
      const jsonOutput = {
        text,
        results: results.map((r: { alternatives?: Array<{ transcript?: string; confidence?: number }> }) => ({
          alternatives: r?.alternatives?.map((a) => ({
            transcript: a?.transcript ?? '',
            confidence: a?.confidence,
          })) ?? [],
        })),
      };

      const txtObjectName = gcsUriToObjectName(item.outputTxtGcsUri);
      const jsonObjectName = gcsUriToObjectName(item.outputJsonGcsUri);

      await storage.uploadFromBuffer(txtObjectName, Buffer.from(text, 'utf8'), 'text/plain; charset=utf-8');
      await storage.writeJson(jsonObjectName, jsonOutput);

      item.status = 'done';
      delete item.operationName;
      manifestModified = true;
    }

    if (manifestModified) {
      await saveManifest(manifest);
    }

    const progress = computeProgress(manifest);
    const done = progress.queued === 0 && progress.running === 0;

    const bySubject: Record<
      string,
      { total: number; done: number; running: number; queued: number; failed: number; skipped: number; percent: number }
    > = {};
    const itemsBySubject: Record<string, ManifestItem[]> = {};

    for (const item of manifest.items) {
      const subj = getSubject(item.objectName);
      if (!bySubject[subj]) {
        bySubject[subj] = { total: 0, done: 0, running: 0, queued: 0, failed: 0, skipped: 0, percent: 0 };
      }
      bySubject[subj].total++;
      if (item.status === 'done') bySubject[subj].done++;
      else if (item.status === 'running') bySubject[subj].running++;
      else if (item.status === 'queued') bySubject[subj].queued++;
      else if (item.status === 'failed') bySubject[subj].failed++;
      else if (item.status === 'skipped') bySubject[subj].skipped++;

      if (!itemsBySubject[subj]) itemsBySubject[subj] = [];
      itemsBySubject[subj].push(item);
    }

    for (const subj of Object.keys(bySubject)) {
      const s = bySubject[subj];
      s.percent = s.total > 0 ? Math.round(((s.done + s.skipped) / s.total) * 100) : 0;
    }

    const runningPreview = manifest.items
      .filter((i) => i.status === 'running')
      .slice(0, 5)
      .map((i) => ({
        objectName: i.objectName,
        subject: getSubject(i.objectName),
        state: 'running' as const,
      }));

    const failedPreview = manifest.items
      .filter((i) => i.status === 'failed')
      .slice(0, 5)
      .map((i) => ({
        objectName: i.objectName,
        subject: getSubject(i.objectName),
        errorMessage: (i.error?.message ?? 'Erro desconhecido').slice(0, 120),
      }));

    return NextResponse.json({
      ok: true,
      batchId,
      progress,
      done,
      bySubject,
      runningPreview,
      failedPreview,
      itemsBySubject,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/transcribe-oftreview/status]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
