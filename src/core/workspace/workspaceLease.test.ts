import { describe, expect, it } from 'vitest';
import { WorkspaceLease } from './workspaceLease';

const tick = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};
const fixture = () => {
  let held = false;
  const queue: {
    signal: AbortSignal;
    callback: () => Promise<void>;
    resolve: () => void;
    reject: (error: unknown) => void;
  }[] = [];
  const pump = () => {
    if (held) return;
    const request = queue.shift();
    if (!request) return;
    held = true;
    void request.callback().then(() => {
      held = false;
      request.resolve();
      pump();
    });
  };
  const locks = {
    request: (_name: string, options: { signal: AbortSignal }, callback: () => Promise<void>) =>
      new Promise<void>((resolve, reject) => {
        const request = { signal: options.signal, callback, resolve, reject };
        options.signal.addEventListener('abort', () => {
          const index = queue.indexOf(request);
          if (index >= 0) {
            queue.splice(index, 1);
            reject(new DOMException('Aborted', 'AbortError'));
          }
        });
        queue.push(request);
        pump();
      }),
  } as unknown as LockManager;
  const channels: {
    onmessage: ((event: MessageEvent) => void) | null;
    postMessage: (data: unknown) => void;
    close: () => void;
  }[] = [];
  const channel = () => {
    const value = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage(data: unknown) {
        channels.filter((c) => c !== value).forEach((c) => c.onmessage?.({ data } as MessageEvent));
      },
      close() {
        channels.splice(channels.indexOf(value), 1);
      },
    };
    channels.push(value);
    return value as unknown as BroadcastChannel;
  };
  return { lease: () => new WorkspaceLease(locks, channel) };
};
describe('browser POS workspace ownership', () => {
  it('allows only one active tab and recovers when it closes', async () => {
    const f = fixture();
    const a = f.lease();
    const b = f.lease();
    a.start();
    b.start();
    await tick();
    expect(a.snapshot()).toBe('active');
    expect(b.snapshot()).toBe('waiting');
    expect(b.beginRequest()).toBeNull();
    a.stop();
    await tick();
    expect(b.snapshot()).toBe('active');
    b.stop();
  });
  it('stops new requests at takeover and waits for all current requests to settle', async () => {
    const f = fixture();
    const a = f.lease();
    const b = f.lease();
    a.start();
    b.start();
    await tick();
    const finishPayment = a.beginRequest()!;
    const finishRead = a.beginRequest()!;
    b.takeOver();
    expect(a.snapshot()).toBe('handing-over');
    expect(a.beginRequest()).toBeNull();
    finishPayment();
    finishPayment();
    await tick();
    expect(b.snapshot()).toBe('waiting');
    finishRead();
    await tick();
    expect(b.snapshot()).toBe('active');
    expect(a.snapshot()).toBe('waiting');
    a.stop();
    b.stop();
  });
  it('can take back a preserved workspace without two simultaneous owners', async () => {
    const f = fixture();
    const a = f.lease();
    const b = f.lease();
    a.start();
    b.start();
    await tick();
    b.takeOver();
    await tick();
    expect(b.snapshot()).toBe('active');
    a.takeOver();
    await tick();
    expect(a.snapshot()).toBe('active');
    expect(b.snapshot()).toBe('waiting');
    a.stop();
    b.stop();
  });
  it('gives takeover to the requesting tab when several standbys are open', async () => {
    const f = fixture();
    const a = f.lease();
    const b = f.lease();
    const c = f.lease();
    a.start();
    b.start();
    c.start();
    await tick();
    c.takeOver();
    await tick();
    expect(c.snapshot()).toBe('active');
    expect(a.snapshot()).toBe('waiting');
    expect(b.snapshot()).toBe('waiting');
    a.stop();
    b.stop();
    c.stop();
  });
  it('does not leave duplicate queued locks after effect cleanup and restart', async () => {
    const f = fixture();
    const a = f.lease();
    const b = f.lease();
    a.start();
    a.stop();
    a.start();
    b.start();
    await tick();
    expect(a.snapshot()).toBe('active');
    b.takeOver();
    await tick();
    expect(b.snapshot()).toBe('active');
    expect(a.snapshot()).toBe('waiting');
    a.stop();
    b.stop();
  });
  it('allows promise continuations to commit shared session state before handoff', async () => {
    const f = fixture();
    const a = f.lease();
    const b = f.lease();
    a.start();
    b.start();
    await tick();
    const finish = a.beginRequest()!;
    b.takeOver();
    finish();
    await Promise.resolve();
    expect(b.snapshot()).toBe('waiting');
    await tick();
    expect(b.snapshot()).toBe('active');
    a.stop();
    b.stop();
  });
  it('fails closed when browser locking or messaging is unavailable', () => {
    const a = new WorkspaceLease(undefined);
    a.start();
    expect(a.snapshot()).toBe('unsupported');
    expect(a.beginRequest()).toBeNull();
    a.stop();
    const b = new WorkspaceLease({} as LockManager, () => {
      throw new Error('Blocked');
    });
    b.start();
    expect(b.snapshot()).toBe('error');
    expect(b.beginRequest()).toBeNull();
    b.stop();
  });
});
