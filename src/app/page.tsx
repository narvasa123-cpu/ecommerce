import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
const collections = [
  {
    slug: 'the-everyday',
    name: 'The Everyday',
    image: '/images/tote.webp',
    copy: 'Room for the daily essentials.',
  },
  {
    slug: 'moving-lightly',
    name: 'Moving Lightly',
    image: '/images/shoulder.webp',
    copy: 'A companion for moving lightly.',
  },
  {
    slug: 'small-pleasures',
    name: 'Small Pleasures',
    image: '/images/wallet.webp',
    copy: 'Small details. Lasting pleasure.',
  },
] as const;
const products = [
  {
    slug: 'the-forma-tote',
    name: 'The Forma Tote',
    price: '$485',
    image: '/images/tote.webp',
    material: 'Full-grain leather',
    colour: 'Cognac',
  },
  {
    slug: 'the-arc-shoulder',
    name: 'The Arc Shoulder',
    price: '$365',
    image: '/images/shoulder.webp',
    material: 'Pebbled leather',
    colour: 'Ink',
  },
  {
    slug: 'the-line-crossbody',
    name: 'The Line Crossbody',
    price: '$295',
    image: '/images/crossbody.webp',
    material: 'Full-grain leather',
    colour: 'Cognac',
  },
  {
    slug: 'the-fold-wallet',
    name: 'The Fold Wallet',
    price: '$185',
    image: '/images/wallet.webp',
    material: 'Full-grain leather',
    colour: 'Ink',
  },
] as const;
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">
              <span className="brass-line" /> THE ART OF EVERYDAY
            </p>
            <h1>
              Less, but
              <br />
              <em>better.</em>
            </h1>
            <p className="hero-description">
              Thoughtfully made leather goods.
              <br />
              For all the ways you move through life.
            </p>
            <Link prefetch={false} className="button" href="/collections">
              Discover the collection <ArrowRight size={17} />
            </Link>
          </div>
          <p className="hero-footnote">DESIGNED WITH INTENTION. CARRIED FOR YEARS.</p>
        </div>
        <div className="hero-image">
          <Image
            src="/images/hero.webp"
            alt="AI-generated concept of a cognac leather bag on limestone in afternoon light"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 760px) 100vw, 58vw"
          />
          <div className="hero-caption">
            <div>
              <span className="eyebrow">THE AUTUMN EDIT / 01</span>
              <p>A softer kind of structure.</p>
            </div>
            <span className="image-note">CONCEPT CAMPAIGN</span>
          </div>
        </div>
      </section>
      <div className="brand-ribbon">
        <span>Quiet by design.</span>
        <span className="ribbon-dot" />
        <span>Distinctive by nature.</span>
        <span className="ribbon-dot" />
        <span>Made for the everyday.</span>
      </div>
      <section className="section collections-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A PLACE FOR EVERYTHING</p>
            <h2>Made to accompany you.</h2>
          </div>
          <p>
            From the first light to the last train.
            <br />
            Considered pieces, wherever the day takes you.
          </p>
        </div>
        <div className="collection-grid">
          {collections.map((c, i) => (
            <Link
              prefetch={false}
              className="collection-card"
              href={'/collections?collection=' + c.slug}
              key={c.id}
            >
              <div className="collection-image">
                <Image
                  src={c.image}
                  alt={'Illustrative AI concept for ' + c.name}
                  fill
                  sizes="(max-width: 600px) 100vw, 33vw"
                />
                <span className="collection-number">0{i + 1}</span>
              </div>
              <div className="collection-label">
                <div>
                  <h3>{c.name}</h3>
                  <p>
                    {
                      [
                        'Room for the daily essentials.',
                        'A companion for moving lightly.',
                        'Small details. Lasting pleasure.',
                      ][i]
                    }
                  </p>
                </div>
                <ArrowUpRight size={23} strokeWidth={1.3} />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="section featured-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE SIGNATURE EDIT</p>
            <h2>Familiar, from the first day.</h2>
          </div>
          <Link prefetch={false} className="underlink" href="/collections">
            Explore all pieces <ArrowRight size={16} />
          </Link>
        </div>
        <div className="product-grid">
          {products.map((p) => (
            <article className="product-card" key={p.slug}>
              <Link prefetch={false} href={'/products/' + p.slug} className="product-picture">
                <Image
                  src={p.image}
                  alt={'Illustrative concept of ' + p.name}
                  fill
                  sizes="(max-width: 600px) 50vw, 25vw"
                />
                <span className="product-tag">THE SIGNATURE EDIT</span>
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
                <span>{p.price}</span>
              </div>
              <p className="small muted">
                {p.material} · {p.colour}
              </p>
            </article>
          ))}
        </div>
        <p className="sample-note align-left">
          Illustrative concept pieces · AI-generated sample imagery
        </p>
      </section>
      <section className="story-block">
        <div className="story-picture">
          <Image
            src="/images/hero.webp"
            alt="Illustrative campaign concept: leather, stone and linen in natural light"
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
          />
        </div>
        <div className="story-copy">
          <p className="eyebrow">THE ORVEN APPROACH</p>
          <h2>
            Good things
            <br />
            take <em>consideration.</em>
          </h2>
          <p>
            We believe the things you carry should earn their place. Through thoughtful proportions,
            honest materials, and details that make the everyday feel a little more intentional.
          </p>
          <p>Fewer pieces. More meaning.</p>
          <Link prefetch={false} href="/story" className="underlink">
            A closer look at our story <ArrowRight size={16} />
          </Link>
          <span className="story-mark" aria-hidden="true">
            O.
          </span>
        </div>
      </section>
      <section className="closing-note">
        <p className="eyebrow">OBJECTS FOR A CONSIDERED LIFE</p>
        <h2>
          Not for a season.
          <br />
          <em>For your everyday.</em>
        </h2>
        <Link prefetch={false} className="underlink" href="/collections">
          Find your companion <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}
