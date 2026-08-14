/**
 * Checkout funnel instrumentation.
 *
 * Deliberately dependency-free: the shop needs four events to answer "where do
 * buyers drop off", not autocapture and session replay. This posts straight to
 * PostHog's capture endpoint, so there is no extra client bundle and the CSP
 * only has to allow one host.
 *
 * No-ops when no project token is set, so local dev stays silent.
 */

// PostHog's own setup snippet calls this the project token; the shorter name
// is kept as a fallback so either spelling works.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

export type FunnelEvent =
  | 'shop_viewed'
  | 'checkout_opened'
  | 'checkout_email_entered'
  | 'payment_address_shown'
  | 'payment_confirmed'
  | 'checkout_abandoned'
  | 'waitlist_joined';

const DISTINCT_ID_KEY = 'gadscale_visitor_id';

/** Stable per-browser id so the funnel can follow one visitor across steps. */
function getDistinctId(): string {
  try {
    let id = localStorage.getItem(DISTINCT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DISTINCT_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing or blocked storage — still send, just unlinked.
    return 'anonymous';
  }
}

export function track(event: FunnelEvent, properties: Record<string, unknown> = {}): void {
  if (!KEY || typeof window === 'undefined') return;

  const payload = JSON.stringify({
    api_key: KEY,
    event,
    distinct_id: getDistinctId(),
    properties: {
      ...properties,
      $current_url: window.location.href,
      $host: window.location.host,
      $pathname: window.location.pathname,
      $referrer: document.referrer || undefined,
    },
    timestamp: new Date().toISOString(),
  });

  try {
    // keepalive so the event still leaves the page during a navigation.
    fetch(`${HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      mode: 'no-cors',
    }).catch(() => {});
  } catch {
    // Analytics must never break a purchase.
  }
}
