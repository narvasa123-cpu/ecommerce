'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-container empty-state">
      <p className="eyebrow">A MOMENT OF PAUSE</p>
      <h1>This page needs a little attention.</h1>
      <p>We couldn’t prepare this page. Please try again, or return to the collection.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <Link className="underlink" href="/collections">
        See the collection
      </Link>
    </div>
  );
}
