import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { getCollections, featuredProducts } from '@/lib/catalog';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'The art of everyday',
  description:
    'Explore the ORVEN concept collection: considered bags and small leather goods for the everyday.',
};

export default async function Home() {
  const [allCollections, collectionsWithProducts, products] = await Promise.all([
    getCollections(),
    db.product.findMany({
      where: { active: true },
      select: { collectionId: true },
      distinct: ['collectionId'],
    }),
    featuredProducts(),
  ]);
  const activeCollectionIds = new Set(
    collectionsWithProducts.map((product) => product.collectionId),
  );
  const collections = allCollections.filter((collection) => activeCollectionIds.has(collection.id));

  return (
    <div className="orven-home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <div>
            <p className="eyebrow">THE ART OF EVERYDAY</p>
            <h1 id="home-title">Less, but better.</h1>
            <p className="home-hero-description">
              Thoughtfully considered pieces for everything life carries.
            </p>
            <div className="home-hero-actions">
              <Link className="button" href="/collections">
                Explore the collection <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="underlink" href="/story">
                Discover ORVEN <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <div className="home-hero-image">
          <Image
            src="/images/editorial/hero.webp"
            alt="AI-generated concept image of a cognac handbag on sunlit limestone"
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
          />
        </div>
      </section>

      <section className="home-section home-collections" aria-labelledby="collections-title">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">EXPLORE</p>
            <h2 id="collections-title">Objects for the everyday.</h2>
          </div>
          <Link className="underlink" href="/collections">
            View all collections <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {collections.length ? (
          <div className="home-collection-grid">
            {collections.slice(0, 3).map((collection) => (
              <Link
                className="home-collection-card"
                href={'/collections?collection=' + encodeURIComponent(collection.slug)}
                key={collection.id}
              >
                <span className="home-collection-image">
                  <Image
                    src={
                      collection.slug === 'the-everyday'
                        ? '/images/editorial/everyday.webp'
                        : collection.slug === 'the-city'
                          ? '/images/editorial/campaign.webp'
                          : collection.slug === 'small-rituals'
                            ? '/images/editorial/rituals.webp'
                            : collection.image || '/images/hero.webp'
                    }
                    alt={`Illustrative concept image for ${collection.name}`}
                    fill
                    sizes="(max-width: 680px) 100vw, 33vw"
                  />
                </span>
                <span className="home-collection-label">
                  <span className="home-collection-title">{collection.name}</span>
                  <span className="home-collection-shop">
                    Shop now <ArrowRight size={13} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="home-empty-collection">
            <p>New pieces are being considered.</p>
            <Link className="underlink" href="/collections">
              Browse the collection <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <section className="home-section home-featured" aria-labelledby="featured-title">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">FEATURED</p>
            <h2 id="featured-title">Considered essentials.</h2>
          </div>
          <Link className="underlink" href="/collections">
            View all products <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {products.length ? (
          <div className="product-grid home-product-grid">
            {products.map((product) => (
              <ProductCard product={product} compact key={product.id} />
            ))}
          </div>
        ) : (
          <div className="home-empty-collection">
            <p>There are no featured pieces at the moment.</p>
            <Link className="underlink" href="/collections">
              Explore all pieces <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <section className="home-campaign" aria-labelledby="campaign-title">
        <Image
          src="/images/editorial/campaign.webp"
          alt="Illustrative campaign of a woman wearing an ivory blouse and carrying a cognac handbag"
          fill
          sizes="100vw"
        />
        <div className="home-campaign-copy">
          <h2 id="campaign-title">Designed to move with you.</h2>
          <p>
            From quiet mornings to unexpected journeys, discover pieces that belong wherever the day
            takes you.
          </p>
          <Link className="button button-light" href="/collections">
            Explore the edit <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="home-story" aria-labelledby="story-title">
        <div className="home-story-image">
          <Image
            src="/images/editorial/atelier.webp"
            alt="AI-generated illustration of hands stitching leather, a concept design study"
            fill
            sizes="(max-width: 760px) 100vw, 34vw"
          />
        </div>
        <div className="home-story-copy">
          <p className="eyebrow">OUR STORY</p>
          <h2 id="story-title">The beauty of considered design.</h2>
          <p>
            Thoughtful proportions, warm materials, and details that make the everyday feel a little
            more intentional. Explore the ideas behind the ORVEN concept collection.
          </p>
          <Link className="underlink" href="/story">
            Discover our story <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="home-story-detail" aria-label="AI-generated close-up concept image">
          <Image
            src="/images/editorial/leather.webp"
            alt="AI-generated concept of the ORVEN wordmark embossed in cognac leather"
            fill
            sizes="(max-width: 760px) 100vw, 28vw"
          />
        </div>
      </section>
    </div>
  );
}
