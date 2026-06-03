import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, setSessionCookies } from '@/lib/auth-session';

type BackendResult = {
  status: number;
  payload: unknown;
};

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  needs_onboarding?: boolean;
};

const BACKEND_BASE_URL =
  process.env.IWIFUNNI_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:8080';

function resolveAuthHeader(req: NextRequest): string | null {
  const authorization = req.headers.get('authorization');
  if (authorization) {
    return authorization;
  }

  const accessToken = req.cookies.get('access_token')?.value;
  if (accessToken) {
    return `Bearer ${accessToken}`;
  }

  return null;
}

function normalizePath(path: string): string {
  if (path.startsWith('/')) {
    return path;
  }
  return `/${path}`;
}

function isSessionPayload(payload: unknown): payload is SessionPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as SessionPayload;
  return (
    typeof candidate.access_token === 'string' &&
    typeof candidate.refresh_token === 'string'
  );
}

function getErrorMessage(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const candidate = payload as { error?: unknown };
    if (typeof candidate.error === 'string') {
      return candidate.error;
    }
  }

  if (typeof payload === 'string') {
    return payload;
  }

  return '';
}

function shouldAttemptRefresh(result: BackendResult): boolean {
  if (result.status !== 401) {
    return false;
  }

  const error = getErrorMessage(result.payload).toLowerCase();
  return error.includes('bearer token');
}

function toNextResponse(result: BackendResult): NextResponse {
  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(result.payload, { status: result.status });
}

async function sendToBackend(
  path: string,
  init?: RequestInit,
  authHeader?: string | null,
): Promise<BackendResult> {
  const target = `${BACKEND_BASE_URL}${normalizePath(path)}`;
  const headers = new Headers(init?.headers);
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }
  headers.set('Accept', 'application/json');

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(target, {
      ...init,
      headers,
      cache: 'no-store',
    });

    if (response.status === 204) {
      return { status: 204, payload: null };
    }

    const raw = await response.text();
    let payload: unknown = raw;
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { error: raw || 'Request failed' };
    }

    return { status: response.status, payload };
  } catch {
    return {
      status: 502,
      payload: { error: 'Failed to reach backend service' },
    };
  }
}

async function refreshSession(req: NextRequest): Promise<{
  session: SessionPayload | null;
  clearCookies: boolean;
}> {
  const refreshToken = req.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return { session: null, clearCookies: false };
  }

  const result = await sendToBackend('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (
    result.status >= 200 &&
    result.status < 300 &&
    isSessionPayload(result.payload)
  ) {
    return { session: result.payload, clearCookies: false };
  }

  return {
    session: null,
    clearCookies: result.status === 400 || result.status === 401,
  };
}

export async function proxyBackend(
  req: NextRequest,
  path: string,
  init?: RequestInit,
): Promise<NextResponse> {
  let authHeader = resolveAuthHeader(req);
  let refreshedSession: SessionPayload | null = null;
  let shouldClearSession = false;
  let attemptedRefresh = false;

  if (!authHeader) {
    const refreshResult = await refreshSession(req);
    refreshedSession = refreshResult.session;
    shouldClearSession = refreshResult.clearCookies;
    attemptedRefresh = true;

    if (!refreshedSession) {
      const response = NextResponse.json(
        { error: 'Missing bearer token' },
        { status: 401 },
      );
      if (shouldClearSession) {
        clearSessionCookies(response);
      }
      return response;
    }

    authHeader = `Bearer ${refreshedSession.access_token}`;
  }

  let result = await sendToBackend(path, init, authHeader);
  if (!attemptedRefresh && shouldAttemptRefresh(result)) {
    const refreshResult = await refreshSession(req);
    refreshedSession = refreshResult.session;
    shouldClearSession = refreshResult.clearCookies;
    attemptedRefresh = true;

    if (refreshedSession) {
      result = await sendToBackend(
        path,
        init,
        `Bearer ${refreshedSession.access_token}`,
      );
    }
  }

  const response = toNextResponse(result);
  if (refreshedSession) {
    setSessionCookies(response, refreshedSession);
  } else if (shouldClearSession) {
    clearSessionCookies(response);
  }

  return response;
}

export async function proxyBackendPublic(
  path: string,
  init?: RequestInit,
): Promise<NextResponse> {
  return toNextResponse(await sendToBackend(path, init));
}
