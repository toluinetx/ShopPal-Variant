// Fire-and-forget emitter to the notifications microservice.
// A downstream outage MUST NOT break the primary request.

const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_URL || '';

export type NotifyEvent = {
    type: string;
    payload: Record<string, unknown>;
};

export function emitEvent(event: NotifyEvent): void {
    if (!NOTIFICATIONS_URL) return;

    const body = JSON.stringify({
        type: event.type,
        timestamp: new Date().toISOString(),
        payload: event.payload,
    });

    // Node 18+ has global fetch. We deliberately don't await – best effort.
    fetch(`${NOTIFICATIONS_URL}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        // 3-second timeout via AbortController.
        signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    }).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn(`[notifier] emit failed for ${event.type}:`, err?.message ?? err);
    });
}
