import { describe, expect, it } from 'vitest';
import {
  MealImageVertexError,
  buildMealImageVertexGenerateContentBody,
  buildMealImageVertexGenerateContentUrl,
  classifyMealImageVertexHttpFailure,
  extractInlineImageFromGenerateContent,
  isMealImageVertexConfigurationMessage,
  resolveMealImageVertexLocation,
} from '@/lib/gcp/mealImageVertexClient.server';

describe('mealImageVertexClient', () => {
  it('monta o endpoint generateContent do Vertex', () => {
    expect(
      buildMealImageVertexGenerateContentUrl({
        projectId: 'proj-1',
        location: 'us-central1',
        model: 'gemini-3.1-flash-image',
      })
    ).toBe(
      'https://us-central1-aiplatform.googleapis.com/v1/projects/proj-1/locations/us-central1/publishers/google/models/gemini-3.1-flash-image:generateContent'
    );
  });

  it('fotos do cardápio usam o endpoint global por padrão', () => {
    expect(resolveMealImageVertexLocation({})).toBe('global');
    expect(resolveMealImageVertexLocation({ VERTEX_AI_LOCATION: 'us-central1' })).toBe('global');
    expect(resolveMealImageVertexLocation({ VERTEX_MEAL_IMAGE_LOCATION: 'europe-west1' })).toBe(
      'europe-west1'
    );
    expect(
      buildMealImageVertexGenerateContentUrl({
        projectId: 'proj-1',
        location: 'global',
        model: 'gemini-3.1-flash-image',
      })
    ).toBe(
      'https://aiplatform.googleapis.com/v1/projects/proj-1/locations/global/publishers/google/models/gemini-3.1-flash-image:generateContent'
    );
  });

  it('pede imagem quadrada 1K com personGeneration ALLOW_NONE', () => {
    const body = buildMealImageVertexGenerateContentBody('foto do prato');
    expect(body.generationConfig.imageConfig.aspectRatio).toBe('1:1');
    expect(body.generationConfig.imageConfig.imageSize).toBe('1K');
    expect(body.generationConfig.imageConfig.personGeneration).toBe('ALLOW_NONE');
    expect(JSON.stringify(body)).not.toContain('dontAllow');
    expect(body.contents[0].parts[0].text).toBe('foto do prato');
  });

  it('extrai inlineData (camelCase e snake_case)', () => {
    const png = Buffer.from('png-bytes').toString('base64');
    const camel = extractInlineImageFromGenerateContent({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: png } }] } }],
    });
    expect(camel.mimeType).toBe('image/png');
    expect(camel.buffer.toString()).toBe('png-bytes');

    const jpeg = Buffer.from('jpeg-bytes').toString('base64');
    const snake = extractInlineImageFromGenerateContent({
      candidates: [
        { content: { parts: [{ inline_data: { mime_type: 'image/jpeg', data: jpeg } }] } },
      ],
    });
    expect(snake.mimeType).toBe('image/jpeg');
  });

  it('falha se não houver bytes de imagem', () => {
    expect(() => extractInlineImageFromGenerateContent({ candidates: [{ finishReason: 'STOP' }] })).toThrow(
      MealImageVertexError
    );
  });

  it('texto sem imagem → VERTEX_TEXT_ONLY', () => {
    try {
      extractInlineImageFromGenerateContent({
        candidates: [{ content: { parts: [{ text: 'Não consegui gerar a imagem.' }] } }],
      });
      expect.fail('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MealImageVertexError);
      expect((error as MealImageVertexError).code).toBe('VERTEX_TEXT_ONLY');
    }
  });

  it('MIME inválido → VERTEX_MIME', () => {
    const data = Buffer.from('gif').toString('base64');
    try {
      extractInlineImageFromGenerateContent({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/gif', data } }] } }],
      });
      expect.fail('should throw');
    } catch (error) {
      expect((error as MealImageVertexError).code).toBe('VERTEX_MIME');
    }
  });

  it('bytes vazios → erro', () => {
    try {
      extractInlineImageFromGenerateContent({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: '' } }] } }],
      });
      expect.fail('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MealImageVertexError);
      expect(['VERTEX_EMPTY', 'VERTEX_TEXT_ONLY']).toContain((error as MealImageVertexError).code);
    }
  });

  it('classifica person_generation inválido como erro sistêmico de configuração', () => {
    const message =
      "Invalid value at 'generation_config.image_config.person_generation' (type.googleapis.com/google.cloud.aiplatform.v1.ImageConfig.PersonGeneration), \"dontAllow\"";
    expect(isMealImageVertexConfigurationMessage(message)).toBe(true);
    expect(classifyMealImageVertexHttpFailure(400, message)).toEqual({
      code: 'VERTEX_CONFIG',
      systemic: true,
    });
    expect(classifyMealImageVertexHttpFailure(403, 'Permission denied')).toEqual({
      code: 'VERTEX_CONFIG',
      systemic: true,
    });
    expect(classifyMealImageVertexHttpFailure(502, 'upstream timeout')).toEqual({
      code: 'VERTEX_HTTP',
      systemic: false,
    });
    expect(
      classifyMealImageVertexHttpFailure(
        404,
        'Publisher model `projects/x/locations/us-central1/publishers/google/models/gemini-3.1-flash-image` was not found or your project does not have access to it.'
      )
    ).toEqual({ code: 'VERTEX_CONFIG', systemic: true });
  });
});
