import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.IWIFUNNI_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:8080";

function isSupportedProvider(provider: string) {
  return provider === "google" || provider === "github";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!isSupportedProvider(provider)) {
    return NextResponse.json({ error: "Unsupported social provider" }, { status: 400 });
  }

  return NextResponse.redirect(`${BACKEND_BASE_URL}/auth/social/${provider}`);
}