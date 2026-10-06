import type { Metadata } from 'next';
import { Checkout } from '@/components/checkout';
import { currentUser } from '@/lib/security';
import { db } from '@/lib/db';
import { sandboxMode } from '@/lib/orders';
export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const u = await currentUser();
  const addresses = u ? await db.address.findMany({ where: { userId: u.id } }) : [];
  return (
    <Checkout
      sandbox={sandboxMode()}
      user={u ? { name: u.name, email: u.email, addresses } : null}
      resume={(await searchParams).resume}
    />
  );
}
