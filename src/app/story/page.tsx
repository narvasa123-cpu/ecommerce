import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'The ORVEN approach' };
export default function Story() {
  return (
    <div className="page-container">
      <div className="service-page">
        <div className="page-heading">
          <p className="eyebrow">THE ORVEN APPROACH</p>
          <h1>Good things take consideration.</h1>
          <p>
            A quieter approach to the things we carry. A little less noise, a little more purpose.
          </p>
        </div>
      </div>
      <div className="story-page-hero">
        <Image
          src="/images/hero.webp"
          alt="AI-generated ORVEN campaign concept, leather and limestone in soft natural light"
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
        />
      </div>
      <article className="service-page prose">
        <h2>A place in your everyday.</h2>
        <p>
          ORVEN began as an idea: that the objects around us should earn their place. Not through a
          louder statement, but through proportion, usefulness and the simple pleasure of something
          well considered.
        </p>
        <p>
          We look to familiar rituals. Leaving home with only what you need. Finding your keys
          without looking. Setting your bag beside a friend’s chair. Our collection is an
          exploration of those small, meaningful moments.
        </p>
        <h2>A language of honest materials.</h2>
        <p>
          Our proposed design language pairs tactile leather with cotton linings, hand-finished
          edges and restrained brass details. We favour forms that are clear from a distance and
          reward a closer look. Origin and craftsmanship claims in this concept catalogue are
          illustrative, pending verification with actual makers.
        </p>
        <h2>Fewer pieces. More meaning.</h2>
        <p>
          The Everyday, The City, and Small Rituals describe different ways of moving through life.
          They share one intention: to feel useful today, and familiar tomorrow.
        </p>
        <Link className="underlink" href="/collections">
          Discover the collection
        </Link>
        <p className="sample-note align-left">
          ORVEN is an original fictional identity created for this application. All imagery is
          AI-generated; no real manufacturing or heritage claims are made.
        </p>
      </article>
    </div>
  );
}
