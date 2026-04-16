/**
 * Log estruturado de resoluções operacionais — extensível para Firestore/DB.
 */

import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

export type OperationalResolutionLogEntry = {
  userText: string;
  matched: boolean;
  confidence: number;
  flowId?: string;
  usedFallback: boolean;
  wasValidated: boolean;
  strategy?: string;
};

function getLogPath(): string | null {
  const env = process.env.OPERATIONAL_LEARNING_LOG_PATH?.trim();
  if (!env || env.toLowerCase() === 'none') return null;
  return path.isAbsolute(env) ? env : path.join(process.cwd(), env);
}

/**
 * Registra uma resolução (console sempre; arquivo se `OPERATIONAL_LEARNING_LOG_PATH` definido ou default em disco).
 */
export async function logOperationalResolution(entry: OperationalResolutionLogEntry): Promise<void> {
  const line = JSON.stringify({
    ...entry,
    ts: new Date().toISOString(),
  });

  console.info('[operationalLearning]', line);

  const filePath = getLogPath();
  if (!filePath) return;

  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, `${line}\n`, 'utf8');
  } catch (e) {
    console.warn('[operationalLearning] falha ao gravar arquivo:', (e as Error).message);
  }
}

/**
 * Interface para futura persistência (implementar e injetar via env ou DI).
 */
export interface OperationalLearningSink {
  write(entry: OperationalResolutionLogEntry & { ts: string }): Promise<void>;
}
