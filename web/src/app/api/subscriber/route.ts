import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';
import { wrapData } from '@/lib/wrap-data';

export async function GET(req: NextRequest) {
  const response = await proxyBackend(req, '/subscribers', {
    method: 'GET',
  });

  return wrapData(response);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const response = await proxyBackend(req, '/subscribers', {
    method: 'POST',
    body,
  });

  return wrapData(response);
}
