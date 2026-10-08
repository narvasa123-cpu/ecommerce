import Link from 'next/link';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { productInclude } from '@/lib/catalog';
import { ProductDetail } from '@/components/product-detail';
import { ProductCard } from '@/components/product-card';
import { appUrl } from '@/lib/security';
import { phpAmount } from '@/lib/pricing';
import { salePrice } from '@/lib/commerce-tools';
import { ReviewForm } from '@/components/customer-tools';
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
      priceCurrency: 'PHP',
      price: phpAmount(salePrice(p)),
      availability: 'https://schema.org/' + (stock ? 'InStock' : 'OutOfStock'),
      url: appUrl() + '/products/' + p.slug,
    },
  };
  const reviewWhere = { productId: p.id };
  const [reviews, reviewCount, ratingStats] = await Promise.all([
    db.review.findMany({
      where: reviewWhere,
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { name: true } },
        order: { select: { payment: { select: { provider: true } } } },
      },
    }),
    db.review.count({ where: reviewWhere }),
    db.review.aggregate({ where: reviewWhere, _avg: { rating: true } }),
  ]);
  const averageRating = ratingStats._avg.rating;
  const roundedAverage = Math.round(averageRating || 0);
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
        <section className="product-reviews" aria-labelledby="reviews-title">
          <div className="review-heading">
            <div>
              <p className="eyebrow">PUBLIC CUSTOMER REVIEWS</p>
              <h2 id="reviews-title">Reviews and ratings.</h2>
              <p className="muted">Everyone can read customer comments and ratings.</p>
            </div>
            {reviewCount > 0 && averageRating !== null && (
              <div className="review-summary">
                <span className="review-stars" role="img" aria-label={`Average rating ${averageRating.toFixed(1)} out of 5`}>
                  {String.fromCharCode(9733).repeat(roundedAverage)}{String.fromCharCode(9734).repeat(5 - roundedAverage)}
                </span>
                <strong>{averageRating.toFixed(1)} / 5</strong>
                <span className="muted">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
              </div>
            )}
          </div>
          {reviews.length ? (
            <>
              {reviews.map((r) => (
                <article className="review-card" key={r.id}>
                  <strong>{r.user.name.split(' ')[0]}</strong>
                  <div className="review-meta">
                    <span className="review-stars" role="img" aria-label={`${r.rating} out of 5 stars`}>
                      {String.fromCharCode(9733).repeat(r.rating)}{String.fromCharCode(9734).repeat(5 - r.rating)}
                    </span>
                    <span>{r.rating}/5</span>
                    <span className="muted">Verified {r.order.payment?.provider === 'sandbox' ? 'simulated' : 'test'} purchase</span>
                  </div>
                  <p>{r.body}</p>
                  <time dateTime={r.createdAt.toISOString()} className="small muted">
                    {r.createdAt.toLocaleDateString('en-PH')}
                  </time>
                </article>
              ))}
              {reviewCount > reviews.length && (
                <p className="small muted">Showing the latest {reviews.length} of {reviewCount} reviews.</p>
              )}
            </>
          ) : (
            <p className="muted">No reviews yet. Be the first to share your experience after a delivered purchase.</p>
          )}
          <ReviewForm productId={p.id} />
        </section>
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
