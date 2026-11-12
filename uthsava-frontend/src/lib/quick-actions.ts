// Tiny event bus so global Quick Actions can trigger page-level dialogs.
// Supports "pending" events: if no listener exists at emit time (because
// the destination route is still mounting), the event is held briefly and
// replayed to the next listener that subscribes within the TTL window.
type Handler = () => void;
const listeners = new Map<string, Set<Handler>>();
const pending = new Map<string, number>(); // event -> expiry timestamp
const PENDING_TTL_MS = 2000;

export const quickActions = {
  emit(event: string) {
    const set = listeners.get(event);
    if (set && set.size > 0) {
      set.forEach((fn) => fn());
    } else {
      pending.set(event, Date.now() + PENDING_TTL_MS);
    }
  },
  on(event: string, fn: Handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(fn);
    // Replay a pending emit if one is waiting and still fresh.
    const exp = pending.get(event);
    if (exp && exp > Date.now()) {
      pending.delete(event);
      // run after current render cycle
      setTimeout(fn, 0);
    } else if (exp) {
      pending.delete(event);
    }
    return () => listeners.get(event)?.delete(fn);
  },
};

export const QA = {
  ADD_CONTENT: "qa:add-content",
  ADD_PRODUCER: "qa:add-producer",
  ADD_USER: "qa:add-user",
  ADD_COUPON: "qa:add-coupon",
  ADD_PLAN: "qa:add-plan",
  ADD_CATEGORY: "qa:add-category",
  ADD_GENRE: "qa:add-genre",
  ADD_SERIES: "qa:add-series",
  SEND_NOTIFICATION: "qa:send-notification",
} as const;
