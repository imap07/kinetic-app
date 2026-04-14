import { API_BASE_URL } from './config';
import { getCachedDeviceFingerprint } from '../services/deviceFingerprint';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
  /** AbortSignal for request cancellation (e.g. when switching sport tabs). */
  signal?: AbortSignal;
  /** Internal flag — do NOT set from callers. Prevents infinite retry loop. */
  _isRetry?: boolean;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public data: any,
  ) {
    const msg =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : `Request failed with status ${status}`;
    super(msg);
    this.name = 'ApiError';
  }
}

/**
 * Token provider contract — AuthContext registers its implementation so
 * the API client can auto-refresh access tokens on 401 without knowing
 * how tokens are stored.
 */
export interface TokenProvider {
  /** Returns the current valid access token, or null if the user is signed out. */
  getAccessToken(): string | null;
  /** Returns the current refresh token, or null if the user is signed out. */
  getRefreshToken(): string | null;
  /** Refreshes tokens with the server. Throws if refresh fails. */
  refreshTokens(): Promise<{ accessToken: string; refreshToken: string }>;
  /** Called when refresh fails — should clear auth state. */
  onAuthFailure(): void;
}

let tokenProvider: TokenProvider | null = null;

export function registerTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

// A shared promise deduplicates concurrent refresh attempts across many
// parallel requests that all hit 401 at the same time.
let pendingRefresh: Promise<{ accessToken: string; refreshToken: string }> | null = null;

async function refreshTokensOnce() {
  if (!tokenProvider) throw new ApiError(401, { message: 'No token provider' });
  if (pendingRefresh) return pendingRefresh;
  pendingRefresh = (async () => {
    try {
      return await tokenProvider.refreshTokens();
    } finally {
      pendingRefresh = null;
    }
  })();
  return pendingRefresh;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers = {}, token, signal, _isRetry } = options;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Device fingerprint: stable per-install UUID, used by the backend to
  // correlate sessions and flag suspicious device changes during refresh
  // token rotation. Not a secret — fine to send on every request.
  // It's set during app bootstrap; if we hit a request before bootstrap
  // has awaited getOrCreateDeviceFingerprint(), we just skip the header.
  const fingerprint = getCachedDeviceFingerprint();
  if (fingerprint) {
    reqHeaders['x-device-fingerprint'] = fingerprint;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const data = res.headers.get('content-type')?.includes('application/json')
    ? await res.json()
    : null;

  // ─── Auto-refresh on 401 ───────────────────────────────
  // If the request was authenticated with a token and the server returned
  // 401 ("Unauthorized" / token expired), try to refresh once and replay.
  //
  // IMPORTANT: skip this path for `/auth/refresh` itself. If the refresh
  // endpoint returns 401 (e.g. because the server nuked the user's stored
  // refresh token) we MUST NOT call `refreshTokensOnce()` again from
  // inside the refresh promise — doing so deadlocks: the inner call
  // awaits `pendingRefresh`, which is the very promise it's running
  // inside of. The symptom was the splash screen hanging forever for
  // users whose refresh had been invalidated server-side.
  const isRefreshCall = path === '/auth/refresh';
  if (res.status === 401 && token && !_isRetry && tokenProvider && !isRefreshCall) {
    try {
      const newTokens = await refreshTokensOnce();
      return request<T>(method, path, {
        ...options,
        token: newTokens.accessToken,
        _isRetry: true,
      });
    } catch (refreshErr) {
      // Only signal auth failure if the refresh was explicitly rejected
      // by the server (401/403). Network errors or server-down should
      // NOT clear the session — keep tokens and let the user retry.
      if (refreshErr instanceof ApiError && (refreshErr.status === 401 || refreshErr.status === 403)) {
        tokenProvider?.onAuthFailure();
      }
      throw new ApiError(res.status, data);
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>('GET', path, opts),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('POST', path, { ...opts, body }),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PUT', path, { ...opts, body }),

  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', path, { ...opts, body }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>('DELETE', path, opts),
};

export { ApiError };

/**
 * Exposed so callers that bypass `apiClient` (e.g. multipart uploads via
 * raw `fetch`) can still auto-refresh on 401.
 */
export { refreshTokensOnce };
