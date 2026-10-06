import Link from 'next/link';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { productInclude } from '@/lib/catalog';
import { ProductDetail } from '@/components/product-detail';
import { ProductCard } from '@/components/product-card';
import { appUrl } from '@/lib/security';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
const loadProduct = cache((slug: string) =>
  db.product.findUnique({ where: { slug }, include: productInclude }),
);
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await loadProduct((await params).slug);
  return p
    ? {
        title: { absolute: p.seoTitle || p.name + ' | ORVEN' },
        description: p.seoDescription || p.description,
        openGraph: { images: p.images.map((i) => ({ url: i.url, alt: i.alt })) },
      }
    : { title: 'Piece unavailable' };
}
export default async function ProductPage({ params }: Props) {
  const p = await loadProduct((await params).slug);
  if (!p?.active) notFound();
  const related = await db.product.findMany({
    where: { active: true, collectionId: p.collectionId, id: { not: p.id } },
    include: productInclude,
    take: 4,
  });
  const stock = p.variants.reduce((s, v) => s + (v.inventory?.quantity || 0), 0);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name + ' (fictional concept)',
    description: p.description + ' Fictional sample product; no actual merchandise.',
    image: p.images.map((i) => appUrl() + i.url),
    brand: { '@type': 'Brand', name: 'ORVEN' },
    sku: p.variants[0]?.sku,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: (p.price / 100).toFixed(2),
      availability: 'https://schema.org/' + (stock ? 'InStock' : 'OutOfStock'),
      url: appUrl() + '/products/' + p.slug,
    },
  };
  return (
    <>
      <div className="page-container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }}
        />
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/collections">The collection</Link>
          <span>/</span>
          <span>{p.name}</span>
        </div>
        <ProductDetail product={p} />
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">IN GOOD COMPANY</p>
            <h2>A few considered companions.</h2>
          </div>
        </div>
        <div className="product-grid">
          {related.map((r) => (
            <ProductCard product={r} key={r.id} />
          ))}
        </div>
      </section>
    </>
  );
}
