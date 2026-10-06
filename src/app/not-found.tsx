import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="page-container empty-state">
      <p className="eyebrow">A DIFFERENT DIRECTION</p>
      <h1>This piece is no longer here.</h1>
      <p>The page may have moved, or the piece is unavailable. There is more to discover.</p>
      <Link href="/collections" className="button">
        See similar pieces
      </Link>
    </div>
  );
}
