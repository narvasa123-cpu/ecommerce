import Link from 'next/link';
import Image from 'next/image';
import mediaManifest from '../../../../../public/images/manifest.json';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/security';
import { money } from '@/lib/pricing';
import { dateLabel } from '@/lib/admin';
import { AdminForm } from '@/components/admin-form';
import { PageHeading, Panel, Badge } from '@/components/admin/ui';
import { ProductEditor } from '@/components/admin/product-editor';
import { FulfillmentForm, PromotionEditor } from '@/components/admin/editors';
async function mediaLibrary() {
  return mediaManifest.assets
    .map((asset) => asset.path)
    .filter((f) => /^[a-zA-Z0-9_-]+\.(webp|png|jpg|svg)$/.test(f))
    .sort()
    .map((f) => '/images/' + f);
}
export default async function AdminEdit({
  params,
}: {
  params: Promise<{ section: string; id: string }>;
}) {
  await requireAdmin();
  const { section, id } = await params;
  const fresh = id === 'new';
  if (section === 'products') {
    const p = fresh
      ? null
      : await db.product.findUnique({
          where: { id },
          include: { variants: true, images: { orderBy: { position: 'asc' } } },
        });
    if (!fresh && !p) notFound();
    const [collections, assets] = await Promise.all([
      db.collection.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      mediaLibrary(),
    ]);
    return (
      <>
        <PageHeading
          title={p?.name || 'Add product'}
          description="Build the product page, manage variants, and control storefront visibility."
          back="/admin/products"
        />
        <ProductEditor
          product={
            p
              ? {
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  description: p.description,
                  material: p.material,
                  craftsmanship: p.craftsmanship,
                  dimensions: p.dimensions,
                  origin: p.origin,
                  care: p.care,
                  category: p.category,
                  price: p.price,
                  collectionId: p.collectionId,
                  active: p.active,
                  featured: p.featured,
                  seoTitle: p.seoTitle,
                  seoDescription: p.seoDescription,
                  images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
                  variants: p.variants.map((v) => ({
                    id: v.id,
                    sku: v.sku,
                    color: v.color,
                    colorHex: v.colorHex,
                    size: v.size,
                    madeToOrder: v.madeToOrder,
                  })),
                }
              : null
          }
          collections={collections}
          assets={assets}
        />
      </>
    );
  }
  if (section === 'orders') {
    const o = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        shipment: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!o) notFound();
    const a = JSON.parse(o.shippingAddress) as {
      name: string;
      line1: string;
      city: string;
      region: string;
      postalCode: string;
      country: string;
    };
    const events = await db.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return (
      <>
        <PageHeading
          title={o.number}
          description={
            'Placed ' +
            dateLabel(o.createdAt) +
            ' at ' +
            o.createdAt.toISOString().slice(11, 16) +
            ' UTC'
          }
          back="/admin/orders"
        />
        <div className="a-order-badges">
          <Badge
            value={o.payment?.status || 'PENDING'}
            label={'Payment: ' + (o.payment?.status.toLowerCase() || 'pending')}
          />
          <Badge value={o.status} />
          <span className="a-muted">
            {o.payment?.provider === 'sandbox' ? 'Sandbox payment' : 'Stripe test payment'}
          </span>
          <Link className="a-text-link" href={'/orders/' + o.accessToken}>
            View customer order page
          </Link>
        </div>
        <div className="a-editor-grid">
          <div className="a-editor-main">
            <Panel title={'Order items · ' + o.items.reduce((s, i) => s + i.quantity, 0)}>
              <div className="a-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th className="a-number">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div className="a-product-cell">
                            <Image src={i.image} alt="" width={44} height={54} />
                            <div>
                              <strong>{i.name}</strong>
                              <small>{i.variant}</small>
                              <small>{money(i.unitPrice)} each</small>
                            </div>
                          </div>
                        </td>
                        <td>{i.quantity}</td>
                        <td className="a-number">{money(i.unitPrice * i.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="a-totals">
                <div>
                  <span>Subtotal</span>
                  <span>{money(o.subtotal)}</span>
                </div>
                <div>
                  <span>Discount {o.promotionCode && '(' + o.promotionCode + ')'}</span>
                  <span>−{money(o.discount)}</span>
                </div>
                <div>
                  <span>Delivery</span>
                  <span>{money(o.shipping)}</span>
                </div>
                <div>
                  <span>Estimated tax</span>
                  <span>{money(o.tax)}</span>
                </div>
                <div>
                  <span>Total · USD</span>
                  <span>{money(o.total)}</span>
                </div>
              </div>
            </Panel>
            <Panel title="Fulfillment">
              <div className="a-panel-body">
                {o.payment?.status === 'PAID' ? (
                  <FulfillmentForm
                    id={o.id}
                    status={o.status}
                    notes={o.notes}
                    carrier={o.shipment?.carrier || ''}
                    trackingNumber={o.shipment?.trackingNumber || ''}
                  />
                ) : (
                  <p className="a-check-note">
                    Fulfillment is available once payment is confirmed. Current payment status:{' '}
                    {o.payment?.status.toLowerCase() || 'pending'}.
                  </p>
                )}
              </div>
            </Panel>
            <Panel title="Order timeline">
              <div className="a-timeline">
                {events.map((e) => (
                  <div key={e.id}>
                    <span className="a-timeline-dot" />
                    <strong>{e.action.toLowerCase().replaceAll('_', ' ')}</strong>
                    <p>{e.detail}</p>
                    <small>
                      {dateLabel(e.createdAt)} · {e.createdAt.toISOString().slice(11, 16)} UTC
                    </small>
                  </div>
                ))}
                <div>
                  <span className="a-timeline-dot" />
                  <strong>Order created</strong>
                  <p>{o.number}</p>
                  <small>{dateLabel(o.createdAt)}</small>
                </div>
              </div>
            </Panel>
          </div>
          <aside className="a-editor-side">
            <Panel title="Customer">
              <div className="a-panel-body">
                <div>
                  <strong>{o.user?.name || a.name}</strong>
                  <p className="a-muted">{o.email}</p>
                </div>
                {o.user ? (
                  <Link className="a-text-link" href={'/admin/customers/' + o.user.id}>
                    View customer
                  </Link>
                ) : (
                  <span className="a-muted">Guest checkout</span>
                )}
              </div>
            </Panel>
            <Panel title="Shipping address">
              <div className="a-panel-body">
                <address>
                  {a.name}
                  <br />
                  {a.line1}
                  <br />
                  {a.city}, {a.region} {a.postalCode}
                  <br />
                  {a.country}
                </address>
                <span className="a-muted">
                  {o.delivery === 'express' ? 'Express delivery' : 'Standard delivery'}
                </span>
              </div>
            </Panel>
            <Panel title="Payment record">
              <div className="a-panel-body">
                <div className="a-muted">
                  Provider
                  <strong style={{ display: 'block', color: 'var(--a-text)' }}>
                    {o.payment?.provider || '—'}
                  </strong>
                </div>
                <div>
                  <Badge value={o.payment?.status || 'PENDING'} />
                </div>
                <p className="a-check-note">Test-store transaction. No live charges.</p>
              </div>
            </Panel>
          </aside>
        </div>
      </>
    );
  }
  if (section === 'collections') {
    const c = fresh ? null : await db.collection.findUnique({ where: { id } });
    if (!fresh && !c) notFound();
    const assets = await mediaLibrary();
    return (
      <div className="a-simple-edit">
        <PageHeading
          title={c?.name || 'Add collection'}
          description="Group products with a name, description, and cover image."
          back="/admin/collections"
        />
        <Panel title="Collection details">
          <div className="a-panel-body">
            <AdminForm
              endpoint="collection"
              initial={c ? { id: c.id } : {}}
              redirectTo="/admin/collections"
              cancelTo="/admin/collections"
            >
              <label className="field">
                Name
                <input
                  name="name"
                  defaultValue={c?.name || ''}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
              <label className="field">
                URL slug
                <input name="slug" defaultValue={c?.slug || ''} required pattern="[a-z0-9-]+" />
              </label>
              <label className="field">
                Description
                <textarea
                  name="description"
                  defaultValue={c?.description || ''}
                  required
                  minLength={5}
                  maxLength={1000}
                />
              </label>
              <label className="field">
                Cover image
                <select name="image" defaultValue={c?.image || assets[0]}>
                  {Array.from(new Set([...assets, ...(c ? [c.image] : [])])).map((a) => (
                    <option key={a} value={a}>
                      {a.split('/').pop()}
                    </option>
                  ))}
                </select>
                <small>Images from the local media library.</small>
              </label>
            </AdminForm>
          </div>
        </Panel>
      </div>
    );
  }
  if (section === 'promotions') {
    const p = fresh ? null : await db.promotion.findUnique({ where: { id } });
    if (!fresh && !p) notFound();
    return (
      <div className="a-simple-edit">
        <PageHeading
          title={p?.code || 'Create promotion'}
          description="Set a discount, eligibility, and redemption limits."
          back="/admin/promotions"
        />
        <PromotionEditor promotion={p ? { ...p, expiresAt: p.expiresAt.toISOString() } : null} />
      </div>
    );
  }
  if (section === 'customers') {
    const u = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 20, include: { payment: true } },
        _count: { select: { orders: true } },
      },
    });
    if (!u) notFound();
    const paid = await db.order.aggregate({
      where: { userId: id, payment: { status: 'PAID' } },
      _sum: { total: true },
    });
    return (
      <>
        <PageHeading
          title={u.name}
          description={'Customer since ' + dateLabel(u.createdAt)}
          back="/admin/customers"
        />
        <div className="a-editor-grid">
          <div className="a-editor-main">
            <Panel title="Customer details">
              <div className="a-panel-body">
                <AdminForm endpoint="customer" initial={{ id: u.id }}>
                  <label className="field">
                    Display name
                    <input
                      name="name"
                      defaultValue={u.name}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </label>
                  <label className="field">
                    Email address
                    <input value={u.email} readOnly />
                    <small>Account email is read-only.</small>
                  </label>
                </AdminForm>
              </div>
            </Panel>
            <Panel
              title="Recent orders"
              aside={
                <Link
                  className="a-text-link"
                  href={'/admin/orders?q=' + encodeURIComponent(u.email)}
                >
                  View all orders
                </Link>
              }
            >
              <div className="a-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link className="a-record-link" href={'/admin/orders/' + o.id}>
                            {o.number}
                          </Link>
                        </td>
                        <td>{dateLabel(o.createdAt)}</td>
                        <td>
                          <Badge value={o.status} />
                        </td>
                        <td>{money(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!u.orders.length && <p className="a-empty">No orders yet.</p>}
              </div>
            </Panel>
          </div>
          <aside className="a-editor-side">
            <Panel title="Summary">
              <div className="a-panel-body">
                <Badge value={u.role} />
                <p>{u._count.orders} total orders</p>
                <p>{money(paid._sum.total || 0)} paid order value</p>
              </div>
            </Panel>
            <Panel title="Saved addresses">
              <div className="a-panel-body">
                {u.addresses.length ? (
                  u.addresses.map((a) => (
                    <address key={a.id}>
                      <strong>{a.name}</strong>
                      <br />
                      {a.line1}
                      <br />
                      {a.city}, {a.region} {a.postalCode}
                      <br />
                      {a.country}
                    </address>
                  ))
                ) : (
                  <p className="a-muted">No saved addresses.</p>
                )}
              </div>
            </Panel>
          </aside>
        </div>
      </>
    );
  }
  notFound();
}
