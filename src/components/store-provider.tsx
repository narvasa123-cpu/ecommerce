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
import { X, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/client';
import { money } from '@/lib/pricing';
import { salePrice } from '@/lib/commerce-tools';
import type { getCart } from '@/lib/cart';
export type CartData = Awaited<ReturnType<typeof getCart>>;
const StoreContext = createContext<{
  cart: CartData | null;
  refresh: () => Promise<void>;
  replaceCart: (cart: CartData) => void;
  openBag: () => void;
  add: (id: string) => Promise<void>;
}>({
  cart: null,
  refresh: async () => {},
  replaceCart: () => {},
  openBag: () => {},
  add: async () => {},
});
export const useStore = () => useContext(StoreContext);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const revision = useRef(0);
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
  const openBag = () => {
    setError('');
    drawer.current?.showModal();
  };
  const add = async (id: string) => {
    replaceCart(await api<CartData>('cart/item', { variantId: id, quantity: 1, mode: 'add' }));
    openBag();
  };
  async function update(id: string, quantity: number) {
    setBusy(true);
    setError('');
    try {
      replaceCart(await api<CartData>('cart/item', { variantId: id, quantity }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <StoreContext.Provider value={{ cart, refresh, replaceCart, openBag, add }}>
      {children}
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
