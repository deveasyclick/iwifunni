import { NextRequest } from "next/server";
import { withSessionCookies } from "@/lib/auth-session";
import { proxyBackendPublic } from "@/lib/backend-api";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const response = await proxyBackendPublic("/auth/verify-email", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    return response;
  }

  return withSessionCookies(response);
}