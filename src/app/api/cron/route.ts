import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { releaseExpired } from '@/lib/orders';
import { timingSafeEqual } from 'node:crypto';
export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace('Bearer ', '');
  if (
    !expected ||
    !supplied ||
    expected.length !== supplied.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const released = await releaseExpired();
  if (released) revalidatePath('/');
  return NextResponse.json({ released });
}
