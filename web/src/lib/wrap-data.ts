import { NextResponse } from 'next/server';

export async function wrapData(response: NextResponse) {
  if (!response.ok || response.status === 204) {
    return response;
  }

  const payload = await response.json();
  return NextResponse.json({ data: payload }, { status: response.status });
}
