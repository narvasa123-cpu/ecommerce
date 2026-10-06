import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/security';
import { money } from '@/lib/pricing';
import {
  adminQuery,
  pagination,
  productWhere,
  orderWhere,
  inventoryWhere,
  dateLabel,
  type AdminParams,
  type AdminQuery,
} from '@/lib/admin';
import { Badge, Empty, Filters, PageHeading, Pagination, Panel } from '@/components/admin/ui';
import { InventoryAdjust } from '@/components/admin/inventory-adjust';
function Records({
  section,
  query,
  total,
  headers,
  children,
  states = [],
  sorts = [],
  exportable = false,
}: {
  section: string;
  query: AdminQuery;
  total: number;
  headers: string[];
  children: React.ReactNode;
  states?: [string, string][];
  sorts?: [string, string][];
  exportable?: boolean;
}) {
  const paging = pagination(total, query.page);
  return (
    <Panel>
      <Filters
        section={section}
        query={query}
        states={states}
        sorts={sorts}
        exportable={exportable}
      />
      {total ? (
        <div className="a-table-wrap" tabIndex={0} role="region" aria-label={section + ' records'}>
          <table>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      ) : (
        <Empty section={section} />
      )}
      <Pagination section={section} query={query} total={total} {...paging} />
    </Panel>
  );
}
export default async function AdminSection({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<AdminParams>;
}) {
  await requireAdmin();
  const { section } = await params;
  const query = adminQuery(await searchParams);
  if (section === 'products') {
    const where = productWhere(query);
    const total = await db.product.count({ where });
    const { skip, take } = pagination(total, query.page);
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price-asc'
        ? { price: 'asc' }
        : query.sort === 'price-desc'
          ? { price: 'desc' }
          : query.sort === 'newest'
            ? { createdAt: 'desc' }
            : { name: 'asc' };
    const rows = await db.product.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        collection: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { include: { inventory: true } },
      },
    });
    return (
      <>
        <PageHeading
          title="Products"
          description="Manage your catalogue, pricing, visibility, and product details."
          action={{ href: '/admin/products/new', label: 'Add product' }}
        />
        <Records
          section={section}
          query={query}
          total={total}
          headers={['Product', 'Status', 'Inventory', 'Collection', 'Price', 'Action']}
          states={[
            ['active', 'Published'],
            ['archived', 'Archived'],
          ]}
          sorts={[
            ['', 'Name A–Z'],
            ['newest', 'Newest first'],
            ['price-asc', 'Price: low to high'],
            ['price-desc', 'Price: high to low'],
          ]}
          exportable
        >
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <Link className="a-product-cell" href={'/admin/products/' + p.id}>
                  {p.images[0] && <Image src={p.images[0].url} alt="" width={44} height={54} />}
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.category} · {p.variants.length} variants
                    </small>
                  </div>
                </Link>
              </td>
              <td>
                <Badge
                  value={p.active ? 'ACTIVE' : 'ARCHIVED'}
                  label={p.active ? 'Published' : 'Archived'}
                />
              </td>
              <td>
                {p.variants.reduce((s, v) => s + (v.inventory?.quantity || 0), 0)} available
                <small>Across all variants</small>
              </td>
              <td>{p.collection.name}</td>
              <td className="a-nowrap">{money(p.price)}</td>
              <td>
                <Link className="a-btn small" href={'/admin/products/' + p.id}>
                  Edit<span className="sr-only"> {p.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </Records>
      </>
    );
  }
  if (section === 'orders') {
    const where = orderWhere(query);
    const total = await db.order.count({ where });
    const { skip, take } = pagination(total, query.page);
    const rows = await db.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
      include: { payment: true, items: { select: { quantity: true } } },
    });
    return (
      <>
        <PageHeading
          title="Orders"
          description="Track payments, prepare shipments, and keep every order moving."
        />
        <Records
          section={section}
          query={query}
          total={total}
          headers={['Order', 'Date', 'Customer', 'Payment', 'Fulfillment', 'Total']}
          states={[
            ['unfulfilled', 'Needs fulfillment'],
            ['PENDING', 'Pending payment'],
            ['PAID', 'Paid'],
            ['PROCESSING', 'Processing'],
            ['SHIPPED', 'Shipped'],
            ['DELIVERED', 'Delivered'],
            ['CANCELLED', 'Cancelled'],
            ['FAILED', 'Failed'],
          ]}
          sorts={[
            ['', 'Newest first'],
            ['oldest', 'Oldest first'],
          ]}
          exportable
        >
          {rows.map((o) => (
            <tr key={o.id}>
              <td>
                <Link className="a-record-link" href={'/admin/orders/' + o.id}>
                  {o.number}
                </Link>
                <small>{o.items.reduce((s, i) => s + i.quantity, 0)} items</small>
              </td>
              <td className="a-nowrap">{dateLabel(o.createdAt)}</td>
              <td>
                {o.email}
                <small>
                  {o.payment?.provider === 'sandbox' ? 'Sandbox order' : 'Stripe test order'}
                </small>
              </td>
              <td>
                <Badge value={o.payment?.status || 'PENDING'} />
              </td>
              <td>
                <Badge value={o.status} label={o.status === 'PAID' ? 'Unfulfilled' : undefined} />
              </td>
              <td className="a-nowrap">{money(o.total)}</td>
            </tr>
          ))}
        </Records>
      </>
    );
  }
  if (section === 'inventory') {
    const where = inventoryWhere(query);
    const total = await db.variant.count({ where });
    const { skip, take } = pagination(total, query.page);
    const rows = await db.variant.findMany({
      where,
      skip,
      take,
      orderBy: { sku: 'asc' },
      include: {
        product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } },
        inventory: true,
      },
    });
    return (
      <>
        <PageHeading
          title="Inventory"
          description="Available units exclude checkout reservations. Every adjustment is recorded."
        />
        <Records
          section={section}
          query={query}
          total={total}
          headers={['Product / variant', 'SKU', 'Availability', 'Available', 'Action']}
          states={[
            ['low', 'Low stock (0–3)'],
            ['out', 'Out of stock'],
            ['available', 'In stock (4+)'],
          ]}
          exportable
        >
          {rows.map((v) => {
            const quantity = v.inventory?.quantity || 0;
            return (
              <tr key={v.id}>
                <td>
                  <Link className="a-product-cell" href={'/admin/products/' + v.productId}>
                    {v.product.images[0] && (
                      <Image src={v.product.images[0].url} alt="" width={40} height={50} />
                    )}
                    <div>
                      <strong>{v.product.name}</strong>
                      <small>
                        {v.color} / {v.size}
                        {!v.product.active ? ' · Archived' : ''}
                      </small>
                    </div>
                  </Link>
                </td>
                <td className="a-sku">{v.sku}</td>
                <td>
                  <Badge
                    value={quantity === 0 ? 'OUT' : quantity <= 3 ? 'LOW' : 'AVAILABLE'}
                    label={
                      quantity === 0 ? 'Out of stock' : quantity <= 3 ? 'Low stock' : 'In stock'
                    }
                  />
                  {v.madeToOrder && <small>Made to order</small>}
                </td>
                <td>
                  <strong>{quantity}</strong>
                </td>
                <td>
                  <InventoryAdjust
                    id={v.id}
                    name={v.product.name}
                    sku={v.sku}
                    quantity={quantity}
                  />
                </td>
              </tr>
            );
          })}
        </Records>
      </>
    );
  }
  if (section === 'customers') {
    const where: Prisma.UserWhereInput = {
      ...(query.q
        ? { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }] }
        : {}),
      ...(['CUSTOMER', 'ADMIN'].includes(query.state) ? { role: query.state } : {}),
    };
    const [total, subscribers] = await Promise.all([
      db.user.count({ where }),
      db.newsletter.count(),
    ]);
    const { skip, take } = pagination(total, query.page);
    const rows = await db.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        orders: { where: { payment: { status: 'PAID' } }, select: { total: true } },
        _count: { select: { orders: true } },
      },
    });
    return (
      <>
        <PageHeading
          title="Customers"
          description={
            'Customer accounts, order history, and saved destinations. ' +
            subscribers +
            ' newsletter subscribers.'
          }
        />
        <Records
          section={section}
          query={query}
          total={total}
          headers={['Customer', 'Role', 'Orders', 'Paid order value', 'Joined']}
          states={[
            ['CUSTOMER', 'Customer'],
            ['ADMIN', 'Administrator'],
          ]}
        >
          {rows.map((u) => (
            <tr key={u.id}>
              <td>
                <Link className="a-product-cell" href={'/admin/customers/' + u.id}>
                  <span className="a-avatar">{u.name.slice(0, 1)}</span>
                  <div>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </div>
                </Link>
              </td>
              <td>
                <Badge value={u.role} />
              </td>
              <td>{u._count.orders}</td>
              <td>{money(u.orders.reduce((s, o) => s + o.total, 0))}</td>
              <td>{dateLabel(u.createdAt)}</td>
            </tr>
          ))}
        </Records>
      </>
    );
  }
  if (section === 'collections') {
    const where = query.q
      ? { OR: [{ name: { contains: query.q } }, { slug: { contains: query.q } }] }
      : {};
    const total = await db.collection.count({ where });
    const { skip, take } = pagination(total, query.page);
    const rows = await db.collection.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return (
      <>
        <PageHeading
          title="Collections"
          description="Organize products into considered collections for your storefront."
          action={{ href: '/admin/collections/new', label: 'Add collection' }}
        />
        <Records
          section={section}
          query={query}
          total={total}
          headers={['Collection', 'Description', 'Products', 'Action']}
        >
          {rows.map((c) => (
            <tr key={c.id}>
              <td>
                <Link className="a-product-cell" href={'/admin/collections/' + c.id}>
                  <Image src={c.image} alt="" width={44} height={54} />
                  <div>
                    <strong>{c.name}</strong>
                    <small>/{c.slug}</small>
                  </div>
                </Link>
              </td>
              <td className="a-description-cell">{c.description}</td>
              <td>{c._count.products}</td>
              <td>
                <Link className="a-btn small" href={'/admin/collections/' + c.id}>
                  Edit<span className="sr-only"> {c.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </Records>
      </>
    );
  }
  if (section === 'promotions') {
    const now = new Date();
    const where: Prisma.PromotionWhereInput = {
      ...(query.q ? { code: { contains: query.q } } : {}),
      ...(query.state === 'active'
        ? { active: true, expiresAt: { gt: now } }
        : query.state === 'inactive'
          ? { active: false }
          : query.state === 'expired'
            ? { expiresAt: { lte: now } }
            : {}),
    };
    const total = await db.promotion.count({ where });
    const { skip, take } = pagination(total, query.page);
    const rows = await db.promotion.findMany({ where, skip, take, orderBy: { code: 'asc' } });
    return (
      <>
        <PageHeading
          title="Promotions"
          description="Create discounts, set minimums, and monitor redemption limits."
          action={{ href: '/admin/promotions/new', label: 'Create promotion' }}
        />
        <Records
          section={section}
          query={query}
          total={total}
          headers={['Code', 'Status', 'Discount', 'Minimum spend', 'Usage', 'Expires (UTC)']}
          states={[
            ['active', 'Enabled and unexpired'],
            ['inactive', 'Disabled'],
            ['expired', 'Expired'],
          ]}
        >
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <Link className="a-record-link a-sku" href={'/admin/promotions/' + p.id}>
                  {p.code}
                </Link>
              </td>
              <td>
                <Badge
                  value={
                    !p.active
                      ? 'INACTIVE'
                      : p.expiresAt <= now
                        ? 'EXPIRED'
                        : p.uses >= p.usageLimit
                          ? 'EXHAUSTED'
                          : 'ACTIVE'
                  }
                />
              </td>
              <td>{p.kind === 'PERCENT' ? p.value + '%' : money(p.value)} off</td>
              <td>{money(p.minimum)}</td>
              <td>
                {p.uses} / {p.usageLimit}
                <small>Includes reservations</small>
              </td>
              <td>{dateLabel(p.expiresAt)}</td>
            </tr>
          ))}
        </Records>
      </>
    );
  }
  if (section === 'inbox') {
    const where = query.q
      ? {
          OR: [
            { name: { contains: query.q } },
            { email: { contains: query.q } },
            { message: { contains: query.q } },
          ],
        }
      : {};
    const total = await db.supportMessage.count({ where });
    const { skip, take } = pagination(total, query.page);
    const rows = await db.supportMessage.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    return (
      <>
        <PageHeading
          title="Inbox"
          description="Messages submitted through your store’s contact form."
        />
        <Records
          section={section}
          query={query}
          total={total}
          headers={['From', 'Message', 'Received']}
        >
          {rows.map((n) => (
            <tr key={n.id}>
              <td>
                <strong>{n.name}</strong>
                <small>{n.email}</small>
              </td>
              <td className="a-message">{n.message}</td>
              <td className="a-nowrap">{dateLabel(n.createdAt)}</td>
            </tr>
          ))}
        </Records>
      </>
    );
  }
  if (section === 'audit') {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.q
        ? {
            OR: [
              { action: { contains: query.q } },
              { detail: { contains: query.q } },
              { actorId: { contains: query.q } },
            ],
          }
        : {}),
      ...(query.state ? { action: query.state } : {}),
    };
    const total = await db.auditLog.count({ where });
    const { skip, take } = pagination(total, query.page);
    const rows = await db.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
    const actors = await db.user.findMany({
      where: { id: { in: rows.map((r) => r.actorId) } },
      select: { id: true, name: true },
    });
    return (
      <>
        <PageHeading
          title="Activity log"
          description="An audit trail of stock, catalogue, customer, and order changes. Times are UTC."
        />
        <Records
          section={section}
          query={query}
          total={total}
          headers={['Time', 'Actor', 'Action', 'Details']}
          states={[
            ['INVENTORY_ADJUSTED', 'Inventory adjustments'],
            ['ORDER_UPDATED', 'Order updates'],
            ['PRODUCT_SAVED', 'Product changes'],
            ['CUSTOMER_UPDATED', 'Customer changes'],
          ]}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="a-nowrap">
                {dateLabel(r.createdAt)}
                <small>{r.createdAt.toISOString().slice(11, 19)} UTC</small>
              </td>
              <td>{actors.find((a) => a.id === r.actorId)?.name || r.actorId}</td>
              <td>
                <Badge value={r.action} />
              </td>
              <td className="a-message">{r.detail}</td>
            </tr>
          ))}
        </Records>
      </>
    );
  }
  notFound();
}
