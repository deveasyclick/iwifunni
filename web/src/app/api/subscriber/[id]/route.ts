import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';
import { wrapData } from '@/lib/wrap-data';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
