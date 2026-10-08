import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/security';
export async function GET() {
  try {
    await requireAdmin();
    await db.$queryRaw`SELECT 1`;
    const sandbox = process.env.PAYMENT_MODE !== 'stripe';
    return NextResponse.json({ database: 'online', application: 'online', payments: sandbox ? 'sandbox' :
      process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && process.env.STRIPE_WEBHOOK_SECRET ? 'test-configured' : 'not-configured', checkedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof HttpError ? e.message : 'Service check unavailable.' },
      { status: e instanceof HttpError ? e.status : 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
