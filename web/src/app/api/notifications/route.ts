import { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backend-api";

export async function GET(req: NextRequest) {
  return proxyBackend(req, "/notifications", {
    method: "GET",
  });
}