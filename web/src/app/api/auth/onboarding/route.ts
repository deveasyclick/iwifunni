import { NextRequest, NextResponse } from "next/server";
import { proxyBackend } from "@/lib/backend-api";
import { setOnboardingCookie } from "@/lib/auth-session";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const response = await proxyBackend(req, "/auth/onboarding", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    return response;
  }

  const raw = await response.text();
  let payload: unknown = {};

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { error: raw || "Request failed" };
  }

  const nextResponse = NextResponse.json(payload, { status: response.status });
  setOnboardingCookie(nextResponse, false);
  return nextResponse;
}