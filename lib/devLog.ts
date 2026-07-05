/** Logs de diagnóstico — suprimidos em produção (NEXT_PUBLIC_VERCEL_ENV / NODE_ENV). */
const isDev =
  typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'development' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview');

export function devLog(...args: unknown[]): void {
  if (isDev) {
    console.log(...args);
  }
}

export function devDebug(...args: unknown[]): void {
  if (isDev) {
    console.debug(...args);
  }
}
