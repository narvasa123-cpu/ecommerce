'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useStore, type CartData } from './store-provider';
import { api } from '@/lib/client';
import { money, conversionRounding, phpMinorMoney } from '@/lib/pricing';
export function Totals({ totals }: { totals: CartData['totals'] }) {
  const rounding = conversionRounding(totals);
  return (
    <div className="summary-lines">
      <div className="row">
        <span>Subtotal</span>
        <span>{money(totals.subtotal)}</span>
      </div>
      {totals.discount > 0 && (
        <div className="row">
          <span>Considered saving</span>
          <span>−{money(totals.discount)}</span>
        </div>
      )}
      <div className="row">
        <span>Delivery</span>
        <span>{totals.shipping === 0 ? 'Complimentary' : money(totals.shipping)}</span>
      </div>
      <div className="row">
        <span>Estimated tax</span>
        <span>{money(totals.tax)}</span>
      </div>
      {rounding !== 0 && (
        <div className="row">
          <span>Currency rounding</span>
          <span>{phpMinorMoney(rounding)}</span>
        </div>
      )}
      <div className="row summary-total">
        <span>
          Total <small className="muted">PHP</small>
        </span>
        <span>{money(totals.total)}</span>
      </div>
    </div>
  );
}
export function PromoForm({ cart, refresh }: { cart: CartData; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await api('cart/promo', { code: new FormData(e.currentTarget).get('code') });
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api('cart/promo', { code: '' });
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form className="promo-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="promo-code">
          Promotion code
        </label>
        <input
          id="promo-code"
          name="code"
          placeholder="A note or a promotion code"
          maxLength={30}
          required
        />
        <button disabled={busy}>{busy ? 'Applying…' : 'Apply'}</button>
      </form>
      {cart.promotionCode && (
        <p className="small">
          {cart.promotionCode} applied{' '}
          <button className="text-button" disabled={busy} onClick={remove}>
            Remove
          </button>
        </p>
      )}
      {(message || cart.promoError) && (
        <p role="alert" className="form-error">
          {message || cart.promoError}
        </p>
      )}
    </>
  );
}
export function CartPage() {
  const { cart, refresh } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function update(id: string, q: number) {
    setBusy(true);
    setError('');
    try {
      await api('cart/item', { variantId: id, quantity: q });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!cart)
    return (
      <div className="page-container" role="status">
        Preparing your bag…
      </div>
    );
  return (
    <div className="page-container">
      <div className="page-heading">
        <p className="eyebrow">YOUR CONSIDERED SELECTION</p>
        <h1>Your bag.</h1>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}{' '}
          <Link className="underlink" href="/checkout">
            Return to checkout
          </Link>
        </p>
      )}
      {cart.items.length ? (
        <div className="cart-layout">
          <div>
            {cart.items.map((i) => (
              <article className="cart-full-item" key={i.id}>
                <Link href={'/products/' + i.variant.product.slug}>
                  <Image
                    src={i.variant.product.images[0].url}
                    alt={i.variant.product.images[0].alt}
                    width={130}
                    height={160}
                  />
                </Link>
                <div>
                  <h3>
                    <Link href={'/products/' + i.variant.product.slug}>
                      {i.variant.product.name}
                    </Link>
                  </h3>
                  <p className="small muted">
                    {i.variant.color} / {i.variant.size}
                  </p>
                  <p className="small">{money(i.variant.product.price)}</p>
                  <div className="quantity">
                    <button
                      aria-label={'Decrease ' + i.variant.product.name}
                      disabled={busy}
                      onClick={() => update(i.variantId, i.quantity - 1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      aria-label={'Increase ' + i.variant.product.name}
                      disabled={busy}
                      onClick={() => update(i.variantId, i.quantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <br />
                  <button
                    className="text-button small"
                    disabled={busy}
                    onClick={() => update(i.variantId, 0)}
                  >
                    Remove
                  </button>
                </div>
                <span>{money(i.variant.product.price * i.quantity)}</span>
              </article>
            ))}
            <Link className="underlink" style={{ marginTop: 25 }} href="/collections">
              Continue exploring <ArrowRight size={16} />
            </Link>
          </div>
          <aside className="summary-box">
            <h2>A considered total.</h2>
            <Totals totals={cart.totals} />
            <PromoForm cart={cart} refresh={refresh} />
            <Link className="button full" href="/checkout">
              Continue to checkout <ArrowRight size={16} />
            </Link>
            <p className="small muted" style={{ marginTop: 16 }}>
              Estimates for Philippine standard delivery; PHP conversion rounding may differ by
              centavos. Your destination and delivery choice are confirmed at checkout.
            </p>
            <p className="sample-note">Concept store · No live charges</p>
          </aside>
        </div>
      ) : (
        <div className="empty-state">
          <ShoppingBag size={32} strokeWidth={1} />
          <h2>Room for your next companion.</h2>
          <p>Your bag is currently empty.</p>
          <Link className="button" href="/collections">
            Explore the collection <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
