import { NextRequest, NextResponse } from 'next/server';
import { withSessionCookies } from '@/lib/auth-session';
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

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Refresh token is required' },
      { status: 400 },
    );
  }

  const response = await proxyBackendPublic('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    return response;
  }

  return withSessionCookies(response);
}
