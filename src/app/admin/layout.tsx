import Link from 'next/link';
import { currentUser } from '@/lib/security';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/shell';
import type { Metadata } from 'next';
import './admin.css';
export const metadata: Metadata = {
  title: 'ORVEN administration',
  robots: { index: false, follow: false },
};
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/account');
  if (user.role !== 'ADMIN')
    return (
      <div className="page-container empty-state">
        <h1>Administrator access required.</h1>
        <Link className="button" href="/account">
          Return to your account
        </Link>
      </div>
    );
  const [pending, low] = await Promise.all([
    db.order.count({
      where: { status: { in: ['PAID', 'PROCESSING'] }, payment: { status: 'PAID' } },
    }),
    db.inventory.count({ where: { quantity: { lte: 3 }, variant: { product: { active: true } } } }),
  ]);
  return (
    <AdminShell name={user.name} pending={pending} low={low}>
      {children}
    </AdminShell>
  );
}
