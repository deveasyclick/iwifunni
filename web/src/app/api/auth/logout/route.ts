import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/auth-session';
import { proxyBackendPublic } from '@/lib/backend-api';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const refreshToken =
    typeof body?.refresh_token === 'string'
      ? body.refresh_token
      : req.cookies.get('refresh_token')?.value;

  if (refreshToken) {
    await proxyBackendPublic('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
}
