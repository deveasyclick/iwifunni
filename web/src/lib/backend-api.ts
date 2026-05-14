import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.IWIFUNNI_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:8080";

function resolveAuthHeader(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization");
  if (authorization) {
    return authorization;
  }

  const accessToken = req.cookies.get("access_token")?.value;
  if (accessToken) {
    return `Bearer ${accessToken}`;
  }

  return null;
}

function normalizePath(path: string): string {
  if (path.startsWith("/")) {
    return path;
  }
  return `/${path}`;
}

export async function proxyBackend(
  req: NextRequest,
  path: string,
  init?: RequestInit,
): Promise<NextResponse> {
  const authHeader = resolveAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing bearer token" },
      { status: 401 },
    );
  }

  const target = `${BACKEND_BASE_URL}${normalizePath(path)}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", authHeader);
  headers.set("Accept", "application/json");

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(target, {
      ...init,
      headers,
      cache: "no-store",
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const raw = await response.text();
    let payload: unknown = raw;
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { error: raw || "Request failed" };
    }

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach backend service" },
      { status: 502 },
    );
  }
}
