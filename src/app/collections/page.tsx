import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import { db } from '@/lib/db';
import { getCollections, productInclude } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
import { SearchSuggestions } from '@/components/customer-tools';
import type { Prisma } from '@prisma/client';
import { fromPhpAmount, phpAmount, money } from '@/lib/pricing';
export const metadata: Metadata = {
  title: 'The collection',
  description:
    'Explore considered totes, shoulder bags and small leather goods in the ORVEN concept collection.',
};
export default async function Collections({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const where: Prisma.ProductWhereInput = { active: true };
  if (query.q) where.OR = [{ name: { contains: query.q } }, { description: { contains: query.q } }];
  if (query.category)
    where.category = query.category === 'Bags' ? { not: 'Small leather goods' } : query.category;
  if (query.collection) where.collection = { slug: query.collection };
  if (query.material) where.material = query.material;
  const max = Number(query.max);
  if (max > 0 && Number.isFinite(max)) {
    const matches = await db.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "Product" WHERE ROUND("price"::numeric * (100 - "salePercent") / 100) <= ${fromPhpAmount(max)}`;
    where.id = { in: matches.map((p) => p.id) };
  }
  const rawPage = Number(query.page);
  const requestedPage = Math.max(
    1,
    Number.isFinite(rawPage) ? Math.min(100000, Math.floor(rawPage)) : 1,
  );
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === 'price-asc'
      ? { price: 'asc' }
      : query.sort === 'price-desc'
        ? { price: 'desc' }
        : query.sort === 'name'
          ? { name: 'asc' }
          : { createdAt: 'asc' };
  const list = (page: number) =>
    db.product.findMany({
      where,
      include: productInclude,
      orderBy,
      take: 12,
      skip: (page - 1) * 12,
    });
  const [collections, count, requestedProducts] = await Promise.all([
    getCollections(),
    db.product.count({ where }),
    list(requestedPage),
  ]);
  const pages = Math.max(1, Math.ceil(count / 12));
  const page = Math.min(pages, requestedPage);
  const products = page === requestedPage ? requestedProducts : await list(page);
  const current = collections.find((c) => c.slug === query.collection);
  const hasActiveFilters = Boolean(
    query.q || query.category || query.collection || query.material || query.max || query.sort,
  );
  const filterParams = () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value && key !== 'page' && key !== 'search') params.set(key, value);
    }
    return params;
  };
  function pageLink(p: number) {
    const u = filterParams();
    u.set('page', String(p));
    return '/collections?' + u.toString();
  }
  function collectionLink(slug?: string) {
    const u = filterParams();
    u.delete('collection');
    if (slug) u.set('collection', slug);
    const search = u.toString();
    return '/collections' + (search ? '?' + search : '');
  }
  const visiblePageCount = Math.min(5, pages);
  const firstVisiblePage = Math.min(Math.max(1, page - 2), pages - visiblePageCount + 1);
  const visiblePages = Array.from(
    { length: visiblePageCount },
    (_, index) => firstVisiblePage + index,
  );
  return (
    <div className="page-container">
      <section className="collection-hero">
        <div className="collection-hero-copy">
          <div className="breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>The collection</span>
          </div>
          <p className="eyebrow">CONSIDERED LEATHER GOODS</p>
          <h1>{current?.name || 'The collection.'}</h1>
          <p>
            {current?.description ||
              'Purposeful forms. Honest materials. Pieces that feel like yours, from the first day.'}
          </p>
        </div>
        <div className="collection-hero-image">
          <Image
            src="/images/shoulder.webp"
            alt="The Arc Shoulder in warm brown leather"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 48vw"
          />
        </div>
      </section>
      <nav className="catalog-tabs" aria-label="Collections">
        <Link
          href={collectionLink()}
          className={!query.collection ? 'active' : ''}
          aria-current={!query.collection ? 'page' : undefined}
        >
          All collections
        </Link>
        {collections.map((c) => (
          <Link
            key={c.id}
            href={collectionLink(c.slug)}
            className={query.collection === c.slug ? 'active' : ''}
            aria-current={query.collection === c.slug ? 'page' : undefined}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      <form className="filters collection-filters" action="/collections">
        {query.collection && <input type="hidden" name="collection" value={query.collection} />}
        <SearchSuggestions initial={query.q} autoFocus={query.search === '1'} />
        <label>
          Category
          <select name="category" defaultValue={query.category || ''}>
            <option value="">All categories</option>
            <option value="Bags">All bags</option>
            {['Totes', 'Shoulder bags', 'Crossbody bags', 'Small leather goods'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Material
          <select name="material" defaultValue={query.material || ''}>
            <option value="">All materials</option>
            {['Full-grain leather', 'Pebbled leather', 'Suede'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Maximum price
          <select name="max" defaultValue={query.max || ''}>
            <option value="">Any price</option>
            <option value={phpAmount(20000)}>Up to {money(20000)}</option>
            <option value={phpAmount(35000)}>Up to {money(35000)}</option>
            <option value={phpAmount(50000)}>Up to {money(50000)}</option>
          </select>
        </label>
        <label>
          Sort by
          <select name="sort" defaultValue={query.sort || ''}>
            <option value="">Our selection</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
        <button className="button secondary" type="submit">
          Show results <Search size={15} />
        </button>
      </form>
      <div className="catalog-count collection-count">
        <span role="status" aria-live="polite">
          {count} {count === 1 ? 'piece' : 'pieces'}
        </span>
        {hasActiveFilters && (
          <Link className="text-button" href="/collections">
            Clear filters
          </Link>
        )}
      </div>
      {products.length ? (
        <div className="product-grid catalog-grid">
          {products.map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>A quieter corner of the collection.</h2>
          <p>
            {hasActiveFilters
              ? 'Try widening your search or removing one of the filters.'
              : 'There are no pieces to show right now.'}
          </p>
          <Link className="button" href={hasActiveFilters ? '/collections' : '/'}>
            {hasActiveFilters ? 'Clear filters' : 'Return to ORVEN'} <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {pages > 1 && (
        <nav className="pagination" aria-label="Collection pages">
          {page > 1 && (
            <Link className="page-direction" href={pageLink(page - 1)} aria-label="Previous page">
              Previous
            </Link>
          )}
          {visiblePages.map((pageNumber) => (
            <Link
              href={pageLink(pageNumber)}
              key={pageNumber}
              className={'page-number' + (page === pageNumber ? ' active' : '')}
              aria-label={'Page ' + pageNumber}
              aria-current={page === pageNumber ? 'page' : undefined}
            >
              {pageNumber}
            </Link>
          ))}
          {page < pages && (
            <Link className="page-direction" href={pageLink(page + 1)} aria-label="Next page">
              Next
            </Link>
          )}
        </nav>
      )}
      <p className="sample-note catalog-disclosure">
        Fictional concept catalogue · All product imagery is AI-generated and illustrative
      </p>
    </div>
  );
}
