import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import { db } from '@/lib/db';
import { productInclude } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
import { SearchSuggestions } from '@/components/customer-tools';
import type { Prisma } from '@prisma/client';
import { fromPhpAmount, phpAmount, money } from '@/lib/pricing';
export const metadata: Metadata = {
  title: 'The collection',
  description:
    'Explore considered totes, shoulder bags and small leather goods in the ORVEN concept collection.',
};
export const dynamic = 'force-dynamic';
export default async function Collections({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const collections = await db.collection.findMany();
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
  const count = await db.product.count({ where });
  const pages = Math.max(1, Math.ceil(count / 12));
  const rawPage = Number(query.page);
  const page = Math.min(pages, Math.max(1, Number.isFinite(rawPage) ? Math.floor(rawPage) : 1));
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === 'price-asc'
      ? { price: 'asc' }
      : query.sort === 'price-desc'
        ? { price: 'desc' }
        : query.sort === 'name'
          ? { name: 'asc' }
          : { createdAt: 'asc' };
  const products = await db.product.findMany({
    where,
    include: productInclude,
    orderBy,
    take: 12,
    skip: (page - 1) * 12,
  });
  const current = collections.find((c) => c.slug === query.collection);
  function pageLink(p: number) {
    const u = new URLSearchParams(
      Object.entries(query).filter((e): e is [string, string] => !!e[1]),
    );
    u.set('page', String(p));
    return '/collections?' + u.toString();
  }
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
          <h1>The collection.</h1>
          <p>
            Purposeful forms. Honest materials. Pieces that feel like yours, from the first day.
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
      <div className="page-heading">
        <h2>{current?.name || 'All pieces.'}</h2>
        <p>{current?.description || 'A considered edit for every way you move through life.'}</p>
      </div>
      <nav className="catalog-tabs" aria-label="Collections">
        <Link href="/collections" className={!query.collection ? 'active' : ''}>
          All pieces
        </Link>
        {collections.map((c) => (
          <Link
            key={c.id}
            href={'/collections?collection=' + c.slug}
            className={query.collection === c.slug ? 'active' : ''}
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
          Apply filters <Search size={15} />
        </button>
      </form>
      <div className="catalog-count collection-count">
        <span>
          {count} considered {count === 1 ? 'piece' : 'pieces'}
        </span>
        <Link className="text-button" href="/collections">
          Clear filters
        </Link>
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
          <p>No pieces match those details. Try a different material or clear the filters.</p>
          <Link className="button" href="/collections">
            See all pieces <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {pages > 1 && (
        <nav className="pagination" aria-label="Collection pages">
          {Array.from({ length: pages }, (_, i) => (
            <Link
              href={pageLink(i + 1)}
              key={i}
              className={page === i + 1 ? 'active' : ''}
              aria-current={page === i + 1 ? 'page' : undefined}
            >
              {i + 1}
            </Link>
          ))}
        </nav>
      )}
      <p className="sample-note">
        Fictional concept catalogue · All product imagery is AI-generated and illustrative
      </p>
    </div>
  );
}
