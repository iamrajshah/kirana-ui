# One active browser POS workspace

The same-origin POS uses one exclusive Web Lock per browser storage profile. A second tab waits and offers **Take over here**. BroadcastChannel requests handoff; it never grants ownership. No heartbeat/localStorage lease, Redis or additional server is used.

A handoff stops new requests, drains existing requests including authentication retries, and lets Redux/promise continuations commit before releasing the lock. Paused React trees remain mounted so their unsaved local state survives. Reclaim refreshes shared credentials only for the same user/shop; a changed identity requires a reload. Pagehide releases ownership, pageshow rejoins, and closing/crashing the active context releases its browser-owned lock. Unsupported coordination fails closed with a browser-update message.

Native iOS/Android render App directly and do not acquire browser locks. Customer and Platform Admin apps are separate origins and are unaffected. Distinct browser profiles/devices continue to use backend device, session, authorization and idempotency controls. This is a POS workflow guard, not protection against credential sharing or a substitute for server idempotency.

Unsaved state remains in its original open tab. Hold/save a bill before closing that tab. A tab close, crash or network loss can leave a request outcome unknown; existing server idempotency and invoice recovery remain authoritative.

## Verification

- Full existing suite: 635 passed before the final focused lifecycle refinements.
- Final coordinator/component/native-exemption checks: 15 passed.
- TypeScript, lint and production bundle checks pass without raising budgets; notice UI and its four languages load separately.
- Real browser: three same-profile tabs, inactive-tab blocking, requested takeover, reclaim with retained typed input, and active-tab close recovery.
- Remaining release qualification: authenticated bill draft and actual in-flight financial handoff in a real browser; Safari-specific close/BFCache behavior. Unit checks cover the coordinator's in-flight drain and page lifecycle handlers.
