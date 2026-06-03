import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-api';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.search || '';

  return proxyBackend(req, `/workflow-executions${search}`, {
    method: 'GET',
  });
}
