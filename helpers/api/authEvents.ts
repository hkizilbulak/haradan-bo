const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

export function dispatchUnauthorizedEvent() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
}

export function subscribeToUnauthorizedEvent(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
}
