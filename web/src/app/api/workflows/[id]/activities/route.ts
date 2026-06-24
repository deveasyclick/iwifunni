import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const search = req.nextUrl.search || '';

  return proxyBackend(req, `/workflows/${id}/activities${search}`, {
    method: 'GET',
  });
}
