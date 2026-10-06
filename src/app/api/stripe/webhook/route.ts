import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { stripeClient, confirmPayment, cancelOrder } from '@/lib/orders';
import { db } from '@/lib/db';
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || process.env.PAYMENT_MODE !== 'stripe')
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 503 });
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      await request.text(),
      request.headers.get('stripe-signature') || '',
      secret,
    );
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }
  try {
    if (
      [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
        'checkout.session.expired',
        'checkout.session.async_payment_failed',
      ].includes(event.type)
    ) {
      const s = event.data.object as import('stripe').Stripe.Checkout.Session;
      const order = await db.order.findUnique({
        where: { id: s.metadata?.orderId || '' },
        include: { payment: true },
      });
      if (!order || order.payment?.providerId !== s.id)
        return NextResponse.json({ error: 'Order/session mismatch.' }, { status: 400 });
      if (
        (event.type === 'checkout.session.completed' ||
          event.type === 'checkout.session.async_payment_succeeded') &&
        s.payment_status === 'paid' &&
        s.currency === 'usd' &&
        !event.livemode
      )
        await confirmPayment(order.id, s.id, s.amount_total || 0, 'stripe');
      else if (
        ['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)
      )
        await cancelOrder(order.id, 'Stripe payment failed or expired');
    }
    revalidatePath('/');
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Webhook fulfillment failed', e);
    return NextResponse.json(
      { error: 'Fulfillment failed; provider should retry.' },
      { status: 500 },
    );
  }
}
