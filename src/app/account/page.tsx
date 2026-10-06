import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  UserRound,
  CircleHelp,
} from 'lucide-react';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/security';
import { db } from '@/lib/db';
import { money } from '@/lib/pricing';
import { AuthForm, Logout, RemoveAddress } from '@/components/auth';
import { SimpleForm } from '@/components/forms';
import { AddressFields } from '@/components/address-fields';
import './account.css';
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
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: { take: 3 } },
    }),
    db.address.findMany({ where: { userId: user.id } }),
  ]);
  return (
    <div className="page-container customer-account">
      <nav className="account-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">My account</span>
      </nav>
      <div className="account-welcome">
        <div className="page-heading">
          <p className="eyebrow">
            <span /> YOUR PERSONAL ATELIER
          </p>
          <h1>Welcome back, {user.name.split(' ')[0]}.</h1>
          <p>Your pieces, your details, your next everyday companion. All in one place.</p>
        </div>
        <Link className="account-browse" href="/collections">
          Explore the collection <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </div>
      <div className="account-summary" aria-label="Account summary">
        <div>
          <span className="account-stat-icon">
            <Package size={20} aria-hidden="true" />
          </span>
          <span className="eyebrow">ORDERS</span>
          <strong>{orders.length}</strong>
          <span className="small muted">Orders in your history</span>
        </div>
        <div>
          <span className="account-stat-icon">
            <MapPin size={20} aria-hidden="true" />
          </span>
          <span className="eyebrow">DESTINATIONS</span>
          <strong>{addresses.length}</strong>
          <span className="small muted">Saved delivery addresses</span>
        </div>
        <div>
          <span className="account-stat-icon">
            <CalendarDays size={20} aria-hidden="true" />
          </span>
          <span className="eyebrow">MEMBER SINCE</span>
          <strong>
            {user.createdAt.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </strong>
          <span className="small muted">Your ORVEN account</span>
        </div>
      </div>
      <div className="account-grid">
        <aside className="account-sidebar">
          <nav className="account-shortcuts" aria-label="Account sections">
            <a href="#my-orders">
              <Package size={18} aria-hidden="true" />
              My orders
              <ChevronRight size={16} aria-hidden="true" />
            </a>
            <a href="#my-addresses">
              <MapPin size={18} aria-hidden="true" />
              Saved addresses
              <ChevronRight size={16} aria-hidden="true" />
            </a>
            <a href="#my-details">
              <UserRound size={18} aria-hidden="true" />
              Personal details
              <ChevronRight size={16} aria-hidden="true" />
            </a>
          </nav>
          <section className="account-profile" id="my-details" aria-labelledby="details-heading">
            <div className="account-identity">
              <span className="account-avatar" aria-hidden="true">
                {user.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <div>
                <p className="eyebrow">YOUR PROFILE</p>
                <strong>{user.name}</strong>
              </div>
            </div>
            <h2 id="details-heading">Personal details</h2>
            <p className="account-email">{user.email}</p>
            <SimpleForm endpoint="account/profile" button="Save your details" refresh>
              <label className="field">
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  defaultValue={user.name}
                  required
                  minLength={2}
                  maxLength={100}
                />
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
          </section>
          <Link className="account-help" href="/contact">
            <CircleHelp size={22} aria-hidden="true" />
            <span>
              <strong>A little assistance?</strong>
              <small>We’re here to help with your account.</small>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </aside>
        <div className="account-content">
          <section className="account-section" id="my-orders" aria-labelledby="orders-heading">
            <div className="account-section-title">
              <div>
                <p className="eyebrow">YOUR COLLECTION, IN THE MAKING</p>
                <h2 id="orders-heading">My orders</h2>
              </div>
              <span className="account-count">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </span>
            </div>
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
                          timeZone: 'UTC',
                        })}
                      </p>
                    </div>
                    <div className="account-order-images">
                      {o.items.map((item) => (
                        <Image
                          key={item.id}
                          src={item.image || '/images/tote.webp'}
                          alt={item.name}
                          width={44}
                          height={52}
                        />
                      ))}
                    </div>
                    <span
                      className={
                        'account-status ' +
                        (['PAID', 'DELIVERED'].includes(o.status) ? 'complete' : '')
                      }
                    >
                      {o.status.toLowerCase().replaceAll('_', ' ')}
                    </span>
                    <span className="account-order-total">
                      {money(o.total)}
                      <ChevronRight size={16} aria-hidden="true" />
                    </span>
                  </Link>
                ))
              ) : (
                <div className="account-empty-orders">
                  <div className="account-empty-image">
                    <Image
                      src="/images/tote.webp"
                      alt="Illustrative ORVEN tote concept"
                      fill
                      sizes="(max-width: 560px) 100vw, 280px"
                    />
                    <span>THE EVERYDAY EDIT</span>
                  </div>
                  <div className="account-empty-copy">
                    <span className="account-empty-icon">
                      <Package size={24} aria-hidden="true" />
                    </span>
                    <h3>Your first chapter starts here.</h3>
                    <p>
                      Your order history will begin with your first piece. Find something to carry
                      into your everyday.
                    </p>
                    <Link className="button" href="/collections">
                      Explore the collection
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                    <small>Fictional concept store · No live charges</small>
                  </div>
                </div>
              )}
            </div>
          </section>
          <section
            className="account-section"
            id="my-addresses"
            aria-labelledby="addresses-heading"
          >
            <div className="account-section-title">
              <div>
                <p className="eyebrow">READY FOR YOUR NEXT ORDER</p>
                <h2 id="addresses-heading">Saved addresses</h2>
              </div>
              <MapPin size={22} aria-hidden="true" />
            </div>
            <p className="account-section-description">
              Keep your destinations close for a smoother checkout.
            </p>
            <div className="address-grid">
              {addresses.map((a) => (
                <div className="address-card" key={a.id}>
                  <div className="account-address-label">
                    <MapPin size={16} aria-hidden="true" />
                    <span>DELIVERY ADDRESS</span>
                  </div>
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
            {!addresses.length && (
              <p className="account-no-address">
                No saved addresses yet. Add a destination to use at checkout.
              </p>
            )}
            <details className="account-add-address">
              <summary>
                <Plus size={18} aria-hidden="true" />
                Add a delivery address
              </summary>
              <div className="account-address-form">
                <SimpleForm endpoint="account/address" button="Save address" refresh>
                  <AddressFields />
                </SimpleForm>
              </div>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
