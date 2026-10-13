/** Espera depois de um envio que deu certo, para o ritmo não ficar fixo. */
export const DISPAROS_GAP_MIN_SECONDS = 50;

export const DISPAROS_GAP_MAX_SECONDS = 70;

export const DISPAROS_GAP_MAX_MS = DISPAROS_GAP_MAX_SECONDS * 1000;

export function randomDisparoGapMs(random: () => number = Math.random): number {
  const span = DISPAROS_GAP_MAX_SECONDS - DISPAROS_GAP_MIN_SECONDS + 1;
  const seconds = DISPAROS_GAP_MIN_SECONDS + Math.floor(random() * span);
  return seconds * 1000;
}

export function disparoGapLabel(): string {
  return `${DISPAROS_GAP_MIN_SECONDS} a ${DISPAROS_GAP_MAX_SECONDS} segundos`;
}
