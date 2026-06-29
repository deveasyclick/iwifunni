import { NextRequest } from 'next/server';
import { proxyBackendPublic } from '@/lib/backend-api';

export async function POST(req: NextRequest) {
  return proxyBackendPublic('/auth/reset-password', {
    method: 'POST',
    body: await req.text(),
  });
}
