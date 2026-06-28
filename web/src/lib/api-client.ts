export class ApiError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown> | null;

  constructor(
    message: string,
    status: number,
    body: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type ApiRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object;
};

const parseBody = async (
  response: Response,
): Promise<{ message: string; body: Record<string, unknown> | null }> => {
  const fallback = 'Request failed';
  const text = await response.text().catch(() => '');
  if (!text) return { message: fallback, body: null };
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    let msg = fallback;
    if (typeof parsed.error === 'string') {
      msg = parsed.error;
    } else if (typeof parsed.message === 'string') {
      msg = parsed.message;
    }
    return { message: msg, body: parsed };
  } catch {
    return { message: text.trim() || fallback, body: null };
  }
};

const buildRequestInit = (init?: ApiRequestInit): RequestInit => {
  const headers = new Headers(init?.headers);
  const method = init?.method || 'GET';
  const hasObjectBody =
    init?.body != null &&
    typeof init.body === 'object' &&
    !(init.body instanceof FormData);
  if (method === 'GET') headers.set('browserrefreshed', 'false');
  if (hasObjectBody) headers.set('Content-Type', 'application/json');
  return {
    ...init,
    headers,
    body: hasObjectBody
      ? JSON.stringify(init?.body)
      : (init?.body as BodyInit | undefined),
    cache: init?.cache ?? 'no-store',
  };
};

export async function request<T>(
  path: string,
  init?: ApiRequestInit,
): Promise<T> {
  const response = await fetch(path, buildRequestInit(init));
  if (!response.ok) {
    const { message, body } = await parseBody(response);
    throw new ApiError(message, response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
