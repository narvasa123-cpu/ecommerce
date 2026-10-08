import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
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
          <p className="home-hero-note">ILLUSTRATIVE CONCEPT COLLECTION · PHP</p>
        </div>
        <div className="home-hero-image">
          <Image
            src="/images/hero.webp"
            alt="AI-generated concept image of a cognac handbag on sunlit limestone"
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 760px) 100vw, 64vw"
          />
          <span className="home-image-caption">THE EVERYDAY, CONSIDERED</span>
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
            {collections.slice(0, 3).map((collection, index) => (
              <Link
                className="home-collection-card"
                href={'/collections?collection=' + encodeURIComponent(collection.slug)}
                key={collection.id}
              >
                <span className="home-collection-image">
                  <Image
                    src={collection.image || '/images/hero.webp'}
                    alt={`Illustrative concept image for ${collection.name}`}
                    fill
                    sizes="(max-width: 680px) 100vw, 33vw"
                  />
                </span>
                <span className="home-collection-label">
                  <span className="eyebrow">0{index + 1} / THE COLLECTION</span>
                  <span className="home-collection-title">
                    {collection.name} <ArrowUpRight size={19} aria-hidden="true" />
                  </span>
                  <span className="home-collection-description">{collection.description}</span>
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
            <p className="eyebrow">THE SIGNATURE EDIT</p>
            <h2 id="featured-title">Considered essentials.</h2>
          </div>
          <Link className="underlink" href="/collections">
            View all pieces <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {products.length ? (
          <div className="product-grid home-product-grid">
            {products.map((product) => (
              <ProductCard product={product} key={product.id} />
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
        <p className="sample-note align-left home-disclosure">
          A fictional concept collection. Product details and AI-generated imagery are illustrative;
          no actual merchandise is offered.
        </p>
      </section>

      <section className="home-campaign" aria-labelledby="campaign-title">
        <Image
          src="/images/shoulder.webp"
          alt="AI-generated concept image of an ORVEN-style shoulder bag in warm natural light"
          fill
          sizes="100vw"
        />
        <div className="home-campaign-copy">
          <p className="eyebrow">A STUDY IN MOVEMENT</p>
          <h2 id="campaign-title">Designed to move with you.</h2>
          <p>
            From quiet mornings to unexpected journeys, discover pieces that belong wherever the day
            takes you.
          </p>
          <Link className="button button-light" href="/collections">
            Explore the edit <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <span className="home-campaign-note">AI-GENERATED CONCEPT IMAGERY</span>
      </section>

      <section className="home-story" aria-labelledby="story-title">
        <div className="home-story-image">
          <Image
            src="/images/wallet.webp"
            alt="Illustrative concept image of a leather small good against a warm stone backdrop"
            fill
            sizes="(max-width: 760px) 100vw, 34vw"
          />
        </div>
        <div className="home-story-copy">
          <p className="eyebrow">OUR STORY</p>
          <h2 id="story-title">The beauty of considered design.</h2>
          <p>
            Design begins with a quieter question: what earns a place in the things we carry every
            day? ORVEN is a fictional study in useful forms, warm materials and thoughtful details.
          </p>
          <Link className="underlink" href="/story">
            Discover our story <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="home-story-detail" aria-label="AI-generated close-up concept image">
          <Image
            src="/images/crossbody.webp"
            alt="Illustrative detail of a leather crossbody concept piece"
            fill
            sizes="(max-width: 760px) 100vw, 28vw"
          />
          <span>FORM / FUNCTION / FEELING</span>
        </div>
      </section>
    </div>
  );
}
