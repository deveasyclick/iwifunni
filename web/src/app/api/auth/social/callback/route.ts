import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const needsOnboarding = searchParams.get('needs_onboarding');
  const host = req.headers.get('host') ?? 'localhost:3000';
  const protocol = req.nextUrl.protocol;
  const origin = `${protocol}//${host}`;

  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(
      new URL('/auth/login?error=missing_tokens', origin),
    );
  }

  const redirectUrl = new URL(
    needsOnboarding === 'true' ? '/auth/onboarding' : '/dashboard',
    origin,
  );

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: protocol === 'https:',
    sameSite: 'lax',
    path: '/',
  });

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: protocol === 'https:',
    sameSite: 'lax',
    path: '/',
  });

  if (needsOnboarding === 'true') {
    response.cookies.set('needs_onboarding', 'true', {
      httpOnly: true,
      secure: protocol === 'https:',
      sameSite: 'lax',
      path: '/',
    });
  } else {
    response.cookies.set('needs_onboarding', '', {
      httpOnly: true,
      secure: protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  return response;
}
