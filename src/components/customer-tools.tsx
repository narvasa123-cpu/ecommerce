'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Heart,
  Home,
  Search,
  ShoppingBag,
  Package,
  UserRound,
  RotateCcw,
  Bell,
  Star,
} from 'lucide-react';
import { api } from '@/lib/client';
import { money } from '@/lib/pricing';
import { salePrice } from '@/lib/commerce-tools';
import { useStore } from './store-provider';
export type ToolProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePercent: number;
  images: { url: string; alt: string }[];
  active?: boolean;
};
type Favorite = { productId: string; savedPrice: number; product: ToolProduct };
const CustomerContext = createContext<{ favorites: Favorite[]; refresh: () => Promise<void> }>({
  favorites: [],
  refresh: async () => {},
});
export function CustomerToolsProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const path = usePathname();
  async function refresh() {
    try {
      setFavorites(await api<Favorite[]>('features/wishlist'));
    } catch {
      setFavorites([]);
    }
  }
  useEffect(() => {
    let alive = true;
    api<Favorite[]>('features/wishlist')
      .then((data) => {
        if (alive) setFavorites(data);
      })
      .catch(() => {
        if (alive) setFavorites([]);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  return (
    <CustomerContext.Provider value={{ favorites, refresh }}>{children}</CustomerContext.Provider>
  );
}
export function ProductPrice({ product }: { product: { price: number; salePercent?: number } }) {
  return (
    <span className="tool-price">
      {!!product.salePercent && (
        <>
          <del>{money(product.price)}</del>
          <span className="sale-badge">−{product.salePercent}%</span>
        </>
      )}
      <strong>{money(salePrice(product))}</strong>
    </span>
  );
}
export function SaveProduct({ productId }: { productId: string }) {
  const { favorites, refresh } = useContext(CustomerContext);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const saved = favorites.some((f) => f.productId === productId);
  async function toggle() {
    setBusy(true);
    setError('');
    try {
      await api('features/wishlist', { productId, saved: !saved });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="save-piece">
      <button
        type="button"
        className="save-icon"
        aria-label={saved ? 'Remove from saved pieces' : 'Save for later'}
        aria-pressed={saved}
        disabled={busy}
        onClick={toggle}
      >
        <Heart size={21} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        {busy ? 'Saving…' : saved ? 'Saved' : 'Save for later'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error} <Link href="/account">Sign in</Link>
        </p>
      )}
    </div>
  );
}
export function QuickAdd({
  variantId,
  disabled = false,
  productName,
}: {
  variantId?: string;
  disabled?: boolean;
  productName?: string;
}) {
  const { add } = useStore();
  const [busy, setBusy] = useState(false);
  async function addToCart() {
    if (!variantId || disabled) return;
    setBusy(true);
    try {
      await add(variantId);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      className="button quick-add"
      disabled={!variantId || disabled || busy}
      aria-label={
        disabled
          ? `${productName || 'This piece'} is sold out`
          : `${busy ? 'Adding' : 'Add'} ${productName || 'piece'} to cart`
      }
      onClick={addToCart}
    >
      <ShoppingBag size={16} aria-hidden="true" />
      {busy ? 'Adding…' : disabled ? 'Sold out' : 'Add to cart'}
    </button>
  );
}
export function SearchSuggestions({
  initial = '',
  autoFocus = false,
}: {
  initial?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState(initial),
    [products, setProducts] = useState<ToolProduct[]>([]),
    [open, setOpen] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      fetch('/api/store/features/search?q=' + encodeURIComponent(q), {
        signal: controller.signal,
        cache: 'no-store',
      })
        .then(async (r) => {
          if (!r.ok) throw new Error('Suggestions unavailable. You can still submit your search.');
          return r.json();
        })
        .then((data) => {
          if (!controller.signal.aborted)
            setProducts(Array.isArray(data) ? (data as ToolProduct[]) : []);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setProducts([]);
            setError((e as Error).message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);
  function keys(e: KeyboardEvent) {
    const links = [
      ...(root.current?.querySelectorAll<HTMLAnchorElement>('.search-results a') || []),
    ];
    if (e.key === 'Escape') {
      input.current?.focus();
      setOpen(false);
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!links.length) return;
      e.preventDefault();
      const index = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next =
        index === -1
          ? e.key === 'ArrowDown'
            ? 0
            : links.length - 1
          : (index + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links[next]?.focus();
    }
  }
  return (
    <div
      className="search-suggest"
      ref={root}
      onKeyDown={keys}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor="piece-search">Search pieces</label>
      <input
        id="piece-search"
        ref={input}
        name="q"
        type="search"
        value={q}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Find your next everyday companion"
        aria-controls="piece-suggestions"
        aria-describedby={open && q.trim().length >= 2 ? 'piece-suggestion-status' : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setProducts([]);
          setLoading(e.target.value.trim().length >= 2);
          setOpen(true);
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className="search-results" id="piece-suggestions">
          <p id="piece-suggestion-status" role="status" className="small muted">
            {loading
              ? 'Finding pieces…'
              : error ||
                (products.length
                  ? `${products.length} suggestions. Use arrow keys to browse.`
                  : 'No matching pieces.')}
          </p>
          {products.map((p) => (
            <Link key={p.id} href={'/products/' + p.slug}>
              <Image src={p.images[0]?.url || '/images/tote.webp'} alt="" width={42} height={52} />
              <span>
                {p.name}
                <ProductPrice product={p} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
export function PieceList({ products }: { products: ToolProduct[] }) {
  return (
    <div className="tool-piece-grid">
      {products.map((p) => (
        <article className="tool-piece" key={p.id}>
          <Link href={'/products/' + p.slug}>
            <Image
              src={p.images[0]?.url || '/images/tote.webp'}
              alt={p.images[0]?.alt || 'Concept sample'}
              width={250}
              height={300}
            />
            <h3>{p.name}</h3>
          </Link>
          <ProductPrice product={p} />
          {p.active === false && <p className="small">Currently unavailable</p>}
          <SaveProduct productId={p.id} />
        </article>
      ))}
    </div>
  );
}
export function RecentPieces() {
  const path = usePathname();
  const [products, setProducts] = useState<ToolProduct[]>([]);
  const [cleared, setCleared] = useState(false);
  useEffect(() => {
    let alive = true;
    try {
      const raw: unknown = JSON.parse(localStorage.getItem('orven-recent') || '[]');
      let slugs = Array.isArray(raw)
        ? raw
            .filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{1,100}$/.test(s))
            .slice(0, 12)
        : [];
      const slug = path.startsWith('/products/') ? path.split('/')[2] : '';
      if (slug && /^[a-z0-9-]{1,100}$/.test(slug)) {
        slugs = [slug, ...slugs.filter((s) => s !== slug)].slice(0, 12);
        localStorage.setItem('orven-recent', JSON.stringify(slugs));
      }
      const others = slugs.filter((s) => s !== slug);
      api<ToolProduct[]>('features/recent?slugs=' + encodeURIComponent(others.join(',')))
        .then((data) => {
          if (alive) {
            setProducts(
              others
                .map((s) => data.find((p) => p.slug === s))
                .filter((p): p is ToolProduct => !!p)
                .slice(0, 4),
            );
            setCleared(false);
          }
        })
        .catch(() => {});
    } catch {
      /* Storage may be disabled; browsing remains available. */
    }
    return () => {
      alive = false;
    };
  }, [path]);
  if (
    !products.length ||
    cleared ||
    !(path === '/' || path === '/collections' || path.startsWith('/products/'))
  )
    return null;
  return (
    <section className="page-container recent-pieces">
      <div className="row">
        <div>
          <p className="eyebrow">BACK TO YOUR DISCOVERIES</p>
          <h2>Recently considered.</h2>
        </div>
        <button
          className="tool-button"
          onClick={() => {
            try {
              localStorage.removeItem('orven-recent');
            } catch {}
            setCleared(true);
          }}
        >
          Clear history
        </button>
      </div>
      <p className="small muted">Remembered on this browser only.</p>
      <PieceList products={products} />
    </section>
  );
}
export function MobileNavigation() {
  const path = usePathname(),
    { cart } = useStore();
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const links = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Search', href: '/collections?search=1', icon: Search },
    { label: 'Cart', href: '/cart', icon: ShoppingBag },
    { label: 'Orders', href: '/account/orders', icon: Package },
    { label: 'Account', href: '/account', icon: UserRound },
  ];
  return (
    <nav className="mobile-bottom-nav" aria-label="Customer navigation">
      {links.map(({ label, href, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          aria-current={
            (
              label === 'Orders'
                ? path.startsWith('/account/orders') || path.startsWith('/orders/')
                : label === 'Account'
                  ? path.startsWith('/account') && !path.startsWith('/account/orders')
                  : label === 'Search'
                    ? path.startsWith('/collections') || path.startsWith('/products/')
                    : path === href
            )
              ? 'page'
              : undefined
          }
        >
          <Icon size={20} aria-hidden="true" />
          <span>
            {label}
            {label === 'Cart' && count > 0 ? ` (${count})` : ''}
          </span>
        </Link>
      ))}
    </nav>
  );
}
export { CopyReference } from './copy-reference';
export function Reorder({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const { refresh } = useStore(),
    router = useRouter();
  return (
    <span>
      <button
        className="tool-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await api('features/reorder', { orderId });
            await refresh();
            router.push('/cart');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <RotateCcw size={16} aria-hidden="true" />
        {busy ? 'Checking stock…' : 'Reorder'}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </span>
  );
}
export function ReviewForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fields = new FormData(form);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('features/review', {
        productId,
        rating: Number(fields.get('rating')),
        body: fields.get('body'),
      });
      setMessage('Your verified review is saved and visible to everyone.');
      form.reset();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-grid review-form" onSubmit={submit}>
      <h3>Share your experience.</h3>
      <p className="small muted">
        Reviews are public. To post one, sign in with the account that placed a delivered, paid
        order. Prototype purchases are simulated; one review per product, editable by submitting
        again.
      </p>
      <label className="field">
        Rating
        <select name="rating" defaultValue="5">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? '' : 's'}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Your review
        <textarea name="body" minLength={10} maxLength={2000} required rows={3} />
      </label>
      <button className="button" disabled={busy}>
        <Star size={16} aria-hidden="true" />
        {busy ? 'Saving…' : 'Submit verified review'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export function CustomerHubLinks() {
  return (
    <nav className="customer-hub-links" aria-label="Your shopping tools">
      <Link href="/account/saved">
        <Heart size={18} aria-hidden="true" />
        Wishlist
      </Link>
      <Link href="/account/notifications">
        <Bell size={18} aria-hidden="true" />
        Price-drop alerts
      </Link>
      <Link href="/account/orders">
        <Package size={18} aria-hidden="true" />
        All orders
      </Link>
    </nav>
  );
}
export function NotificationRead({ id }: { id?: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter();
  return (
    <>
      <button
        className="tool-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api('features/notifications/read', id ? { id } : {});
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Updating…' : id ? 'Mark read' : 'Mark all read'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
