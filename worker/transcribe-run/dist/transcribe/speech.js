"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLongRunningRecognizeToCompletion = runLongRunningRecognizeToCompletion;
exports.extractTranscriptFromResponse = extractTranscriptFromResponse;
exports.checkOperation = checkOperation;
const speech_1 = require("@google-cloud/speech");
const auth_1 = require("../gcp/auth");
function getSpeechClientV1p1beta1() {
    const { projectId, credentials } = (0, auth_1.getGcpCredentials)();
    if (credentials != null) {
        return new speech_1.v1p1beta1.SpeechClient({
            projectId,
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key,
            },
        });
    }
    return new speech_1.v1p1beta1.SpeechClient({ projectId });
}
/**
 * Executa longRunningRecognize (v1p1beta1) e aguarda conclusão.
 * Retorna o response decodificado — não salva operation.
 */
async function runLongRunningRecognizeToCompletion(audioGcsUri, language = 'pt-BR') {
    const client = getSpeechClientV1p1beta1();
    console.log(`[speech] Starting longRunningRecognize: ${audioGcsUri} language=${language}`);
    const request = {
        config: {
            encoding: speech_1.protos.google.cloud.speech.v1p1beta1.RecognitionConfig.AudioEncoding.LINEAR16,
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
function extractTranscriptFromResponse(response) {
    const results = response.results ?? [];
    const text = results
        .map((r) => r.alternatives?.[0]?.transcript ?? '')
        .join('\n') || '';
    const resultsClean = results.map((r) => ({
        alternatives: (r.alternatives ?? []).map((a) => {
            const alt = {
                transcript: a.transcript ?? '',
            };
            if (typeof a.confidence === 'number')
                alt.confidence = a.confidence;
            return alt;
        }),
    }));
    return { text, results: resultsClean };
}
/**
 * Verifica status da operação longRunningRecognize (retrocompatibilidade).
 * Novos fluxos usam runLongRunningRecognizeToCompletion.
 */
async function checkOperation(operationName) {
    const client = getSpeechClientV1p1beta1();
    const progress = await client.checkLongRunningRecognizeProgress(operationName);
    if (!progress.done)
        return { done: false };
    if (progress.error) {
        const msg = progress.error.message || String(progress.error);
        return { done: true, error: msg };
    }
    const response = progress.result;
    if (response?.results) {
        const { text, results } = extractTranscriptFromResponse(response);
        return { done: true, transcriptText: text, raw: { text, results } };
    }
    return { done: true, raw: {} };
}
