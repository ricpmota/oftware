"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractWavMono16k = extractWavMono16k;
exports.cleanupTmp = cleanupTmp;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const ffmpegPath = ffmpeg_static_1.default || '/usr/bin/ffmpeg';
fluent_ffmpeg_1.default.setFfmpegPath(ffmpegPath);
console.log('[audio] ffmpeg path:', ffmpegPath);
/**
 * Converte vídeo para WAV mono 16kHz (ideal para Speech-to-Text).
 */
async function extractWavMono16k(inputPath, outputPath) {
    const out = outputPath ||
        path_1.default.join(os_1.default.tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
    console.log(`[audio] Converting ${inputPath} -> ${out}`);
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(inputPath)
            .outputOptions(['-acodec pcm_s16le', '-ar 16000', '-ac 1'])
            .output(out)
            .on('end', () => {
            console.log(`[audio] Conversion ok: ${out}`);
            resolve(out);
        })
            .on('error', (err) => {
            console.error('[audio] ffmpeg error:', err.message);
            reject(err);
        })
            .run();
    });
}
function cleanupTmp(filePath) {
    try {
        if (filePath && fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            console.log(`[audio] Cleaned tmp: ${filePath}`);
        }
    }
    catch {
        // ignore
    }
}
