/**
 * The desk's requests to its admin routes, signed with the admin's token as the panel signs its
 * own, in Strapi 4 and in Strapi 5 alike.
 *
 * Strapi 4 keeps a long-lived token in localStorage or sessionStorage ("jwtToken", as JSON).
 * Strapi 5 keeps a short-lived access token in localStorage (as JSON) or in a cookie, and the
 * panel renews it while the admin is active, in that same shared storage: so the token is read
 * again for every request, and a request refused once is tried again with the token read then.
 */

const STORAGE_KEY = 'jwtToken';

/** Replaced at build time by the admin's bundler, when it defines it; absent otherwise. */
declare const process: { env: Record<string, string | undefined> };

/** Strapi 5 lets an app rename its cookie; the admin build gives the name to every module. */
const cookieName = (() => {
  try {
    return process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME || STORAGE_KEY;
  } catch {
    return STORAGE_KEY;
  }
})();

const parse = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value === 'string' ? value : null;
  } catch {
    return raw;
  }
};

const readToken = (): string | null => {
  const stored = parse(window.localStorage.getItem(STORAGE_KEY)) ?? parse(window.sessionStorage.getItem(STORAGE_KEY));
  if (stored) return stored;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : null;
};

const backendUrl = () => ((window as unknown as { strapi?: { backendURL?: string } }).strapi?.backendURL ?? '').replace(/\/+$/, '');

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(method: string, path: string, body?: unknown): Promise<{ data: T }> {
  const send = (token: string | null) =>
    fetch(`${backendUrl()}${path}`, {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const token = readToken();
  let response = await send(token);
  if (response.status === 401) {
    // The panel may be renewing the session: wait for the token it writes, once.
    await wait(1500);
    const renewed = readToken();
    if (renewed && renewed !== token) response = await send(renewed);
  }
  if (response.status === 204) return { data: {} as T };
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new HttpError(response.status, data?.error?.message ?? response.statusText);
  return { data: data as T };
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown = {}) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

export const statusOf = (error: unknown): number | null => (error instanceof HttpError ? error.status : null);
