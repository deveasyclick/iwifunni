import { NextResponse } from "next/server";

const sessionCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

type SessionPayload = {
  access_token?: string;
  refresh_token?: string;
  needs_onboarding?: boolean;
};

function isSessionPayload(payload: unknown): payload is SessionPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as SessionPayload;
  return (
    typeof candidate.access_token === "string" &&
    typeof candidate.refresh_token === "string"
  );
}

export function setOnboardingCookie(
  response: NextResponse,
  needsOnboarding: boolean,
) {
  if (needsOnboarding) {
    response.cookies.set("needs_onboarding", "true", sessionCookieOptions);
    return;
  }

  response.cookies.set("needs_onboarding", "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
}

export function setSessionCookies(
  response: NextResponse,
  payload: SessionPayload,
) {
  if (payload.access_token) {
    response.cookies.set("access_token", payload.access_token, sessionCookieOptions);
  }

  if (payload.refresh_token) {
    response.cookies.set(
      "refresh_token",
      payload.refresh_token,
      sessionCookieOptions,
    );
  }

  setOnboardingCookie(response, payload.needs_onboarding === true);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set("access_token", "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  response.cookies.set("refresh_token", "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  response.cookies.set("needs_onboarding", "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
}

export async function withSessionCookies(
  response: NextResponse,
): Promise<NextResponse> {
  const raw = await response.text();
  let payload: unknown = {};

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { error: raw || "Request failed" };
  }

  const nextResponse = NextResponse.json(payload, { status: response.status });
  if (isSessionPayload(payload)) {
    setSessionCookies(nextResponse, payload);
  }

  return nextResponse;
}