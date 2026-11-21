import { generateIdempotencyKey } from './helpers';

/** Keep the same intent key after an uncertain response; coalesce rapid submits. */
export const createIdempotentAttempt = () => {
  let pending = false;
  let current: { intent: string; key: string } | null = null;
  return {
    begin<T extends object>(payload: T): (T & { idempotency_key: string }) | null {
      if (pending) return null;
      const intent = JSON.stringify(payload);
      if (!current || current.intent !== intent) {
        current = { intent, key: generateIdempotencyKey() };
      }
      pending = true;
      return { ...payload, idempotency_key: current.key };
    },
    finish(succeeded: boolean): void {
      pending = false;
      if (succeeded) current = null;
    },
  };
};
