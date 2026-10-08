import Link from 'next/link';
import { Truck, Package, ShieldCheck, Leaf, Mail, Heart, UserRound } from 'lucide-react';
import { Newsletter } from './forms';
import { Wordmark } from './header';
import { FREE_STANDARD_SHIPPING_THRESHOLD_LABEL } from '@/lib/pricing';

export function Footer() {
  return (
    <>
      <div className="service-strip editorial-services">
        <Link href="/shipping">
          <Truck strokeWidth={1.1} />
          <span>
            Shipping information
            <small>Sample free shipping over {FREE_STANDARD_SHIPPING_THRESHOLD_LABEL}</small>
          </span>
        </Link>
        <Link href="/returns">
          <Package strokeWidth={1.1} />
          <span>
            Returns & exchanges<small>Proposed 30-day return policy</small>
          </span>
        </Link>
        <Link href="/story">
          <ShieldCheck strokeWidth={1.1} />
          <span>
            Considered design<small>The ideas behind our collection.</small>
          </span>
        </Link>
        <Link href="/care">
          <Leaf strokeWidth={1.1} />
          <span>
            Care for your pieces<small>A little attention, every day.</small>
          </span>
        </Link>
      </div>
      <footer className="footer editorial-footer">
        <div className="footer-journal">
          <div>
            <h2>Join the ORVEN Journal</h2>
            <p>Be the first to know about new collections and exclusive updates.</p>
          </div>
          <Newsletter compact />
        </div>
        <div className="footer-main">
          <Link className="footer-brand" href="/" aria-label="ORVEN home">
            <Wordmark />
            <span>The Art of Everyday.</span>
          </Link>
          <nav className="footer-navigation" aria-label="Footer navigation">
            <Link href="/collections">Collections</Link>
            <Link href="/collections?category=Bags">Bags</Link>
            <Link href="/collections?category=Small+leather+goods">Small Leather Goods</Link>
            <Link href="/story">Our Story</Link>
            <Link href="/contact">Customer Care</Link>
          </nav>
          <div className="footer-tools">
            <Link href="/contact" aria-label="Contact ORVEN">
              <Mail size={17} />
            </Link>
            <Link href="/account/saved" aria-label="Your saved pieces">
              <Heart size={17} />
            </Link>
            <Link href="/account" aria-label="Your account">
              <UserRound size={17} />
            </Link>
          </div>
        </div>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} ORVEN. All rights reserved.</span>
          <div>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
        <p className="sample-note">
          Fictional concept store · AI-generated illustrative imagery · Sandbox payments only; no
          actual merchandise is offered.
        </p>
      </footer>
    </>
  );
}
