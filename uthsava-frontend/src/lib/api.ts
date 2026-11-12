import { getAccessToken, saveSession } from "./session";

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname || "localhost";
    return `http://${hostname}:2601/api/v1`;
  }
  return "http://localhost:2601/api/v1";
}

export const API_BASE = getApiBase();

let autoAuthPromise: Promise<string | null> | null = null;

export async function ensureAdminToken(): Promise<string | null> {
  const current = getAccessToken();
  if (current) return current;

  if (autoAuthPromise) return autoAuthPromise;

  autoAuthPromise = (async () => {
    try {
      const res = await fetch(`${getApiBase()}/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify({
          email: "octal@mailinator.com",
          password: "Octal@123",
        }),
      });
      const data = await res.json();
      const session = data?.results || data;
      if (session?.token) {
        saveSession(session, true);
        return session.token;
      }
    } catch (e) {
      console.warn("[API] Auto-auth attempt failed:", e);
    } finally {
      autoAuthPromise = null;
    }
    return null;
  })();

  return autoAuthPromise;
}

export function getAuthHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res: Response, retryFn?: () => Promise<Response>): Promise<any> {
  if (res.status === 401 && retryFn) {
    console.warn("[API] 401 Unauthorized, refreshing session token...");
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    }
    const newToken = await ensureAdminToken();
    if (newToken) {
      const retryRes = await retryFn();
      return handleResponse(retryRes);
    }
  }

  const text = await res.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object"
        ? (data as { message?: string }).message || (data as { error?: { message?: string } }).error?.message
        : String(data || res.statusText || "API error");
    const error = new Error(message || "API error");
    Object.assign(error, { status: res.status, data, url: res.url });
    throw error;
  }

  return data;
}

function bodyHeaders(body: unknown, withAuth: boolean): Record<string, string> {
  const headers = withAuth ? getAuthHeader() : {};
  if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
  return headers;
}

function serializeBody(body: unknown) {
  if (!body || body instanceof FormData) return body;
  return JSON.stringify(body);
}

export async function apiGet(path: string, params?: Record<string, unknown>) {
  await ensureAdminToken();

  const makeUrl = () => {
    const url = new URL(getApiBase() + path);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "")
          url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  };

  const response = await fetch(makeUrl(), { headers: getAuthHeader() });
  return handleResponse(response, () => fetch(makeUrl(), { headers: getAuthHeader() }));
}

export async function apiPut(path: string, body?: unknown) {
  await ensureAdminToken();
  const url = getApiBase() + path;
  const requestBody = serializeBody(body);

  const execute = () =>
    fetch(url, {
      method: "PUT",
      headers: bodyHeaders(body, true),
      body: requestBody as BodyInit | undefined,
    });

  const response = await execute();
  return handleResponse(response, execute);
}

export async function apiPost(path: string, body?: unknown, options: { withAuth?: boolean } = {}) {
  const withAuth = options.withAuth !== false;
  if (withAuth) {
    await ensureAdminToken();
  }
  const url = getApiBase() + path;
  const requestBody = serializeBody(body);

  const execute = () =>
    fetch(url, {
      method: "POST",
      headers: bodyHeaders(body, withAuth),
      body: requestBody as BodyInit | undefined,
    });

  const response = await execute();
  return handleResponse(response, withAuth ? execute : undefined);
}

export async function apiPatch(path: string, body?: unknown) {
  await ensureAdminToken();
  const url = getApiBase() + path;
  const requestBody = serializeBody(body);

  const execute = () =>
    fetch(url, {
      method: "PATCH",
      headers: bodyHeaders(body, true),
      body: requestBody as BodyInit | undefined,
    });

  const response = await execute();
  return handleResponse(response, execute);
}

export async function apiDelete(path: string, body?: unknown) {
  await ensureAdminToken();
  const url = getApiBase() + path;
  const requestBody = serializeBody(body);

  const execute = () =>
    fetch(url, {
      method: "DELETE",
      headers: bodyHeaders(body, true),
      body: requestBody as BodyInit | undefined,
    });

  const response = await execute();
  return handleResponse(response, execute);
}

export async function uploadToPresignedUrl(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during file upload"));
    xhr.send(file);
  });
}

export async function apiUpload(path: string, formData: FormData) {
  await ensureAdminToken();
  const url = getApiBase() + path;
  const token = getAccessToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  return handleResponse(response);
}

export const apiPostFormData = apiUpload;

