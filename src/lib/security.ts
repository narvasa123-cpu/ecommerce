import { cookies } from 'next/headers';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { db } from './db';
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const token = () => randomBytes(32).toString('hex');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const appUrl = () => process.env.APP_URL || 'http://localhost:3000';
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' && appUrl().startsWith('https:'),
  sameSite: 'lax' as const,
  path: '/',
};
export async function currentUser() {
  const raw = (await cookies()).get('orven_session')?.value;
  if (!raw) return null;
  const s = await db.session.findUnique({ where: { id: digest(raw) }, include: { user: true } });
  if (!s || s.expiresAt < new Date()) return null;
  const { passwordHash: _, ...user } = s.user;
  void _;
  return user;
}
export async function requireAdmin() {
  const u = await currentUser();
  if (!u || u.role !== 'ADMIN') throw new HttpError('Administrator access is required.', 403);
  return u;
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError('Please sign in to continue.', 401);
  return u;
}
export async function createSession(userId: string) {
  const raw = token();
  await db.session.create({
    data: { id: digest(raw), userId, expiresAt: new Date(Date.now() + 7 * 86400000) },
  });
  (await cookies()).set('orven_session', raw, { ...cookieOptions, maxAge: 7 * 86400 });
}
export async function cartId(create = false) {
  const jar = await cookies();
  let id = jar.get('orven_cart')?.value;
  if (!id && create) {
    id = token();
    jar.set('orven_cart', id, { ...cookieOptions, maxAge: 30 * 86400 });
  }
  return id;
}
export async function csrfGuard(request: Request) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(appUrl()).origin)
    throw new HttpError('Request origin was not accepted. Reload the page and try again.', 403);
  const supplied = request.headers.get('x-csrf-token') || '';
  const expected = (await cookies()).get('orven_csrf')?.value || '';
  if (
    !supplied ||
    !expected ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    throw new HttpError('Your session changed. Reload the page and try again.', 403);
}
export async function rateLimit(key: string, limit = 10, windowMs = 60000) {
  await db.$transaction(async (tx) => {
    const now = new Date();
    const row = await tx.rateLimit.findUnique({ where: { id: key } });
    if (!row || row.resetAt < now) {
      await tx.rateLimit.upsert({
        where: { id: key },
        update: { count: 1, resetAt: new Date(Date.now() + windowMs) },
        create: { id: key, count: 1, resetAt: new Date(Date.now() + windowMs) },
      });
      return;
    }
    if (row.count >= limit) throw new HttpError('Please wait a minute before trying again.', 429);
    await tx.rateLimit.update({ where: { id: key }, data: { count: { increment: 1 } } });
  });
}
