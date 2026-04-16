import { v1p1beta1, protos } from '@google-cloud/speech';
import { getGcpCredentials } from '../gcp/auth';

function getSpeechClientV1p1beta1() {
  const { projectId, credentials } = getGcpCredentials();
  if (credentials != null) {
    return new v1p1beta1.SpeechClient({
      projectId,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });
  }
  return new v1p1beta1.SpeechClient({ projectId });
}

/**
 * Executa longRunningRecognize (v1p1beta1) e aguarda conclusão.
 * Retorna o response decodificado — não salva operation.
 */
export async function runLongRunningRecognizeToCompletion(
  audioGcsUri: string,
  language: string = 'pt-BR'
): Promise<protos.google.cloud.speech.v1p1beta1.ILongRunningRecognizeResponse> {
  const client = getSpeechClientV1p1beta1();

  console.log(`[speech] Starting longRunningRecognize: ${audioGcsUri} language=${language}`);

  const request: protos.google.cloud.speech.v1p1beta1.ILongRunningRecognizeRequest = {
    config: {
      encoding: protos.google.cloud.speech.v1p1beta1.RecognitionConfig.AudioEncoding.LINEAR16,
      sampleRateHertz: 16000,
      languageCode: language,
      enableAutomaticPunctuation: true,
    },
    audio: { uri: audioGcsUri },
  };

  const [operation] = await client.longRunningRecognize(request);
  console.log('[speech] waiting operation to finish...');
  const [response] = await operation.promise();

  if (!response) {
    throw new Error('Operação não retornou response');
  }

  console.log(`[speech] longRunningRecognize completed: ${audioGcsUri}`);
  return response;
}

/**
 * Extrai texto legível e JSON serializável do response.
 */
export function extractTranscriptFromResponse(
  response: protos.google.cloud.speech.v1p1beta1.ILongRunningRecognizeResponse
): { text: string; results: Array<{ alternatives: Array<{ transcript: string; confidence?: number }> }> } {
  const results = response.results ?? [];
  const text =
    results
      .map((r) => r.alternatives?.[0]?.transcript ?? '')
      .join('\n') || '';

  const resultsClean = results.map((r) => ({
    alternatives: (r.alternatives ?? []).map((a) => {
      const alt: { transcript: string; confidence?: number } = {
        transcript: a.transcript ?? '',
      };
      if (typeof a.confidence === 'number') alt.confidence = a.confidence;
      return alt;
    }),
  }));

  return { text, results: resultsClean };
}

/**
 * Verifica status da operação longRunningRecognize (retrocompatibilidade).
 * Novos fluxos usam runLongRunningRecognizeToCompletion.
 */
export async function checkOperation(
  operationName: string
): Promise<{ done: boolean; transcriptText?: string; raw?: unknown; error?: string }> {
  const client = getSpeechClientV1p1beta1();
  const progress = await client.checkLongRunningRecognizeProgress(operationName);

  if (!progress.done) return { done: false };
  if (progress.error) {
    const msg = (progress.error as { message?: string }).message || String(progress.error);
    return { done: true, error: msg };
  }

  const response = progress.result as protos.google.cloud.speech.v1p1beta1.ILongRunningRecognizeResponse | undefined;
  if (response?.results) {
    const { text, results } = extractTranscriptFromResponse(response);
    return { done: true, transcriptText: text, raw: { text, results } };
  }
  return { done: true, raw: {} };
}
