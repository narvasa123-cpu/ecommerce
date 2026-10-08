'use client';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useStore, type CartData } from './store-provider';
import { Totals, PromoForm } from './cart-page';
import { api } from '@/lib/client';
import { money } from '@/lib/pricing';
import { salePrice } from '@/lib/commerce-tools';
type Address = {
  name: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};
type UserData = { name: string; email: string; addresses: (Address & { id: string })[] } | null;
export function Checkout({
  sandbox,
  user,
  resume,
}: {
  sandbox: boolean;
  user: UserData;
  resume?: string;
}) {
  const { cart, refresh } = useStore();
  const [quote, setQuote] = useState<CartData | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState<Address>(
    user?.addresses[0] || {
      name: user?.name || '',
      line1: '',
      city: '',
      region: '',
      postalCode: '',
      country: 'PH',
    },
  );
  const [delivery, setDelivery] = useState('standard');
  const [consent, setConsent] = useState(false);
  const key = useRef<string>('');
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  useEffect(() => {
    key.current = crypto.randomUUID();
  }, []);
  useEffect(() => {
    let active = true;
    setQuote(null);
    api<CartData>('cart?country=' + address.country + '&delivery=' + delivery)
      .then((r) => {
        if (active) setQuote(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [address.country, delivery, cart]);
  const setField = (name: keyof Address, value: string) =>
    setAddress((a) => ({ ...a, [name]: value }));
  function proceed(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setStep(2);
    setTimeout(() => heading.current?.focus(), 0);
  }
  async function placeOrder() {
    if (!consent || !quote) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ token: string; sandbox: boolean; url?: string }>('checkout', {
        key: key.current,
        email,
        address,
        delivery,
      });
      if (result.sandbox) {
        await api('checkout/confirm', { token: result.token });
        await refresh();
        router.push('/orders/' + result.token);
      } else if (result.url) window.location.assign(result.url);
      else router.push('/orders/' + result.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      await api('checkout/cancel', { token: resume || cart?.pendingOrder?.token });
      await refresh();
      key.current = crypto.randomUUID();
      setBusy(false);
      setStep(1);
      setConsent(false);
      router.replace('/checkout');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!cart)
    return (
      <div className="page-container" role="status">
        Preparing checkout…
      </div>
    );
  const pendingToken = resume || cart.pendingOrder?.token;
  if (pendingToken)
    return (
      <div className="page-container auth-layout">
        <h1>Your reserved bag.</h1>
        <p>
          Your payment is pending. You can view the order, or cancel this reservation and return to
          checkout.
        </p>
        <Link className="button full" href={'/orders/' + pendingToken} style={{ marginTop: 25 }}>
          View pending order
        </Link>
        {cart.pendingOrder?.provider === 'stripe' && (
          <button
            className="button full"
            style={{ marginTop: 15 }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api<{ url: string }>('checkout/resume', { token: pendingToken });
                window.location.assign(r.url);
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            Resume Stripe test payment
          </button>
        )}
        <button className="underlink" disabled={busy} onClick={cancel}>
          Cancel reservation & start again
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  if (!cart.items.length)
    return (
      <div className="page-container empty-state">
        <h1>Your bag is waiting.</h1>
        <p>Choose a piece before continuing to checkout.</p>
        <Link className="button" href="/collections">
          See the collection
        </Link>
      </div>
    );
  return (
    <div className="page-container">
      <div className="page-heading">
        <p className="eyebrow">A FEW THOUGHTFUL DETAILS</p>
        <h1>Make it yours.</h1>
      </div>
      <div className="checkout-steps" aria-label="Checkout progress">
        {['Delivery details', 'Review & payment', 'Confirmation'].map((s, i) => (
          <span
            key={s}
            className={step === i + 1 ? 'active' : ''}
            aria-current={step === i + 1 ? 'step' : undefined}
          >
            <b className="step-number">{i + 1}</b>
            {s}
          </span>
        ))}
      </div>
      <div className="checkout-layout">
        <div>
          {sandbox && (
            <div className="sandbox-banner">
              <strong>Sandbox checkout.</strong> A simulated order, with no charge and no actual
              shipment. Please use fictional delivery details.
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {step === 1 ? (
            <form className="form-grid" ref={form} onSubmit={proceed}>
              <section className="checkout-section">
                <div className="row">
                  <h2>Contact</h2>
                  {!user && (
                    <Link className="underlink" href="/account?next=checkout">
                      Sign in
                    </Link>
                  )}
                </div>
                <p className="small muted" style={{ marginBottom: 20 }}>
                  {user
                    ? 'Signed in as ' + user.email
                    : 'Continue as a guest. An account is entirely optional.'}
                </p>
                <label className="field">
                  Email address
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    maxLength={254}
                  />
                </label>
              </section>
              <section className="checkout-section form-grid">
                <h2>Delivery address</h2>
                {user && user.addresses.length > 0 && (
                  <label className="field">
                    Saved address
                    <select
                      onChange={(e) => {
                        const a = user.addresses.find((a) => a.id === e.target.value);
                        if (a) setAddress(a);
                      }}
                    >
                      <option value="">Choose an address</option>
                      {user.addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.line1}, {a.city}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field">
                  Full name
                  <input
                    value={address.name}
                    onChange={(e) => setField('name', e.target.value)}
                    autoComplete="shipping name"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
                <label className="field">
                  Street address
                  <input
                    value={address.line1}
                    onChange={(e) => setField('line1', e.target.value)}
                    autoComplete="shipping address-line1"
                    required
                    minLength={3}
                    maxLength={200}
                  />
                </label>
                <div className="fields-row">
                  <label className="field">
                    City
                    <input
                      value={address.city}
                      onChange={(e) => setField('city', e.target.value)}
                      autoComplete="shipping address-level2"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </label>
                  <label className="field">
                    State / region
                    <input
                      value={address.region}
                      onChange={(e) => setField('region', e.target.value)}
                      autoComplete="shipping address-level1"
                      required
                      maxLength={100}
                    />
                  </label>
                </div>
                <div className="fields-row">
                  <label className="field">
                    Postal code
                    <input
                      value={address.postalCode}
                      onChange={(e) => setField('postalCode', e.target.value)}
                      autoComplete="shipping postal-code"
                      required
                      minLength={3}
                      maxLength={20}
                    />
                  </label>
                  <label className="field">
                    Country
                    <select
                      value={address.country}
                      onChange={(e) => setField('country', e.target.value)}
                      autoComplete="shipping country"
                    >
                      <option value="PH">Philippines</option>
                      <option value="US">United States</option>
                      <option value="FR">France</option>
                      <option value="DE">Germany</option>
                      <option value="NL">Netherlands</option>
                      <option value="IE">Ireland</option>
                    </select>
                  </label>
                </div>
              </section>
              <fieldset className="checkout-section" style={{ border: 0, padding: 0 }}>
                <legend style={{ fontFamily: 'var(--display)', fontSize: 32, marginBottom: 20 }}>
                  A pace that suits you
                </legend>
                {[
                  ['standard', 'Standard delivery', '3–7 working days'],
                  ['express', 'Express delivery', '1–3 working days'],
                ].map(([value, name, detail]) => (
                  <label className="delivery-option" key={value}>
                    <input
                      type="radio"
                      name="delivery"
                      value={value}
                      checked={delivery === value}
                      onChange={() => setDelivery(value)}
                    />
                    <span>
                      {name}
                      <small>
                        {detail}
                        {cart.items.some((i) => i.variant.madeToOrder)
                          ? ' after the made-to-order lead time'
                          : ''}
                      </small>
                    </span>
                    {value === delivery
                      ? quote?.totals.shipping === 0
                        ? 'Complimentary'
                        : quote
                          ? money(quote.totals.shipping)
                          : 'Calculating…'
                      : value === 'express'
                        ? money(['PH', 'US'].includes(address.country) ? 2500 : 4000)
                        : 'From ₱0.00'}
                  </label>
                ))}
              </fieldset>
              <button className="button" disabled={!quote}>
                Review your order <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div>
              <h2 ref={heading} tabIndex={-1}>
                One final consideration.
              </h2>
              <div className="review-address">
                <div className="row">
                  <strong>Delivery details</strong>
                  <button className="underlink" onClick={() => setStep(1)}>
                    Edit
                  </button>
                </div>
                <p>
                  {address.name}
                  <br />
                  {address.line1}
                  <br />
                  {address.city}, {address.region} {address.postalCode}
                  <br />
                  {address.country}
                </p>
                <p>
                  {email}
                  <br />
                  {delivery === 'express' ? 'Express' : 'Standard'} delivery
                </p>
              </div>
              <p className="small muted">
                {sandbox
                  ? 'No payment details are collected. Confirmation records a simulated payment.'
                  : 'You’ll continue to Stripe’s secure test checkout. Never enter real card details.'}
              </p>
              <label className="delivery-option" style={{ marginTop: 25 }}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I agree to the{' '}
                  <Link className="underlink" href="/terms">
                    terms
                  </Link>{' '}
                  and understand this is a fictional concept store.
                </span>
              </label>
              <button
                className="button full"
                disabled={busy || !consent || !quote}
                onClick={placeOrder}
              >
                {busy
                  ? 'Preparing your order…'
                  : sandbox
                    ? 'Place sandbox order'
                    : 'Continue to Stripe test checkout'}
                <ArrowRight size={16} />
              </button>
              <p className="small muted" style={{ marginTop: 15 }}>
                Stock and totals are checked again before your order is placed.
              </p>
            </div>
          )}
        </div>
        <aside className="summary-box">
          <h2>Your selection.</h2>
          <div className="review-items">
            {cart.items.map((i) => (
              <div className="review-item" key={i.id}>
                <Image
                  src={i.variant.product.images[0].url}
                  alt={i.variant.product.images[0].alt}
                  width={55}
                  height={70}
                />
                <div>
                  {i.variant.product.name}
                  <p className="muted">
                    {i.variant.color} · Qty {i.quantity}
                  </p>
                </div>
                <span>{money(i.quantity * salePrice(i.variant.product))}</span>
              </div>
            ))}
          </div>
          {quote ? (
            <Totals totals={quote.totals} />
          ) : (
            <p role="status">Calculating delivery and tax…</p>
          )}
          <PromoForm cart={cart} refresh={refresh} />
          <p className="small muted" style={{ marginTop: 20 }}>
            Demonstration tax estimate: 12% PH, 8% US, 20% EU; not a compliant tax determination.
            PHP totals use a fixed conversion rate and may differ by centavos due to rounding.
          </p>
          <p
            className="small muted"
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}
          >
            <LockKeyhole size={14} />{' '}
            {sandbox ? 'Secure sandbox checkout' : 'Secure Stripe test checkout'}
          </p>
        </aside>
      </div>
    </div>
  );
}
