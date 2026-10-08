import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/security';
import { db } from '@/lib/db';
import { PieceList, CustomerHubLinks } from '@/components/customer-tools';
export const metadata = { title: 'Your wishlist', robots: { index: false, follow: false } };
export default async function Saved() {
  const user = await currentUser();
  if (!user) redirect('/account?next=/account/saved');
  const favorites = await db.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 200, include: { product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } } } });
  return <div className="page-container"><div className="page-heading"><p className="eyebrow">YOUR PERSONAL EDIT</p><h1>Saved for another day.</h1><p>Your wishlist follows your account. In-app alerts let you know when a saved piece gets cheaper.</p></div><CustomerHubLinks />{favorites.length ? <PieceList products={favorites.map(f => f.product)} /> : <div className="empty-state"><h2>A little room for inspiration.</h2><p>Use “Save for later” on any piece to start your wishlist.</p><Link className="button" href="/collections">Explore the collection</Link></div>}</div>;
}
