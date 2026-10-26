// frontend/src/lib/api-client.ts
// Centralized, typed API client with automatic token rotation, credentials support, and error normalization.

import { ApiError } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

// In-memory token storage (never in localStorage to prevent XSS exfiltration)
let memoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

export class CustomApiError extends Error {
  code: string;
  statusCode: number;
  errors?: { field: string; message: string }[];
  requestId?: string;

  constructor(message: string, statusCode: number, code = 'API_ERROR', errors?: { field: string; message: string }[], requestId?: string) {
    super(message);
    this.name = 'CustomApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.requestId = requestId;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  skipAuth?: boolean;
  _retry?: boolean;
}

async function requestRefreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      setAccessToken(null);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
      return null;
    }

    const json = await res.json();
    const newToken = json?.data?.accessToken;
    if (newToken) {
      setAccessToken(newToken);
      return newToken;
    }
    return null;
  } catch {
    setAccessToken(null);
    return null;
  } finally {
    refreshPromise = null;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    params,
    timeoutMs = 30000,
    skipAuth = false,
    _retry = false,
    headers: customHeaders = {},
    ...customConfig
  } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (!skipAuth && memoryAccessToken) {
    headers['Authorization'] = `Bearer ${memoryAccessToken}`;
  }

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    requestBody = body; // Let browser set multipart boundary
  } else if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers,
      body: requestBody,
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized by attempting a token refresh
    if (response.status === 401 && !skipAuth && !_retry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!refreshPromise) {
        refreshPromise = requestRefreshToken();
      }
      const newToken = await refreshPromise;

      if (newToken) {
        return apiClient<T>(endpoint, {
          ...options,
          _retry: true,
        });
      }
    }

    // Check for CSV / Blob downloads
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
      return (await response.blob()) as unknown as T;
    }

    // Parse JSON
    let data: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const errPayload = data as ApiError;
      throw new CustomApiError(
        errPayload?.message || response.statusText || 'Request failed',
        response.status,
        errPayload?.code || 'UNKNOWN_ERROR',
        errPayload?.errors,
        errPayload?.requestId,
      );
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof CustomApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new CustomApiError('Request timed out — please try again', 408, 'REQUEST_TIMEOUT');
    }
    throw new CustomApiError(
      err instanceof Error ? err.message : 'Network connection failed',
      0,
      'NETWORK_ERROR',
    );
  }
}

apiClient.get = <T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
  apiClient<T>(endpoint, { ...options, method: 'GET' });

apiClient.post = <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  apiClient<T>(endpoint, { ...options, method: 'POST', body });

apiClient.put = <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  apiClient<T>(endpoint, { ...options, method: 'PUT', body });

apiClient.patch = <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  apiClient<T>(endpoint, { ...options, method: 'PATCH', body });

apiClient.delete = <T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
  apiClient<T>(endpoint, { ...options, method: 'DELETE' });

apiClient.downloadBlob = async (endpoint: string, options?: RequestOptions): Promise<Blob> => {
  return apiClient<Blob>(endpoint, options);
};

