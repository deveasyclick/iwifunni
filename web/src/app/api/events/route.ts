import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';

export async function POST(req: NextRequest) {
  const body = await req.text();

  return proxyBackend(req, '/events', {
    method: 'POST',
    body,
  });
}
