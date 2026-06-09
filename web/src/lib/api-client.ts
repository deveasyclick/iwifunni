export type ApiRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object;
};

const parseError = async (response: Response): Promise<string> => {
  const fallback = 'Request failed';
  const text = await response.text().catch(() => '');
  if (!text) return fallback;
  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return text.trim() || fallback;
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
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
