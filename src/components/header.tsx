'use client';
import Link from 'next/link';
import { Search, UserRound, ShoppingBag, Menu, X, Heart } from 'lucide-react';
import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from './store-provider';
import { FREE_STANDARD_SHIPPING_THRESHOLD_LABEL } from '@/lib/pricing';
export function Wordmark() {
  return (
    <svg viewBox="0 0 200 62" role="img" aria-label="ORVEN" className="wordmark">
      <text
        x="100"
        y="45"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="47"
        letterSpacing="8"
        fill="currentColor"
      >
        ORVEN
      </text>
    </svg>
  );
}
const links = [
  ['Collections', '/collections'],
  ['Bags', '/collections?category=Bags'],
  ['Small leather goods', '/collections?category=Small+leather+goods'],
  ['Our story', '/story'],
];
export function Header() {
  const { cart, cartAddSequence, openBag } = useStore();
  const menu = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const count = cart?.items.reduce((s, i) => s + i.quantity, 0) || 0;
  const currentLink = (href: string) => {
    if (href === '/story') return path === '/story';
    if (href === '/collections') return path === '/collections' && !path.includes('/products/');
    return false;
  };
  return (
    <>
      <div className="announcement">
        <span>Considered design. Everyday companions.</span>
        <span>
          Illustrative free delivery on orders of {FREE_STANDARD_SHIPPING_THRESHOLD_LABEL} or more
        </span>
        <span>PHP · Philippines & international</span>
      </div>
      <header className="header">
        <button
          className="icon-button mobile-only"
          aria-label="Open navigation"
          onClick={() => menu.current?.showModal()}
        >
          <Menu size={21} />
        </button>
        <Link prefetch={false} className="logo" href="/" aria-label="ORVEN home">
          <Wordmark />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([name, href]) => (
            <Link
              prefetch={false}
              key={name}
              href={href}
              aria-current={currentLink(href) ? 'page' : undefined}
            >
              {name}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <Link
            className="icon-button wishlist-icon"
            href="/account/saved"
            aria-label="Your wishlist"
          >
            <Heart size={20} strokeWidth={1.4} />
          </Link>
          <Link
            prefetch={false}
            className="icon-button"
            href="/collections?search=1"
            aria-label="Search products"
          >
            <Search size={20} strokeWidth={1.4} />
          </Link>
          <Link
            prefetch={false}
            className="icon-button account-icon"
            href="/account"
            aria-label="Your account"
          >
            <UserRound size={20} strokeWidth={1.4} />
          </Link>
          <button
            className="icon-button bag-trigger"
            onClick={openBag}
            aria-label={'Open bag, ' + count + ' items'}
          >
            <ShoppingBag
              key={cartAddSequence}
              className={cartAddSequence ? 'bag-icon-added' : undefined}
              size={20}
              strokeWidth={1.4}
              aria-hidden="true"
            />
            <span className="bag-count">{count}</span>
          </button>
        </div>
      </header>
      <dialog ref={menu} className="nav-dialog" aria-labelledby="nav-title">
        <div className="drawer-heading">
          <h2 id="nav-title">ORVEN</h2>
          <button
            className="icon-button"
            aria-label="Close navigation"
            onClick={() => menu.current?.close()}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          {links.map(([name, href]) => (
            <Link prefetch={false} href={href} key={name} onClick={() => menu.current?.close()}>
              {name}
            </Link>
          ))}
          <Link prefetch={false} href="/account" onClick={() => menu.current?.close()}>
            Your account
          </Link>
          <Link prefetch={false} href="/contact" onClick={() => menu.current?.close()}>
            Contact us
          </Link>
        </nav>
      </dialog>
      <nav className="mobile-bottom-nav" aria-label="Quick shopping navigation">
        <Link href="/" prefetch={false}>
          <span aria-hidden="true">⌂</span>Home
        </Link>
        <Link href="/collections?search=1" prefetch={false}>
          <Search size={20} />
          Search
        </Link>
        <button type="button" onClick={openBag}>
          <ShoppingBag size={20} />
          <span>Cart{count ? ` · ${count}` : ''}</span>
        </button>
        <Link href="/account" prefetch={false}>
          <span aria-hidden="true">◇</span>Orders
        </Link>
        <Link href="/account" prefetch={false}>
          <UserRound size={20} />
          Account
        </Link>
      </nav>
    </>
  );
}
