"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const storage = __importStar(require("./gcp/storage"));
const auth_1 = require("./gcp/auth");
const audio_1 = require("./transcribe/audio");
const speech_1 = require("./transcribe/speech");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const ProcessSchema = zod_1.z.object({
    bucket: zod_1.z.string().min(1),
    objectName: zod_1.z.string().min(1),
    audioGcsUri: zod_1.z.string().regex(/^gs:\/\/[^/]+\/.+\.wav$/),
    outputTxtGcsUri: zod_1.z.string().regex(/^gs:\/\/[^/]+\/.+\.txt$/).optional(),
    outputJsonGcsUri: zod_1.z.string().regex(/^gs:\/\/[^/]+\/.+\.json$/).optional(),
    language: zod_1.z.string().optional().default('pt-BR'),
});
function deriveOutputUris(audioGcsUri) {
    const base = audioGcsUri.replace(/\.wav$/i, '').replace(/transcripts-audio\//i, 'transcripts/');
    return {
        outputTxtGcsUri: `${base}.txt`,
        outputJsonGcsUri: `${base}.json`,
    };
}
app.post('/process', async (req, res) => {
    const { projectId, credentials } = (0, auth_1.getGcpCredentials)();
    console.log('[auth] using:', (0, auth_1.getServiceAccountEmailSafe)(), 'credentialsProvided=', Boolean(credentials), 'projectId=', projectId);
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
        const videoPath = path_1.default.join(os_1.default.tmpdir(), `video-${Date.now()}-${Math.random().toString(36).slice(2)}${path_1.default.extname(objectName)}`);
        let wavPath = '';
        try {
            await storage.downloadToFile(bucket, objectName, videoPath);
        }
        catch (err) {
            (0, audio_1.cleanupTmp)(videoPath);
            res.status(500).json({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
                step: 'download',
                details: String(err),
            });
            return;
        }
        try {
            wavPath = await (0, audio_1.extractWavMono16k)(videoPath);
        }
        catch (err) {
            (0, audio_1.cleanupTmp)(videoPath);
            res.status(500).json({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
                step: 'ffmpeg',
                details: String(err),
            });
            return;
        }
        try {
            await storage.uploadFromFile(audioBucket, audioObjectName, wavPath);
        }
        catch (err) {
            (0, audio_1.cleanupTmp)(videoPath);
            (0, audio_1.cleanupTmp)(wavPath);
            res.status(500).json({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
                step: 'upload',
                details: String(err),
            });
            return;
        }
        (0, audio_1.cleanupTmp)(videoPath);
        (0, audio_1.cleanupTmp)(wavPath);
        try {
            const response = await (0, speech_1.runLongRunningRecognizeToCompletion)(audioGcsUri, language);
            console.log('[speech] transcription completed, extracting text...');
            const { text, results } = (0, speech_1.extractTranscriptFromResponse)(response);
            const { bucket: txtBucket, objectName: txtObjectName } = storage.parseGcsUri(outputTxtGcsUri);
            const { bucket: jsonBucket, objectName: jsonObjectName } = storage.parseGcsUri(outputJsonGcsUri);
            await storage.uploadFromBuffer(txtBucket, txtObjectName, text, 'text/plain; charset=utf-8');
            await storage.uploadFromBuffer(jsonBucket, jsonObjectName, JSON.stringify({ text, results }, null, 2), 'application/json; charset=utf-8');
            res.json({
                ok: true,
                done: true,
                audioGcsUri,
                outputTxtGcsUri,
                outputJsonGcsUri,
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
                step: 'speech',
                details: String(err),
            });
        }
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
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
app.get('/result', async (req, res) => {
    const operationName = req.query.operationName;
    if (!operationName || typeof operationName !== 'string' || !operationName.trim()) {
        res.status(400).json({ ok: false, error: 'operationName is required' });
        return;
    }
    try {
        const result = await (0, speech_1.checkOperation)(operationName.trim());
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
    }
    catch (err) {
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
