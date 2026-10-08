import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ProductPrice, QuickAdd } from './customer-tools';
import { availability, type CatalogProduct } from '@/lib/catalog';
import { lowStockLabel } from '@/lib/inventory-label';
export function ProductCard({ product: p }: { product: CatalogProduct }) {
  const v = p.variants[0];
  const stock = p.variants.reduce((s, v) => s + (v.inventory?.quantity || 0), 0);
  const lowStock = lowStockLabel(stock, v?.madeToOrder);
  return (
    <article className="product-card">
      <Link prefetch={false} href={'/products/' + p.slug} className="product-picture">
        <Image
          src={p.images[0]?.url || '/images/tote.webp'}
          alt={p.images[0]?.alt || 'Illustrative concept sample'}
          fill
          sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
        />
        <span className="product-tag">
          {stock === 0
            ? 'Sold out'
            : v?.madeToOrder
              ? 'Made to order'
              : p.featured
                ? 'THE SIGNATURE EDIT'
                : 'CONCEPT SAMPLE'}
        </span>
        <span className="product-arrow">
          <ArrowUpRight size={20} />
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
      <p className="small muted">
        {p.material} · {v?.color}
      </p>
      <div className="swatches" aria-label={'Available colours for ' + p.name}>
        {p.variants.map((v) => (
          <span
            key={v.id}
            style={{ backgroundColor: v.colorHex }}
            title={v.color}
            aria-label={v.color}
            role="img"
          />
        ))}
        <span className={'stock-label' + (lowStock ? ' low-stock-badge' : '')}>
          {lowStock || availability(stock, v?.madeToOrder)}
        </span>
      </div>
      <QuickAdd variantId={v?.id} disabled={stock === 0} />
    </article>
  );
}
