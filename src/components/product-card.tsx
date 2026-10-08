import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ProductPrice, QuickAdd } from './customer-tools';
import { availability, type CatalogProduct } from '@/lib/catalog';
import { lowStockLabel } from '@/lib/inventory-label';
const editorialImages: Record<string, string> = {
  '/images/tote.webp': '/images/editorial/product-tote.webp',
  '/images/shoulder.webp': '/images/editorial/product-shoulder.webp',
  '/images/crossbody.webp': '/images/editorial/product-crossbody.webp',
  '/images/wallet.webp': '/images/editorial/product-wallet.webp',
};
export function ProductCard({
  product: p,
  compact = false,
}: {
  product: CatalogProduct;
  compact?: boolean;
}) {
  const v = p.variants.find((variant) => (variant.inventory?.quantity || 0) > 0) || p.variants[0];
  const stock = p.variants.reduce((s, v) => s + (v.inventory?.quantity || 0), 0);
  const lowStock = lowStockLabel(stock, v?.madeToOrder);
  const originalImage = p.images[0]?.url || '/images/tote.webp';
  return (
    <article className={'product-card' + (compact ? ' product-card--editorial' : '')}>
      <Link prefetch={false} href={'/products/' + p.slug} className="product-picture">
        <Image
          src={compact ? editorialImages[originalImage] || originalImage : originalImage}
          alt={`Illustrative product view of ${p.name}`}
          fill
          sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
        />
        {!compact && p.featured && <span className="product-tag">Signature</span>}
        <span className="product-arrow">
          <ArrowUpRight size={20} aria-hidden="true" />
        </span>
      </Link>
      <div className="product-name-price">
        <h3>
          <Link prefetch={false} href={'/products/' + p.slug}>
            {p.name}
          </Link>
        </h3>
        <ProductPrice product={p} />
      </div>
      <p className={'small muted' + (compact ? ' sr-only' : '')}>
        {p.material} · {v?.color}
      </p>
      <div className="swatches" role="group" aria-label={'Available colours for ' + p.name}>
        {p.variants.map((v) => (
          <span
            key={v.id}
            style={{ backgroundColor: v.colorHex }}
            title={v.color}
            aria-label={v.color}
            role="img"
          />
        ))}
        <span
          className={
            'stock-label' +
            (lowStock ? ' low-stock-badge' : '') +
            (compact && stock > 3 ? ' sr-only' : '')
          }
        >
          {lowStock || availability(stock, v?.madeToOrder)}
        </span>
      </div>
      <QuickAdd variantId={v?.id} disabled={stock === 0} productName={p.name} compact={compact} />
    </article>
  );
}
