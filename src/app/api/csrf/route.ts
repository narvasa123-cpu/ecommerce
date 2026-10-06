import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { token, cookieOptions } from '@/lib/security';
export async function GET() {
  const jar = await cookies();
  const value = jar.get('orven_csrf')?.value || token();
  jar.set('orven_csrf', value, { ...cookieOptions, maxAge: 86400 });
  return NextResponse.json({ token: value }, { headers: { 'Cache-Control': 'no-store' } });
}
