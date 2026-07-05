import { NextRequest, NextResponse } from 'next/server';
import { extrairLaudoOftalmologicoComGemini } from '@/services/laudoOftalmologicoGeminiService';
import {
  normalizeOftalmoExamTypeParam,
  type OftalmoExamType,
} from '@/lib/oftpay/laudoOftalmoExtraction';
import { normalizeEye } from '@/lib/oftpay/laudoOftalmoEye';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** Modalidade genérica quando o tipo vem ausente ou inválido (documento por imagem). */
const FALLBACK_EXAM_TYPE: OftalmoExamType = 'retinografia';

/**
 * POST multipart/form-data:
 * - file: PDF ou imagem
 * - examType: um dos códigos oftalmológicos (ex.: oct_macula)
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: 'Envie o arquivo no campo "file".' },
        { status: 400 }
      );
    }

    const examTypeParam = form.get('examType');
    const raw =
      typeof examTypeParam === 'string'
        ? examTypeParam
        : examTypeParam != null
          ? String(examTypeParam)
          : '';
    const normalizedExamType = normalizeOftalmoExamTypeParam(raw);
    const usedExamTypeFallback = normalizedExamType === null;
    const examType = normalizedExamType ?? FALLBACK_EXAM_TYPE;
    const eyeRaw = form.get('eye');
    const eye = normalizeEye(
      typeof eyeRaw === 'string' ? eyeRaw : eyeRaw != null ? String(eyeRaw) : ''
    );

    const mimeType = file.type || 'application/octet-stream';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await extrairLaudoOftalmologicoComGemini({
      buffer,
      mimeType,
      examType,
      fileName: (file as File).name ?? null,
      eye,
      usedExamTypeFallback,
    });

    return NextResponse.json({
      ok: true,
      data: {
        dataExame: data.dataExame,
        camposMapeados: data.camposMapeados,
        examesNaoMapeados: data.examesNaoMapeados,
        avisos: data.avisos,
        examType: data.examType,
        examTypeLabel: data.examTypeLabel,
        camposEstruturados: data.camposEstruturados,
        rawSummary: data.rawSummary ?? null,
        qualityFlags: data.qualityFlags ?? [],
        qualitySummary: data.qualitySummary ?? null,
        reviewStatus: data.reviewStatus,
        suggestedExamType: data.suggestedExamType ?? null,
        suggestedExamTypeLabel: data.suggestedExamTypeLabel ?? null,
        examTypeConfidence: data.examTypeConfidence ?? null,
        examTypeSuggestionReason: data.examTypeSuggestionReason ?? null,
        examTypeMismatch: !!data.examTypeMismatch,
        checklistCoverage: data.checklistCoverage ?? null,
        checklistFilledCount: data.checklistFilledCount ?? 0,
        checklistTotal: data.checklistTotal ?? 0,
        checklistStatus: data.checklistStatus ?? null,
        filledKeyFields: data.filledKeyFields ?? [],
        missingKeyFields: data.missingKeyFields ?? [],
        eye: data.eye,
        eyeLabel: data.eyeLabel,
        detectedEye: data.detectedEye,
        detectedEyeLabel: data.detectedEyeLabel,
        eyeConfidence: data.eyeConfidence ?? null,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao processar arquivo.';
    console.error('[laudo-exames/extract]', e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
