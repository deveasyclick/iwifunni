import { NextRequest, NextResponse } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function wrapData(response: NextResponse) {
  if (!response.ok || response.status === 204) {
    return response;
  }

  const payload = await response.json();
  return NextResponse.json({ data: payload }, { status: response.status });
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const response = await proxyBackend(req, `/subscribers/${id}`, {
    method: 'GET',
  });

  return wrapData(response);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.text();
  const response = await proxyBackend(req, `/subscribers/${id}`, {
    method: 'PUT',
    body,
  });

  return wrapData(response);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return proxyBackend(req, `/subscribers/${id}`, {
    method: 'DELETE',
  });
}
