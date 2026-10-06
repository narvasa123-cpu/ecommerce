import Link from 'next/link';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/security';
import { db } from '@/lib/db';
import { money } from '@/lib/pricing';
import { AuthForm, Logout, RemoveAddress } from '@/components/auth';
import { SimpleForm } from '@/components/forms';
import { AddressFields } from '@/components/address-fields';
export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  if (!user)
    return (
      <div className="page-container">
        <AuthForm next={(await searchParams).next} />
      </div>
    );
  const [orders, addresses] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    db.address.findMany({ where: { userId: user.id } }),
  ]);
  return (
    <div className="page-container">
      <div className="account-welcome">
        <div className="page-heading">
          <p className="eyebrow">YOUR ORVEN</p>
          <h1>Welcome back, {user.name.split(' ')[0]}.</h1>
          <p>A place for your details, and the pieces you’ve chosen.</p>
        </div>
        <Link className="button secondary" href="/collections">
          Continue browsing
        </Link>
      </div>
      <div className="account-summary" aria-label="Account summary">
        <div>
          <span className="eyebrow">ORDERS</span>
          <strong>{orders.length}</strong>
          <span className="small muted">Pieces in your history</span>
        </div>
        <div>
          <span className="eyebrow">DESTINATIONS</span>
          <strong>{addresses.length}</strong>
          <span className="small muted">Saved delivery addresses</span>
        </div>
        <div>
          <span className="eyebrow">MEMBER SINCE</span>
          <strong>
            {user.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </strong>
          <span className="small muted">Your ORVEN account</span>
        </div>
      </div>
      <div className="account-grid">
        <aside className="account-profile">
          <h2>Your details.</h2>
          <p className="small muted" style={{ marginBottom: 25 }}>
            {user.email}
          </p>
          <SimpleForm endpoint="account/profile" button="Save your details" refresh>
            <label className="field">
              Full name
              <input name="name" defaultValue={user.name} required minLength={2} maxLength={100} />
            </label>
          </SimpleForm>
          {user.role === 'ADMIN' && (
            <p style={{ marginTop: 25 }}>
              <Link className="underlink" href="/admin">
                Open the atelier dashboard
              </Link>
            </p>
          )}
          <Logout />
        </aside>
        <div>
          <h2 style={{ fontSize: 36, marginBottom: 25 }}>Your pieces, in progress.</h2>
          <div className="order-history">
            {orders.length ? (
              orders.map((o) => (
                <Link key={o.id} href={'/orders/' + o.accessToken}>
                  <div>
                    <strong>{o.number}</strong>
                    <p className="small muted">
                      {o.createdAt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="tag">{o.status}</span>
                  <span>{money(o.total)}</span>
                </Link>
              ))
            ) : (
              <div className="empty-state">
                <p>Your order history will begin with your first piece.</p>
                <Link className="underlink" href="/collections">
                  Explore the collection
                </Link>
              </div>
            )}
          </div>
          <h2 style={{ fontSize: 36, marginBottom: 25 }}>Familiar destinations.</h2>
          <div className="address-grid">
            {addresses.map((a) => (
              <div className="address-card" key={a.id}>
                <strong>{a.name}</strong>
                <p>
                  {a.line1}
                  <br />
                  {a.city}, {a.region} {a.postalCode}
                  <br />
                  {a.country}
                </p>
                <RemoveAddress id={a.id} />
              </div>
            ))}
          </div>
          <details>
            <summary className="underlink" style={{ cursor: 'pointer' }}>
              Add a delivery address
            </summary>
            <div style={{ paddingTop: 25, maxWidth: 550 }}>
              <SimpleForm endpoint="account/address" button="Save address" refresh>
                <AddressFields />
              </SimpleForm>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
