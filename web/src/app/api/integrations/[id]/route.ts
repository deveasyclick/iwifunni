import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return proxyBackend(req, `/integrations/${id}`, {
    method: 'DELETE',
  });
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return proxyBackend(req, `/integrations/${id}`, {
    method: 'PUT',
    body: await req.text(),
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return proxyBackend(req, `/integrations/${id}`, {
    method: 'PATCH',
    body: await req.text(),
  });
}
