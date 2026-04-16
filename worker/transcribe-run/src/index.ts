import express, { Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import os from 'os';
import * as storage from './gcp/storage';
import { getGcpCredentials, getServiceAccountEmailSafe } from './gcp/auth';
import { extractWavMono16k, cleanupTmp } from './transcribe/audio';
import {
  runLongRunningRecognizeToCompletion,
  extractTranscriptFromResponse,
  checkOperation,
} from './transcribe/speech';

const app = express();
app.use(express.json());

const ProcessSchema = z.object({
  bucket: z.string().min(1),
  objectName: z.string().min(1),
  audioGcsUri: z.string().regex(/^gs:\/\/[^/]+\/.+\.wav$/),
  outputTxtGcsUri: z.string().regex(/^gs:\/\/[^/]+\/.+\.txt$/).optional(),
  outputJsonGcsUri: z.string().regex(/^gs:\/\/[^/]+\/.+\.json$/).optional(),
  language: z.string().optional().default('pt-BR'),
});

function deriveOutputUris(audioGcsUri: string): { outputTxtGcsUri: string; outputJsonGcsUri: string } {
  const base = audioGcsUri.replace(/\.wav$/i, '').replace(/transcripts-audio\//i, 'transcripts/');
  return {
    outputTxtGcsUri: `${base}.txt`,
    outputJsonGcsUri: `${base}.json`,
  };
}

type ProcessStep = 'download' | 'ffmpeg' | 'upload' | 'speech';

app.post('/process', async (req: Request, res: Response) => {
  const { projectId, credentials } = getGcpCredentials();
  console.log('[auth] using:', getServiceAccountEmailSafe(), 'credentialsProvided=', Boolean(credentials), 'projectId=', projectId);

  if (!projectId || projectId.trim() === '') {
    res.status(500).json({
      ok: false,
      error: 'GCP_PROJECT_ID não definido',
      details: 'Defina GCP_PROJECT_ID (ou GOOGLE_CLOUD_PROJECT/GCLOUD_PROJECT) no deploy do Cloud Run.',
    });
    return;
  }

  try {
    const body = ProcessSchema.parse(req.body);
    const { bucket, objectName, audioGcsUri, language } = body;
    const derived = deriveOutputUris(audioGcsUri);
    const outputTxtGcsUri = body.outputTxtGcsUri ?? derived.outputTxtGcsUri;
    const outputJsonGcsUri = body.outputJsonGcsUri ?? derived.outputJsonGcsUri;

    console.log(`[process] Received: bucket=${bucket} objectName=${objectName}`);

    const { bucket: audioBucket, objectName: audioObjectName } = storage.parseGcsUri(audioGcsUri);

    const alreadyProcessed = await storage.checkIfAlreadyProcessed(audioBucket, audioObjectName);
    if (alreadyProcessed) {
      console.log(`[skip] already processed: ${audioGcsUri}`);
      res.status(200).json({
        ok: true,
        skipped: true,
        audioGcsUri,
      });
      return;
    }

    const videoPath = path.join(
      os.tmpdir(),
      `video-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(objectName)}`
    );
    let wavPath = '';

    try {
      await storage.downloadToFile(bucket, objectName, videoPath);
    } catch (err) {
      cleanupTmp(videoPath);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        step: 'download' as ProcessStep,
        details: String(err),
      });
      return;
    }

    try {
      wavPath = await extractWavMono16k(videoPath);
    } catch (err) {
      cleanupTmp(videoPath);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        step: 'ffmpeg' as ProcessStep,
        details: String(err),
      });
      return;
    }

    try {
      await storage.uploadFromFile(audioBucket, audioObjectName, wavPath);
    } catch (err) {
      cleanupTmp(videoPath);
      cleanupTmp(wavPath);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        step: 'upload' as ProcessStep,
        details: String(err),
      });
      return;
    }

    cleanupTmp(videoPath);
    cleanupTmp(wavPath);

    try {
      const response = await runLongRunningRecognizeToCompletion(audioGcsUri, language);
      console.log('[speech] transcription completed, extracting text...');
      const { text, results } = extractTranscriptFromResponse(response);

      const { bucket: txtBucket, objectName: txtObjectName } = storage.parseGcsUri(outputTxtGcsUri);
      const { bucket: jsonBucket, objectName: jsonObjectName } = storage.parseGcsUri(outputJsonGcsUri);

      await storage.uploadFromBuffer(txtBucket, txtObjectName, text, 'text/plain; charset=utf-8');
      await storage.uploadFromBuffer(
        jsonBucket,
        jsonObjectName,
        JSON.stringify({ text, results }, null, 2),
        'application/json; charset=utf-8'
      );

      res.json({
        ok: true,
        done: true,
        audioGcsUri,
        outputTxtGcsUri,
        outputJsonGcsUri,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        step: 'speech' as ProcessStep,
        details: String(err),
      });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ ok: false, error: 'Body inválido', details: err.errors });
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[process] Error:', msg);
    res.status(500).json({
      ok: false,
      error: msg,
      details: String(err),
    });
  }
});

app.get('/result', async (req: Request, res: Response) => {
  const operationName = req.query.operationName;
  if (!operationName || typeof operationName !== 'string' || !operationName.trim()) {
    res.status(400).json({ ok: false, error: 'operationName is required' });
    return;
  }
  try {
    const result = await checkOperation(operationName.trim());
    if (!result.done) {
      res.json({ ok: true, done: false });
      return;
    }
    if (result.error) {
      res.json({ ok: false, done: true, error: result.error });
      return;
    }
    res.json({
      ok: true,
      done: true,
      transcriptText: result.transcriptText ?? '',
      raw: result.raw,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[result] Error:', msg);
    res.status(500).json({ ok: false, error: msg });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const PORT = parseInt(process.env.PORT || '8080', 10);
app.listen(PORT, () => {
  console.log(`[worker] Listening on port ${PORT}`);
});
