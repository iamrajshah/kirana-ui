import { describe, expect, it } from 'vitest';
import { createIdempotentAttempt } from './idempotentAttempt';

describe('mutation retry intent', () => {
  it('coalesces rapid submits and retains the key after response loss', () => {
    const attempt = createIdempotentAttempt();
    const first = attempt.begin({ supplier: '4', amount: 100 });
    expect(attempt.begin({ supplier: '4', amount: 100 })).toBeNull();
    attempt.finish(false);
    const retry = attempt.begin({ supplier: '4', amount: 100 });
    expect(retry?.idempotency_key).toBe(first?.idempotency_key);
    attempt.finish(true);
    expect(attempt.begin({ supplier: '4', amount: 100 })?.idempotency_key).not.toBe(first?.idempotency_key);
  });

  it('does not reuse an old key for a newly edited intent', () => {
    const attempt = createIdempotentAttempt();
    const first = attempt.begin({ amount: 100 });
    attempt.finish(false);
    expect(attempt.begin({ amount: 50 })?.idempotency_key).not.toBe(first?.idempotency_key);
  });
});
