/** A browser lock is the authority; messages only request a cooperative handoff. */
export type WorkspaceState = 'waiting' | 'active' | 'handing-over' | 'unsupported' | 'error';
export class WorkspaceLease {
  private state: WorkspaceState = 'waiting';
  private listeners = new Set<() => void>();
  private running = 0;
  private handoverTimer?: ReturnType<typeof setTimeout>;
  private release?: () => void;
  private channel?: BroadcastChannel;
  private stopped = false;
  private generation = 0;
  private started = false;
  private id = crypto.randomUUID();
  isStarted = () => this.started;
  private abort?: AbortController;
  constructor(
    private locks: LockManager | undefined,
    private channelFactory = () => new BroadcastChannel('kirana-pos-workspace-v1')
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(state: WorkspaceState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  start() {
    if (this.started && !this.stopped) return;
    this.generation += 1;
    this.started = true;
    this.stopped = false;
    if (!this.locks) {
      this.set('unsupported');
      return;
    }
    try {
      this.channel = this.channelFactory();
      this.channel.onmessage = (event: MessageEvent<unknown>) => {
        const message = event.data as { type?: unknown; requester?: unknown } | null;
        if (!message || message.type !== 'request-handoff' || typeof message.requester !== 'string')
          return;
        if (this.state === 'active') {
          this.set('handing-over');
          if (this.running === 0) this.scheduleRelease();
        } else if (this.state === 'waiting' && message.requester !== this.id) {
          // Let the requesting tab reach the front, including with 3+ tabs.
          this.abort?.abort();
          void this.acquire();
        }
      };
      void this.acquire();
    } catch {
      this.set('error');
    }
  }
  private async acquire(generation = this.generation) {
    if (this.stopped || !this.locks || generation !== this.generation) return;
    this.abort = new AbortController();
    try {
      await this.locks.request(
        'kirana-pos-workspace-v1',
        { signal: this.abort.signal },
        async () => {
          if (this.stopped || generation !== this.generation) return;
          let release!: () => void;
          const held = new Promise<void>((resolve) => {
            release = resolve;
          });
          this.release = release;
          this.set('active');
          await held;
          if (generation === this.generation) {
            this.release = undefined;
            this.set('waiting');
          }
        }
      );
      // Rejoin at the end of the queue. Closing/crashing the active tab releases
      // its browser-owned lock, so a standby recovers without heartbeat races.
      if (!this.stopped && generation === this.generation) void this.acquire(generation);
    } catch (error) {
      if (
        !this.stopped &&
        generation === this.generation &&
        !(error instanceof DOMException && error.name === 'AbortError')
      )
        this.set('error');
    }
  }
  takeOver = () => {
    if (this.state === 'waiting')
      this.channel?.postMessage({ type: 'request-handoff', requester: this.id });
  };
  /** Covers a complete request, including token refresh and its retry. */
  beginRequest(): (() => void) | null {
    if (this.state !== 'active') return null;
    this.running += 1;
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      this.running -= 1;
      if (this.state === 'handing-over' && this.running === 0) this.scheduleRelease();
    };
  }
  private scheduleRelease() {
    if (this.handoverTimer) return;
    // RTK reducers and awaiting login/checkout continuations must finish their
    // microtasks before a different tab reads shared credentials or bill state.
    this.handoverTimer = setTimeout(() => {
      this.handoverTimer = undefined;
      if (this.state === 'handing-over' && this.running === 0) this.release?.();
    }, 0);
  }
  stop() {
    this.stopped = true;
    this.generation += 1;
    this.abort?.abort();
    this.channel?.close();
    if (this.handoverTimer) clearTimeout(this.handoverTimer);
    this.handoverTimer = undefined;
    this.release?.();
    this.set('waiting');
  }
}
