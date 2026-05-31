import { NextRequest, NextResponse } from "next/server";
import { proxyBackend } from "@/lib/backend-api";

async function wrapData(response: NextResponse) {
  if (!response.ok || response.status === 204) {
    return response;
  }

  const payload = await response.json();
  return NextResponse.json({ data: payload }, { status: response.status });
}

export async function GET(req: NextRequest) {
  const response = await proxyBackend(req, "/subscribers", {
    method: "GET",
  });

  return wrapData(response);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const response = await proxyBackend(req, "/subscribers", {
    method: "POST",
    body,
  });

  return wrapData(response);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json(
      { error: "Subscriber id is required" },
      { status: 400 },
    );
  }

  return proxyBackend(req, `/subscribers/${id}`, {
    method: "DELETE",
  });
}