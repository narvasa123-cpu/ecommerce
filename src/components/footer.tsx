import Link from 'next/link';
import { PackageCheck, RefreshCcw, PenTool } from 'lucide-react';
import { Newsletter } from './forms';
import { Wordmark } from './header';
import { FREE_STANDARD_SHIPPING_THRESHOLD_LABEL } from '@/lib/pricing';
export function Footer() {
  return (
    <>
      <div className="service-strip">
        <div>
          <PackageCheck strokeWidth={1.2} />
          <span>
            Delivery, illustrated
            <small>Sample free-delivery threshold {FREE_STANDARD_SHIPPING_THRESHOLD_LABEL}</small>
          </span>
        </div>
        <div>
          <RefreshCcw strokeWidth={1.2} />
          <span>
            Room to decide<small>Proposed 30-day return policy</small>
          </span>
        </div>
        <div>
          <PenTool strokeWidth={1.2} />
          <span>
            Care, considered<small>Illustrative guidance for sample materials</small>
          </span>
        </div>
      </div>
      <footer className="footer">
        <div className="footer-top">
          <div className="newsletter-copy">
            <p className="eyebrow">A NOTE FROM ORVEN</p>
            <h2>Stay a little closer.</h2>
            <Newsletter />
          </div>
          <div className="footer-links">
            <div>
              <h3>Explore</h3>
              <Link href="/collections">All pieces</Link>
              <Link href="/collections?collection=the-everyday">The Everyday</Link>
              <Link href="/collections?collection=the-city">The City</Link>
              <Link href="/story">Our story</Link>
            </div>
            <div>
              <h3>Client care</h3>
              <Link href="/shipping">Shipping</Link>
              <Link href="/returns">Returns & exchanges</Link>
              <Link href="/care">Care guide</Link>
              <Link href="/contact">Contact us</Link>
              <Link href="/account">Your account</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <Link href="/" aria-label="ORVEN home">
            <Wordmark />
          </Link>
          <span>© {new Date().getFullYear()} ORVEN. Designed with intention.</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
        <p className="sample-note">
          A fictional concept store. All imagery is AI-generated and illustrative. Sandbox payments
          only; no actual merchandise is offered.
        </p>
      </footer>
    </>
  );
}
