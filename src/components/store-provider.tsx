'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowRight, Check, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { api } from '@/lib/client';
import { money } from '@/lib/pricing';
import { salePrice } from '@/lib/commerce-tools';
import type { getCart } from '@/lib/cart';
export type CartData = Awaited<ReturnType<typeof getCart>>;
type AddedToBag = {
  name: string;
  image: string;
  variation: string;
  quantity: number;
};
const StoreContext = createContext<{
  cart: CartData | null;
  cartAddSequence: number;
  refresh: () => Promise<void>;
  replaceCart: (cart: CartData) => void;
  openBag: () => void;
  add: (id: string) => Promise<void>;
}>({
  cart: null,
  cartAddSequence: 0,
  refresh: async () => {},
  replaceCart: () => {},
  openBag: () => {},
  add: async () => {},
});
export const useStore = () => useContext(StoreContext);
export function StoreProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [cart, setCart] = useState<CartData | null>(null);
  const [addedToBag, setAddedToBag] = useState<AddedToBag | null>(null);
  const [toastHovered, setToastHovered] = useState(false);
  const [toastFocused, setToastFocused] = useState(false);
  const [cartAddSequence, setCartAddSequence] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const revision = useRef(0);
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());
  const runMutation = useCallback(<T,>(action: () => Promise<T>) => {
    const next = mutationQueue.current.then(action, action);
    mutationQueue.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, []);
  const replaceCart = useCallback((value: CartData) => {
    revision.current++;
    setCart(value);
  }, []);
  const refresh = useCallback(async () => {
    const startedAt = revision.current;
    try {
      const value = await api<CartData>('cart');
      if (revision.current === startedAt) setCart(value);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    setAddedToBag(null);
  }, [pathname]);
  const openBag = () => {
    setError('');
    setAddedToBag(null);
    drawer.current?.showModal();
  };
  const add = async (variantId: string) => {
    const updated = await runMutation(() =>
      api<CartData>('cart/item', { variantId, quantity: 1, mode: 'add' }),
    );
    replaceCart(updated);
    const item = updated.items.find((cartItem) => cartItem.variantId === variantId);
    if (item) {
      setAddedToBag({
        name: item.variant.product.name,
        image: item.variant.product.images[0]?.url || '/images/tote.webp',
        variation: [item.variant.color, item.variant.size].filter(Boolean).join(' / '),
        quantity: item.quantity,
      });
      setToastHovered(false);
      setToastFocused(false);
      setCartAddSequence((sequence) => sequence + 1);
    }
  };
  async function update(id: string, quantity: number) {
    setBusy(true);
    setError('');
    try {
      replaceCart(await runMutation(() => api<CartData>('cart/item', { variantId: id, quantity })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const toastPaused = toastHovered || toastFocused;
  useEffect(() => {
    if (!addedToBag || toastPaused) return;
    const timer = window.setTimeout(() => setAddedToBag(null), 4000);
    return () => window.clearTimeout(timer);
  }, [addedToBag, toastPaused]);
  return (
    <StoreContext.Provider value={{ cart, cartAddSequence, refresh, replaceCart, openBag, add }}>
      {children}
      {addedToBag && (
        <div
          className="cart-toast"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          onPointerEnter={() => setToastHovered(true)}
          onPointerLeave={() => setToastHovered(false)}
          onFocusCapture={() => setToastFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setToastFocused(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setAddedToBag(null);
          }}
        >
          <div className="cart-toast-heading">
            <span className="cart-toast-check" aria-hidden="true">
              <Check size={15} strokeWidth={2.2} />
            </span>
            <strong>Added to your bag</strong>
            <button
              className="cart-toast-close"
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setAddedToBag(null)}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="cart-toast-product">
            <Image src={addedToBag.image} alt="" width={54} height={66} sizes="54px" />
            <div className="cart-toast-product-copy">
              <strong>{addedToBag.name}</strong>
              <span>{addedToBag.variation}</span>
              <span>Quantity in bag: {addedToBag.quantity}</span>
            </div>
          </div>
          <div className="cart-toast-actions">
            <Link className="button" href="/cart">
              View Bag <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <button className="cart-toast-continue" onClick={() => setAddedToBag(null)}>
              Continue Shopping
            </button>
          </div>
        </div>
      )}
      <dialog
        ref={drawer}
        className="bag-drawer"
        aria-labelledby="bag-title"
        onClick={(e) => {
          if (e.target === drawer.current) drawer.current?.close();
        }}
      >
        <div className="drawer-inner">
          <div className="drawer-heading">
            <h2 id="bag-title">
              Your bag{' '}
              <span className="small">
                ({cart?.items.reduce((s, i) => s + i.quantity, 0) || 0})
              </span>
            </h2>
            <button
              className="icon-button"
              aria-label="Close bag"
              onClick={() => drawer.current?.close()}
            >
              <X />
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}{' '}
              <Link href="/checkout" onClick={() => drawer.current?.close()}>
                Return to checkout
              </Link>
            </p>
          )}
          {!cart?.items.length ? (
            <div className="empty-state">
              <ShoppingBag size={32} strokeWidth={1} />
              <h3>A little space for something considered.</h3>
              <p>Explore pieces made for the everyday.</p>
              <Link className="button" href="/collections" onClick={() => drawer.current?.close()}>
                Explore the collection <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="drawer-items">
                {cart.items.map((i) => (
                  <div className="bag-item" key={i.id}>
                    <Link
                      href={'/products/' + i.variant.product.slug}
                      onClick={() => drawer.current?.close()}
                    >
                      <Image
                        src={i.variant.product.images[0].url}
                        alt={i.variant.product.images[0].alt}
                        width={96}
                        height={120}
                      />
                    </Link>
                    <div>
                      <Link
                        href={'/products/' + i.variant.product.slug}
                        onClick={() => drawer.current?.close()}
                      >
                        {i.variant.product.name}
                      </Link>
                      <p className="small muted">{i.variant.color}</p>
                      <p>{money(salePrice(i.variant.product))}</p>
                      <div className="quantity">
                        <button
                          disabled={busy}
                          aria-label={'Decrease ' + i.variant.product.name}
                          onClick={() => update(i.variantId, i.quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{i.quantity}</span>
                        <button
                          disabled={busy}
                          aria-label={'Increase ' + i.variant.product.name}
                          onClick={() => update(i.variantId, i.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <button
                      className="text-button small"
                      disabled={busy}
                      onClick={() => update(i.variantId, 0)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="drawer-bottom">
                <div className="row">
                  <span>Subtotal</span>
                  <span>{money(cart.totals.subtotal)}</span>
                </div>
                <p className="small muted">Delivery, discounts and estimated tax at checkout.</p>
                <Link
                  className="button full"
                  href="/checkout"
                  onClick={() => drawer.current?.close()}
                >
                  Continue to checkout <ArrowRight size={16} />
                </Link>
                <Link className="underlink" href="/cart" onClick={() => drawer.current?.close()}>
                  View your bag
                </Link>
                <p className="sample-note">Concept store · No live charges</p>
              </div>
            </>
          )}
        </div>
      </dialog>
    </StoreContext.Provider>
  );
}
