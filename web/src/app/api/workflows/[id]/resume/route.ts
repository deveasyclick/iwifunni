import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return proxyBackend(req, `/workflows/${id}/resume`, {
    method: 'POST',
  });
}
