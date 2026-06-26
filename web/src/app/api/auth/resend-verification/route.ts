import { NextRequest } from 'next/server';
import { proxyBackendPublic } from '@/lib/backend-api';

export async function POST(req: NextRequest) {
  const body = await req.text();
  return proxyBackendPublic('/auth/resend-verification', {
    method: 'POST',
    body,
  });
}
