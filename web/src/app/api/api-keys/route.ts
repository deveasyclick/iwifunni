import { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backend-api";

export async function GET(req: NextRequest) {
  return proxyBackend(req, "/api-keys", {
    method: "GET",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  return proxyBackend(req, "/api-keys", {
    method: "POST",
    body,
  });
}
