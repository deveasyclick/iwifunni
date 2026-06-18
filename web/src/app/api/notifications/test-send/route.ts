import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';

export async function POST(req: NextRequest) {
  return proxyBackend(req, '/notifications/test-send', {
    method: 'POST',
    body: await req.text(),
  });
}
