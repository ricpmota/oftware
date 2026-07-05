import { describe, expect, it } from 'vitest';
import { isValidFirebaseAuthUid } from './isValidAuthUid';

describe('isValidFirebaseAuthUid', () => {
  it('aceita UID típico do Firebase', () => {
    expect(isValidFirebaseAuthUid('xY7kL2mN9pQ4rS8tU1vW3zA5')).toBe(true);
  });

  it('rejeita email_timestamp', () => {
    expect(isValidFirebaseAuthUid('tadrio1988@gmail.com_1768852689049')).toBe(false);
  });

  it('rejeita email puro', () => {
    expect(isValidFirebaseAuthUid('user@example.com')).toBe(false);
  });
});
