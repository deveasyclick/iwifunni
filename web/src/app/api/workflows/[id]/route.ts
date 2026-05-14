import { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backend-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return proxyBackend(req, `/workflows/${id}`, {
    method: "GET",
  });
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.text();

  return proxyBackend(req, `/workflows/${id}`, {
    method: "PUT",
    body,
  });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return proxyBackend(req, `/workflows/${id}`, {
    method: "DELETE",
  });
}