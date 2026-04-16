import { SpeechClient, protos } from '@google-cloud/speech';
import { getGcpCredentials } from '@/lib/gcp/auth';

const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE || 'pt-BR';

function getSpeechClient(): SpeechClient {
  const { projectId, credentials } = getGcpCredentials();
  return new SpeechClient({
    credentials: {
      type: 'service_account',
      project_id: projectId,
      ...credentials,
    },
  });
}

/**
 * Inicia reconhecimento em batch para um arquivo de áudio no GCS.
 * Retorna o nome da operação (operation.name) para polling posterior.
 */
export async function startBatchRecognize(audioGcsUri: string): Promise<string> {
  const client = getSpeechClient();
  const { projectId } = getGcpCredentials();
  const recognizer = `projects/${projectId}/locations/global/recognizers/_`;

  const request: protos.google.cloud.speech.v2.IBatchRecognizeRequest = {
    recognizer,
    config: {
      autoDecodingConfig: {},
      languageCodes: [DEFAULT_LANGUAGE],
      model: 'chirp_3',
      features: {
        enableAutomaticPunctuation: true,
      },
    },
    files: [{ uri: audioGcsUri }],
    recognitionOutputConfig: {
      inlineResponseConfig: {},
    },
  };

  const [operation] = await client.batchRecognize(request);
  const name = operation.name;
  if (!name) throw new Error('Operação não retornou nome');
  return name;
}

export interface OperationResult {
  done: boolean;
  error?: { message: string; code?: number };
  response?: protos.google.cloud.speech.v2.IBatchRecognizeResponse;
}

/**
 * Consulta status da operação e retorna resultado quando concluída.
 */
export async function getOperation(name: string): Promise<OperationResult> {
  const client = getSpeechClient();
  const [operation] = await client.operationsClient.getOperation({ name });
  const result = operation.result as protos.google.cloud.speech.v2.IBatchRecognizeResponse | undefined;
  const error = operation.error;

  if (error) {
    return {
      done: true,
      error: {
        message: (error as { message?: string }).message || String(error),
        code: (error as { code?: number }).code,
      },
    };
  }

  if (!operation.done) {
    return { done: false };
  }

  return {
    done: true,
    response: result as protos.google.cloud.speech.v2.IBatchRecognizeResponse | undefined,
  };
}

function extractTextFromFileResult(fileResult: unknown): string {
  const t = (fileResult as { transcript?: { results?: Array<{ alternatives?: Array<{ transcript?: string }> }> } }).transcript;
  const chunks: string[] = [];
  if (t?.results) {
    for (const r of t.results) {
      const alt = r.alternatives?.[0];
      if (alt?.transcript) chunks.push(alt.transcript);
    }
  }
  return chunks.join(' ').trim();
}

/**
 * Extrai texto consolidado (concatenando alternativas) do resultado do batchRecognize.
 */
export function extractTranscriptFromResponse(
  response: protos.google.cloud.speech.v2.IBatchRecognizeResponse
): { byUri: Record<string, string>; firstTranscript?: string } {
  const byUri: Record<string, string> = {};
  const results = response.results || {};
  let firstTranscript: string | undefined;
  for (const [uri, fileResult] of Object.entries(results)) {
    const text = extractTextFromFileResult(fileResult);
    byUri[uri] = text;
    if (!firstTranscript && text) firstTranscript = text;
  }
  return { byUri, firstTranscript };
}
