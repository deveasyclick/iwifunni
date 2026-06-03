import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';

type Params = { params: Promise<{ keyID: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { keyID } = await params;

  return proxyBackend(req, `/api-keys/${keyID}/rotate`, {
    method: 'POST',
  });
}
