import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';

export async function POST(req: NextRequest) {
  const body = await req.text();

  return proxyBackend(req, '/notifications/trigger', {
    method: 'POST',
    body,
  });
}
