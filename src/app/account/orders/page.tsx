import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/security';
import { db } from '@/lib/db';
import { money } from '@/lib/pricing';
import { orderStage, orderStages } from '@/lib/commerce-tools';
import { CopyReference, Reorder, CustomerHubLinks } from '@/components/customer-tools';
export const metadata = { title: 'Your orders', robots: { index: false, follow: false } };
export default async function Orders() {
  const user = await currentUser(); if (!user) redirect('/account?next=/account/orders');
  const orders = await db.order.findMany({ where: { userId: user.id }, include: { payment: true, items: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  return <div className="page-container"><div className="page-heading"><p className="eyebrow">YOUR PIECES, IN PROGRESS</p><h1>Your order journal.</h1><p>Track your selection or choose it again. Reorders use current prices and available stock.</p></div><CustomerHubLinks />{orders.length ? <div className="notification-list">{orders.map(o => <article className="notification-card" key={o.id}><div className="row"><h2><Link href={'/orders/' + o.accessToken}>{o.number}</Link></h2><strong>{money(o.total)}</strong></div><p>{o.items.map(i => `${i.name} × ${i.quantity}`).join(', ')}</p><p className="small muted">{o.createdAt.toLocaleDateString('en-PH')} · {orderStages[orderStage(o.status)]?.label || o.status.toLowerCase()} · {o.payment?.provider === 'sandbox' ? 'Simulated purchase' : 'Test purchase'}</p><div className="customer-hub-links"><Link href={'/orders/' + o.accessToken}>View timeline</Link><CopyReference value={o.number} />{o.payment?.status === 'PAID' && <Reorder orderId={o.id} />}</div></article>)}</div> : <div className="empty-state"><h2>Your journal begins with your first piece.</h2><Link className="button" href="/collections">Explore the collection</Link></div>}</div>;
}
