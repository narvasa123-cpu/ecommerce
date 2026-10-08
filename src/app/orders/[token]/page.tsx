import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Check, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { releaseExpired } from '@/lib/orders';
import { money } from '@/lib/pricing';
import { Totals } from '@/components/cart-page';
import { OrderControls } from '@/components/order-controls';
import { cartId, currentUser } from '@/lib/security';
import { orderStages, orderStage } from '@/lib/commerce-tools';
import { CopyReference, Reorder } from '@/components/customer-tools';
export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const accessToken = (await params).token;
  const query = {
    where: { accessToken },
    include: { items: true, payment: true, shipment: true },
  } as const;
  let order = await db.order.findUnique(query);
  if (
    order?.status === 'PENDING' &&
    order.reservationExpiresAt &&
    order.reservationExpiresAt <= new Date()
  ) {
    await releaseExpired(order.cartId);
    order = await db.order.findUnique(query);
  }
  if (!order) notFound();
  const a = JSON.parse(order.shippingAddress);
  const sandbox = order.payment?.provider === 'sandbox';
  const pending = order.status === 'PENDING';
  const cancelled = order.status === 'CANCELLED';
  const stage = orderStage(order.status);
  const user = await currentUser();
  const events = await db.auditLog.findMany({
    where: {
      entityId: order.id,
      action: { in: ['ORDER_RESERVED', 'ORDER_PAID', 'ORDER_UPDATED'] },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  const ownsCart = order.cartId === (await cartId());
  return (
    <div className="page-container">
      <div className="order-confirmation">
        <div className="confirmation-icon">
          {pending ? (
            <Clock size={35} strokeWidth={1} />
          ) : cancelled ? (
            <span className="eyebrow">RESERVATION ENDED</span>
          ) : (
            <Check size={40} strokeWidth={1} />
          )}
        </div>
        <div className="page-heading">
          <p className="eyebrow">{order.number}</p>
          <CopyReference value={order.number} />
          <h1>
            {pending
              ? 'A moment to confirm.'
              : cancelled
                ? 'A fresh beginning.'
                : 'Thoughtfully chosen.'}
          </h1>
          <p>
            {pending
              ? 'Your pieces are reserved while payment is pending. A successful return from Stripe does not confirm payment; this page updates after provider verification.'
              : cancelled
                ? 'Your reservation has been released. Return to your bag to begin again.'
                : 'Your ' +
                  (sandbox ? 'sandbox ' : '') +
                  'order is confirmed. Thank you for spending a little time with ORVEN.'}
          </p>
        </div>
        {sandbox && (
          <div className="sandbox-banner">
            <strong>Simulated order.</strong> No payment was collected. No actual product will be
            shipped. Confirmation emails are recorded in the development console.
          </div>
        )}
        {!cancelled && (
          <div className="order-status">
            {orderStages.map((s, i) => (
              <div
                className={i <= stage ? 'complete' : ''}
                key={s.status}
                aria-current={i === stage ? 'step' : undefined}
              >
                {i + 1}. {s.label}
                <p className="small">
                  {(() => {
                    const event =
                      s.status === 'PENDING'
                        ? { createdAt: order.createdAt }
                        : events.find((e) =>
                            s.status === 'PAID'
                              ? e.action === 'ORDER_PAID'
                              : e.action === 'ORDER_UPDATED' && e.detail.includes('→ ' + s.status),
                          );
                    return event
                      ? event.createdAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
                      : i <= stage
                        ? 'Date not separately recorded'
                        : 'Upcoming';
                  })()}
                </p>
              </div>
            ))}
          </div>
        )}
        {pending && ownsCart && <OrderControls token={order.accessToken} sandbox={sandbox} />}
        {user?.id === order.userId && order.payment?.status === 'PAID' && (
          <Reorder orderId={order.id} />
        )}
        <div className="summary-box" style={{ marginTop: 30 }}>
          <h2>Your considered selection.</h2>
          <div className="review-items">
            {order.items.map((i) => (
              <div className="review-item" key={i.id}>
                <Image
                  src={i.image}
                  alt={'Illustrative concept of ' + i.name}
                  width={55}
                  height={70}
                />
                <div>
                  {i.name}
                  <p className="muted">
                    {i.variant} · Qty {i.quantity}
                  </p>
                </div>
                <span>{money(i.unitPrice * i.quantity)}</span>
              </div>
            ))}
          </div>
          <Totals totals={order} />
        </div>
        <div className="fields-row" style={{ marginTop: 35 }}>
          <div>
            <h2 style={{ fontSize: 30, marginBottom: 20 }}>Destination.</h2>
            <p className="small">
              {a.name}
              <br />
              {a.line1}
              <br />
              {a.city}, {a.region} {a.postalCode}
              <br />
              {a.country}
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: 30, marginBottom: 20 }}>The journey.</h2>
            <p className="small">
              {order.delivery === 'express' ? 'Express' : 'Standard'} delivery
              <br />
              Status: {order.status}
              <br />
              {order.shipment
                ? order.shipment.carrier + ' · Tracking ' + order.shipment.trackingNumber
                : 'Tracking appears once fulfillment is recorded.'}
            </p>
            <Link className="underlink" href="/contact">
              A question about your order?
            </Link>
          </div>
        </div>
        <Link
          className="underlink"
          style={{ marginTop: 35 }}
          href={cancelled ? '/cart' : '/collections'}
        >
          {cancelled ? 'Return to your bag' : 'Continue exploring'}
        </Link>
        <p className="sample-note">
          Keep this private order link safe. Anyone with the link can view this order.
        </p>
      </div>
    </div>
  );
}
