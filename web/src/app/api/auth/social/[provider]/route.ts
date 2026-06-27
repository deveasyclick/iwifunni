import { config } from '@/lib/config';
import { NextRequest, NextResponse } from 'next/server';

function isSupportedProvider(provider: string) {
  return provider === 'google' || provider === 'github';
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!isSupportedProvider(provider)) {
    return NextResponse.json(
      { error: 'Unsupported social provider' },
      { status: 400 },
    );
  }

  return NextResponse.redirect(`${config.apiUrl}/auth/social/${provider}`);
}
