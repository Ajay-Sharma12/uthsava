export type AuthSession = Record<string, unknown> & {
  token: string;
  refreshToken?: string;
};

const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";
const MANUAL_LOGOUT_KEY = "uthsava_manual_logout";
export const SESSION_UPDATED_EVENT = "uthsava:session-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

function clearStorage(storage: Storage) {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
}

/** Returns a token from either a remembered or a browser-session login. */
export function getAccessToken() {
  if (!isBrowser()) return null;

  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

/** Enables automatic admin dashboard access during local development unless explicitly signed out. */
export function isDevAutoAuthEnabled() {
  if (!import.meta.env.DEV) return false;
  if (!isBrowser()) return true;

  return sessionStorage.getItem(MANUAL_LOGOUT_KEY) !== "true";
}

export function canAccessDashboard() {
  return isAuthenticated() || isDevAutoAuthEnabled();
}

export function getStoredUser() {
  if (!isBrowser()) return null;

  const serializedUser = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);

  if (!serializedUser) return null;

  try {
    return JSON.parse(serializedUser) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession, rememberMe: boolean) {
  if (!isBrowser()) return;

  clearSession();
  sessionStorage.removeItem(MANUAL_LOGOUT_KEY);

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, session.token);

  if (typeof session.refreshToken === "string") {
    storage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  }

  storage.setItem(USER_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

export function clearSession(options: { manual?: boolean } = {}) {
  if (!isBrowser()) return;

  clearStorage(localStorage);
  clearStorage(sessionStorage);

  if (options.manual) {
    sessionStorage.setItem(MANUAL_LOGOUT_KEY, "true");
  }

  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}
