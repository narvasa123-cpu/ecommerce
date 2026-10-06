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
import { cartId } from '@/lib/security';
export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  await releaseExpired();
  const order = await db.order.findUnique({
    where: { accessToken: (await params).token },
    include: { items: true, payment: true, shipment: true },
  });
  if (!order) notFound();
  const a = JSON.parse(order.shippingAddress);
  const sandbox = order.payment?.provider === 'sandbox';
  const pending = order.status === 'PENDING';
  const cancelled = order.status === 'CANCELLED';
  const stages = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const stage = stages.indexOf(order.status);
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
            {stages.map((s, i) => (
              <div className={i <= stage ? 'complete' : ''} key={s}>
                {i + 1}. {s === 'PAID' ? 'Confirmed' : s.charAt(0) + s.slice(1).toLowerCase()}
              </div>
            ))}
          </div>
        )}
        {pending && ownsCart && <OrderControls token={order.accessToken} sandbox={sandbox} />}
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
