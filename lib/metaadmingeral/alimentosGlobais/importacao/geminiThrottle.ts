/**
 * Throttle local entre chamadas Gemini do importador de alimentos.
 */

let lastCallAt = 0;
let chain: Promise<void> = Promise.resolve();

export function getFoodImportGeminiMinIntervalMs(): number {
  const n = Number(process.env.FOOD_IMPORT_GEMINI_MIN_INTERVAL_MS);
  if (Number.isFinite(n) && n >= 0) return n;
  return 1500; // conservador
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Serializa chamadas e garante intervalo mínimo. */
export async function throttleFoodImportGeminiCall<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const min = getFoodImportGeminiMinIntervalMs();
    const wait = Math.max(0, lastCallAt + min - Date.now());
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return fn();
  });
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** Só para testes. */
export function __resetFoodImportGeminiThrottleForTests() {
  lastCallAt = 0;
  chain = Promise.resolve();
}
