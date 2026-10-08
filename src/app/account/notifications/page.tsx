import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/security';
import { db } from '@/lib/db';
import { CustomerHubLinks, NotificationRead } from '@/components/customer-tools';
export const metadata = { title: 'Your notifications', robots: { index: false, follow: false } };
export default async function Notifications() {
  const user = await currentUser(); if (!user) redirect('/account?next=/account/notifications');
  const notifications = await db.customerNotification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  return <div className="page-container"><div className="page-heading"><p className="eyebrow">A NOTE FOR YOU</p><h1>Your price-drop alerts.</h1><p>In-app notifications for saved products. No email or browser push messages are sent.</p></div><CustomerHubLinks />{notifications.some(n => !n.readAt) && <NotificationRead />}{notifications.length ? <div className="notification-list">{notifications.map(n => <article className={'notification-card ' + (!n.readAt ? 'unread' : '')} key={n.id}><span className="eyebrow">{n.readAt ? 'READ' : 'NEW'}</span><h2>{n.title}</h2><p>{n.message}</p><p className="small muted">{n.createdAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p><div className="customer-hub-links"><Link href={n.href}>View current price</Link>{!n.readAt && <NotificationRead id={n.id} />}</div></article>)}</div> : <div className="empty-state"><h2>All quiet for now.</h2><p>Save a piece to receive an alert when its price drops.</p><Link href="/account/saved" className="underlink">Open your wishlist</Link></div>}</div>;
}
