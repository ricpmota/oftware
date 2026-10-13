import { readFileSync } from 'node:fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { isMealImageGenerationEnabled } from '@/lib/nutri/mealImageFlags.server';
import {
  assertMealImageForceRegenerate,
  assertPatientMayRequestMealImageGeneration,
} from '@/lib/nutri/mealImageGeneratePolicy.server';
import { MEAL_IMAGE_VERTEX_TIMEOUT_MS } from '@/lib/gcp/mealImageVertexClient.server';
import { MEAL_IMAGE_AUTO_CONCURRENCY } from '@/lib/nutri/mealImageAutoQueue';
import { shouldApplyMealImageClientUpdate } from '@/lib/nutri/mealImageAutoQueue';

const ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('ETAPA 08 — segurança operacional', () => {
  it('1–2. kill switch: POST consulta a flag; GET não', () => {
    expect(isMealImageGenerationEnabled({} as NodeJS.ProcessEnv)).toBe(true);
    expect(isMealImageGenerationEnabled({ MEAL_IMAGE_GENERATION_ENABLED: 'false' } as NodeJS.ProcessEnv)).toBe(
      false
    );
    expect(readSrc('app/api/nutri/meal-image/generate/route.ts')).toContain('isMealImageGenerationEnabled');
    expect(readSrc('app/api/nutri/meal-image/route.ts')).not.toContain('isMealImageGenerationEnabled');
    expect(readSrc('app/api/nutri/meal-image/route.ts')).not.toContain('MEAL_IMAGE_GENERATION_ENABLED');
  });

  it('3. pending expirado: lock não trata pending velho como fresco', () => {
    expect(readSrc('lib/nutri/mealImagePlanoStore.server.ts')).toContain('isMealImagePendingFresh');
  });

  it('4–5. slot da refeição e path GCS sanitizados', () => {
    expect(readSrc('lib/nutri/mealImageSlot.ts')).toContain('isMealImageSlotIdForRefeicao');
    expect(readSrc('lib/nutri/mealImageStorage.server.ts')).toContain("throw new Error('Identificador inválido");
    expect(readSrc('lib/nutri/mealImageStorage.server.ts')).toContain("path.includes('..')");
  });

  it('6–8. Vertex recusa texto, MIME inválido e bytes vazios', () => {
    const vertex = readSrc('lib/gcp/mealImageVertexClient.server.ts');
    expect(vertex).toContain('VERTEX_TEXT_ONLY');
    expect(vertex).toContain('VERTEX_MIME');
    expect(vertex).toContain('VERTEX_EMPTY');
    expect(vertex).not.toContain("mime || 'image/png'");
  });

  it('9–11. vertex_call só depois do lock; already_* não gera', () => {
    const service = readSrc('lib/nutri/mealImageGenerateService.server.ts');
    expect(service).toContain('logVertexCall');
    expect(service).toContain("lock.kind === 'already_current'");
    expect(service).toContain("lock.kind === 'already_pending'");
    const callIdx = service.lastIndexOf('logVertexCall({');
    expect(callIdx).toBeGreaterThan(service.indexOf("lock.kind === 'already_pending'"));
    expect(callIdx).toBeGreaterThan(service.indexOf('const generationId'));
  });

  it('12–14. force restaura anterior / source_changed não associa', () => {
    expect(readSrc('lib/nutri/mealImagePlanoStore.server.ts')).toContain('resolveMealImageAfterFailedGeneration');
    expect(readSrc('lib/nutri/mealImageGenerateService.server.ts')).toContain('previousMealImage');
  });

  it('15–16. Strict Mode vs nova visita ao Cardápio', () => {
    const queue = readSrc('lib/nutri/mealImageAutoQueue.ts');
    const hook = readSrc('lib/nutri/useMealImageAutoGeneration.ts');
    expect(queue).toContain('scheduleMealImageAutoAttemptedClear');
    expect(queue).toContain('cancelMealImageAutoAttemptedClear');
    expect(hook).toContain('onMealImageAutoGenerationVisitStart');
    expect(hook).toContain('onMealImageAutoGenerationVisitEnd');
    expect(hook).toContain('clearMealImageAutoAttemptedSession');
    expect(hook).toContain('prepareSlots');
    expect(readSrc('components/NutriContent.tsx')).toContain('persistirSlotsParaImagemPrato');
    expect(readSrc('components/NutriContent.tsx')).toContain('hidratarOpcoesSlotsParaImagemPrato');
  });

  it('17–18. troca de paciente não contamina estado', () => {
    expect(
      shouldApplyMealImageClientUpdate({ boundPatientId: 'A', currentPatientId: 'B' })
    ).toBe(false);
    expect(readSrc('components/NutriContent.tsx')).toContain('setGeneratingMealImages({})');
    expect(readSrc('components/NutriContent.tsx')).toContain('[paciente.id, activeTab]');
    expect(readSrc('lib/nutri/useMealImageAutoGeneration.ts')).toContain('boundPatientId');
    expect(readSrc('lib/nutri/mealImageDisplay.ts')).toContain('patientId');
  });

  it('19–20. concurrency 1 e fila sequencial (sem Promise.all dos jobs)', () => {
    expect(MEAL_IMAGE_AUTO_CONCURRENCY).toBe(1);
    const queue = readSrc('lib/nutri/mealImageAutoQueue.ts');
    expect(queue).not.toMatch(/Promise\.all\(\s*params\.jobs/);
    expect(queue).not.toMatch(/Promise\.all\(\s*jobs/);
    expect(queue).toContain('await Promise.all(workers)');
  });

  it('21–22. políticas patient/nutri/doctor e force do paciente inalterado', async () => {
    const patientForce = assertMealImageForceRegenerate({
      access: { uid: 'u1', role: 'patient', pacienteDocId: 'p1' },
      trigger: 'manual',
    });
    expect(patientForce).toMatchObject({ ok: false, code: 'FORBIDDEN_MEAL_IMAGE_REGENERATION' });

    const nutriForce = assertMealImageForceRegenerate({
      access: { uid: 'n1', role: 'nutritionist', pacienteDocId: 'p1' },
      trigger: 'manual',
    });
    expect(nutriForce.ok).toBe(true);

    const manualLinked = await assertPatientMayRequestMealImageGeneration({
      access: { uid: 'u1', role: 'patient', pacienteDocId: 'p1' },
      trigger: 'manual',
      hasActiveNutritionist: async () => true,
    });
    expect(manualLinked).toMatchObject({ ok: false, code: 'PATIENT_HAS_LINKED_NUTRITIONIST' });
  });

  it('timeout Vertex explícito ~90s; sem retry no client', () => {
    expect(MEAL_IMAGE_VERTEX_TIMEOUT_MS).toBe(90_000);
    const vertex = readSrc('lib/gcp/mealImageVertexClient.server.ts');
    expect(vertex).toContain('AbortController');
    expect(vertex).not.toMatch(/for\s*\(.*retry/i);
    expect(vertex).not.toContain('retries');
  });

  it('observabilidade server-side sem PII/prompt/URL; abort no GET da miniatura', () => {
    const logs = readSrc('lib/nutri/mealImageObservability.server.ts');
    expect(logs).toContain('meal_image_generation');
    expect(logs).toContain('meal_image_vertex_call');
    expect(logs).toContain('patientKey');
    expect(logs).not.toContain('signedUrl');
    expect(logs).not.toContain('imageUrl');
    expect(readSrc('components/nutri/MealDishImage.tsx')).toContain('AbortController');
    expect(readSrc('components/nutri/MealDishImage.tsx')).not.toContain('gtag');
    expect(readSrc('lib/nutri/useMealImageAutoGeneration.ts')).not.toContain('gtag');
    expect(readSrc('app/api/nutri/meal-image/generate/route.ts')).not.toContain(
      "console.info('[mealImage] forceRegenerate'"
    );
  });

  it('endpoint continua 1 paciente / 1 refeição / 1 slot; GCS privado', () => {
    expect(readSrc('app/api/nutri/meal-image/generate/route.ts')).toContain('isBatchMealImageGenerateBody');
    const storage = readSrc('lib/nutri/mealImageStorage.server.ts');
    expect(storage).toContain("cacheControl: 'private, max-age=31536000, immutable'");
    expect(storage).not.toContain('publicRead');
    expect(storage).not.toContain('predefinedAcl');
    expect(storage).toContain('Cleanup de versões antigas');
  });
});
