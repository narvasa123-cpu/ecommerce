import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { catalogCacheTag } from '@/lib/catalog';
import { cookies } from 'next/headers';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCart } from '@/lib/cart';
import { priceOrder } from '@/lib/pricing';
import { salePrice } from '@/lib/commerce-tools';
import { customerToolsGet, customerToolsPost } from '@/lib/customer-tools';
import { priceDropNotifications, saveUndo, undoStaffAction } from '@/lib/staff-tools';
import { transactionLock } from '@/lib/transaction-lock';
import {
  HttpError,
  csrfGuard,
  rateLimit,
  currentUser,
  requireUser,
  requireAdmin,
  createSession,
  cartId,
  token,
  digest,
  appUrl,
  cookieOptions,
} from '@/lib/security';
import {
  reserveOrder,
  sandboxMode,
  releaseExpired,
  confirmPayment,
  stripeCheckout,
  cancelOrder,
  stripeClient,
} from '@/lib/orders';
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128);
const addressSchema = z.object({
  name: z.string().trim().min(2).max(100),
  line1: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(100),
  region: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(3).max(20),
  country: z.enum(['PH', 'US', 'FR', 'DE', 'NL', 'IE']),
});
const localImage = z
  .string()
  .regex(/^\/images\/[a-zA-Z0-9_-]+\.(webp|png|jpg|svg)$/, 'Use a local file from /images/.');
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(100),
  description: z.string().min(10).max(4000),
  material: z.string().min(2).max(100),
  craftsmanship: z.string().min(5).max(2000),
  dimensions: z.string().min(2).max(100),
  origin: z.string().min(2).max(100),
  care: z.string().min(5).max(2000),
  category: z.string().min(2).max(100),
  price: z.number().int().min(100).max(10000000),
  salePercent: z.number().int().min(0).max(90).default(0),
  collectionId: z.string(),
  featured: z.boolean(),
  active: z.boolean(),
  seoTitle: z.string().max(150),
  seoDescription: z.string().max(300),
  images: z
    .array(z.object({ url: localImage, alt: z.string().min(5).max(200) }))
    .min(1)
    .max(8),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        sku: z.string().min(2).max(100),
        color: z.string().min(2).max(80),
        colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        size: z.string().min(1).max(80),
        madeToOrder: z.boolean(),
      }),
    )
    .min(1)
    .max(30),
});
type Context = { params: Promise<{ path: string[] }> };
function errorResponse(e: unknown) {
  if (e instanceof z.ZodError)
    return NextResponse.json(
      { error: e.issues.map((i) => (i.path.join('.') || 'Input') + ': ' + i.message).join(' ') },
      { status: 400 },
    );
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json(
    { error: 'We could not complete that request. Check your details and try again.' },
    { status: 400 },
  );
}
export async function GET(request: Request, context: Context) {
  try {
    const path = (await context.params).path.join('/');
    if (path.startsWith('features/'))
      return NextResponse.json(await customerToolsGet(path, request), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    if (path === 'cart') {
      const u = new URL(request.url);
      return NextResponse.json(
        await getCart(
          u.searchParams.get('country') || 'PH',
          u.searchParams.get('delivery') || 'standard',
        ),
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (path === 'me') return NextResponse.json({ user: await currentUser() });
    throw new HttpError('Not found.', 404);
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    await csrfGuard(request);
    const path = (await context.params).path.join('/');
    if (Number(request.headers.get('content-length') || 0) > 64000)
      throw new HttpError('Request is too large.', 413);
    const rawBody = await request.text();
    if (rawBody.length > 64000) throw new HttpError('Request is too large.', 413);
    const body = JSON.parse(rawBody);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new HttpError('Expected a request object.');
    const sessionBucket = digest((await cookies()).get('orven_csrf')?.value || '');
    if (path.startsWith('features/')) {
      await rateLimit('features:' + sessionBucket, 30);
      const result = await customerToolsPost(path, body);
      revalidatePath('/account');
      return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (path === 'admin/undo') {
      const result = await undoStaffAction(body);
      revalidatePath('/');
      return NextResponse.json(result);
    }
    if (path.startsWith('auth/')) {
      // Persistent aggregate and per-identifier limits. Do not trust client-supplied IP headers.
      await rateLimit('auth:global', 100, 60000);
      await rateLimit('auth:session:' + sessionBucket, 10, 60000);
      if (typeof body.email === 'string')
        await rateLimit('auth:email:' + digest(body.email.toLowerCase()), 8, 60000);
    }
    if (path === 'auth/login') {
      const data = z.object({ email: emailSchema, password: z.string().max(128) }).parse(body);
      const user = await db.user.findUnique({ where: { email: data.email } });
      const valid = await compare(
        data.password,
        user?.passwordHash || '$2b$12$kJhHWNI8cUZOd1KIJOt94eZI8aH6bkMFc4RwtiMAfxRgl1HR.wSyW',
      );
      if (!user || !valid)
        throw new HttpError('The email or password was not recognised. Please try again.', 401);
      await createSession(user.id);
      return NextResponse.json({ ok: true, role: user.role });
    }
    if (path === 'auth/register') {
      const data = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: emailSchema,
          password: passwordSchema,
        })
        .parse(body);
      if (await db.user.findUnique({ where: { email: data.email } }))
        throw new HttpError(
          'We could not create this account. Try signing in or resetting your password.',
        );
      const user = await db.user.create({
        data: { name: data.name, email: data.email, passwordHash: await hash(data.password, 12) },
      });
      await createSession(user.id);
      return NextResponse.json({ ok: true });
    }
    if (path === 'auth/logout') {
      const raw = (await cookies()).get('orven_session')?.value;
      if (raw) await db.session.deleteMany({ where: { id: digest(raw) } });
      (await cookies()).set('orven_session', '', { ...cookieOptions, maxAge: 0 });
      return NextResponse.json({ ok: true });
    }
    if (path === 'auth/forgot') {
      const email = emailSchema.parse(body.email);
      const user = await db.user.findUnique({ where: { email } });
      const raw = token();
      if (user) {
        await db.passwordReset.create({
          data: { id: digest(raw), userId: user.id, expiresAt: new Date(Date.now() + 30 * 60000) },
        });
        console.info(
          `[DEV RESET EMAIL] To: ${email}\nReset: ${appUrl()}/account/reset?token=${raw}\nExpires in 30 minutes.`,
        );
      }
      return NextResponse.json({
        ok: true,
        message:
          'If an account matches this address, a reset link has been sent to the development mailer.',
      });
    }
    if (path === 'auth/reset') {
      const data = z.object({ token: z.string().length(64), password: passwordSchema }).parse(body);
      const passwordHash = await hash(data.password, 12);
      await db.$transaction(async (tx) => {
        const reset = await tx.passwordReset.findUnique({ where: { id: digest(data.token) } });
        if (!reset || reset.expiresAt <= new Date())
          throw new HttpError('This reset link has expired. Request a new one.');
        await tx.passwordReset.delete({ where: { id: reset.id } });
        await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
        await tx.passwordReset.deleteMany({ where: { userId: reset.userId } });
        await tx.session.deleteMany({ where: { userId: reset.userId } });
      });
      return NextResponse.json({ ok: true });
    }
    if (path === 'cart/item' || path === 'cart/promo') {
      const id = await cartId(true);
      if (!id) throw new HttpError('Cookie required.');
      await releaseExpired(id);
      if (path === 'cart/promo') {
        await rateLimit('promo:global', 200);
        await rateLimit('promo:' + sessionBucket, 10);
      }
      await db.$transaction(async (tx) => {
        if (await tx.order.findFirst({ where: { cartId: id, status: 'PENDING' } }))
          throw new HttpError(
            'Your bag is reserved for payment. Resume or cancel checkout before editing.',
            409,
          );
        await tx.cart.upsert({ where: { id }, create: { id }, update: {} });
        if (path === 'cart/item') {
          const data = z
            .object({
              variantId: z.string(),
              quantity: z.number().int().min(0).max(10),
              mode: z.enum(['set', 'add']).default('set'),
            })
            .parse(body);
          const variant = await tx.variant.findUnique({
            where: { id: data.variantId },
            include: { inventory: true, product: true },
          });
          if (!variant?.product.active)
            throw new HttpError('This piece is no longer available. See similar pieces.');
          const current = await tx.cartItem.findUnique({
            where: { cartId_variantId: { cartId: id, variantId: data.variantId } },
          });
          const quantity =
            data.mode === 'add' ? (current?.quantity || 0) + data.quantity : data.quantity;
          if (quantity > 10 || quantity > (variant.inventory?.quantity || 0))
            throw new HttpError('That quantity is unavailable. Choose fewer pieces.');
          if (quantity === 0)
            await tx.cartItem.deleteMany({ where: { cartId: id, variantId: data.variantId } });
          else
            await tx.cartItem.upsert({
              where: { cartId_variantId: { cartId: id, variantId: data.variantId } },
              create: { cartId: id, variantId: data.variantId, quantity },
              update: { quantity },
            });
        } else {
          const code = z.string().trim().toUpperCase().max(30).parse(body.code);
          if (code) {
            const promo = await tx.promotion.findUnique({ where: { code } });
            if (!promo) throw new HttpError('This code is not available. Check it and try again.');
            const items = await tx.cartItem.findMany({
              where: { cartId: id },
              include: { variant: { include: { product: true } } },
            });
            priceOrder(
              items.map((i) => ({ price: salePrice(i.variant.product), quantity: i.quantity })),
              'PH',
              'standard',
              promo,
            );
          }
          await tx.cart.update({ where: { id }, data: { promotionCode: code || null } });
        }
        if (path === 'cart/item') {
          await tx.auditLog.create({
            data: {
              actorId: 'storefront',
              action: 'CART_ACTIVITY',
              entityId: id,
              detail: 'Cart selection updated',
            },
          });
        }
      });
      return NextResponse.json(await getCart());
    }
    if (path === 'checkout') {
      await rateLimit('checkout:' + sessionBucket, 20);
      const data = z
        .object({
          key: z.string().uuid(),
          email: emailSchema,
          address: addressSchema,
          delivery: z.enum(['standard', 'express']),
        })
        .parse(body);
      const id = await cartId();
      if (!id) throw new HttpError('Your bag is empty.');
      const user = await currentUser();
      const order = await reserveOrder({
        cartId: id,
        key: data.key,
        email: data.email,
        address: data.address,
        delivery: data.delivery,
        userId: user?.id,
      });
      revalidatePath('/');
      if (order.status === 'CANCELLED')
        throw new HttpError('This checkout has expired. Refresh the page to start again.', 409);
      if (order.status !== 'PENDING')
        return NextResponse.json({
          token: order.accessToken,
          sandbox: order.payment?.provider === 'sandbox',
        });
      if (sandboxMode()) return NextResponse.json({ token: order.accessToken, sandbox: true });
      try {
        return NextResponse.json({
          token: order.accessToken,
          url: await stripeCheckout(order),
          sandbox: false,
        });
      } catch (e) {
        await cancelOrder(order.id, 'Payment session could not be created');
        throw e;
      }
    }
    if (path === 'checkout/confirm' || path === 'checkout/cancel' || path === 'checkout/resume') {
      const access = z.string().length(64).parse(body.token);
      const order = await db.order.findUnique({
        where: { accessToken: access },
        include: { payment: true },
      });
      if (!order || order.cartId !== (await cartId()))
        throw new HttpError('Order not found in this session.', 404);
      if (path === 'checkout/resume') {
        if (
          order.status !== 'PENDING' ||
          order.payment?.provider !== 'stripe' ||
          !order.payment.providerId
        )
          throw new HttpError(
            'This payment is no longer pending. View the order for its latest status.',
            409,
          );
        const session = await stripeClient().checkout.sessions.retrieve(order.payment.providerId);
        if (session.status !== 'open' || !session.url)
          throw new HttpError(
            'This payment session has ended. View the order or cancel the reservation.',
            409,
          );
        return NextResponse.json({ url: session.url });
      }
      if (path === 'checkout/cancel') {
        await cancelOrder(order.id, 'Customer cancelled payment');
        revalidatePath('/');
        return NextResponse.json({ ok: true });
      }
      if (!sandboxMode() || order.payment?.provider !== 'sandbox')
        throw new HttpError('Provider confirmation is required.', 403);
      await confirmPayment(order.id, 'sandbox-' + order.id, order.total, 'sandbox');
      revalidatePath('/');
      return NextResponse.json({ token: order.accessToken });
    }
    if (path === 'account/profile') {
      const user = await requireUser();
      const name = z.string().trim().min(2).max(100).parse(body.name);
      const phone = z
        .string()
        .trim()
        .max(32)
        .regex(/^[+()\d\s.-]*$/, 'Use a valid phone number.')
        .refine((value) => !value || (value.match(/\d/g)?.length ?? 0) >= 7, {
          message: 'Enter at least 7 digits.',
        })
        .transform((value) => value || null)
        .parse(body.phone ?? '');
      await db.user.update({ where: { id: user.id }, data: { name, phone } });
      return NextResponse.json({ ok: true });
    }
    if (path === 'account/address') {
      const user = await requireUser();
      if (body.remove) {
        const id = z.string().parse(body.id);
        await db.address.deleteMany({ where: { id, userId: user.id } });
      } else {
        const data = addressSchema.parse(body);
        await db.address.create({ data: { ...data, userId: user.id } });
      }
      return NextResponse.json({ ok: true });
    }
    if (path === 'newsletter') {
      await rateLimit('newsletter:global', 50);
      await rateLimit('newsletter:' + sessionBucket, 5);
      const email = emailSchema.parse(body.email);
      await db.newsletter.upsert({ where: { email }, update: {}, create: { email } });
      return NextResponse.json({
        message: 'You’re on the list. A quieter kind of correspondence.',
      });
    }
    if (path === 'contact') {
      await rateLimit('contact:global', 50);
      await rateLimit('contact:' + sessionBucket, 5);
      const data = z
        .object({
          name: z.string().min(2).max(100),
          email: emailSchema,
          message: z.string().min(10).max(4000),
        })
        .parse(body);
      await db.supportMessage.create({ data });
      return NextResponse.json({
        message: 'Your note has been received by our development inbox.',
      });
    }
    if (path.startsWith('admin/')) {
      const admin = await requireAdmin();
      let undoId: string | undefined;
      if (path === 'admin/inventory') {
        const data = z
          .object({
            variantId: z.string(),
            delta: z
              .number()
              .int()
              .min(-1000)
              .max(1000)
              .refine((v) => v !== 0),
            reason: z.string().trim().min(5).max(300),
          })
          .parse(body);
        await db.$transaction(async (tx) => {
          await transactionLock(tx, `inventory:${data.variantId}`);
          const inv = await tx.inventory.findUniqueOrThrow({
            where: { variantId: data.variantId },
          });
          if (inv.quantity + data.delta < 0)
            throw new HttpError('Inventory cannot become negative.');
          await tx.inventory.update({
            where: { variantId: data.variantId },
            data: { quantity: { increment: data.delta } },
          });
          const movement = await tx.stockMovement.create({ data });
          undoId = (
            await saveUndo(
              tx,
              admin.id,
              'INVENTORY',
              data.variantId,
              { quantity: inv.quantity },
              { quantity: inv.quantity + data.delta, movementId: movement.id },
            )
          ).id;
          await tx.auditLog.create({
            data: {
              actorId: admin.id,
              action: 'INVENTORY_ADJUSTED',
              entityId: data.variantId,
              detail: JSON.stringify(data),
            },
          });
        });
      } else if (path === 'admin/order') {
        const data = z
          .object({
            id: z.string(),
            status: z.enum(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']),
            notes: z.string().max(2000),
            carrier: z.string().max(100),
            trackingNumber: z.string().max(100),
          })
          .parse(body);
        await db.$transaction(async (tx) => {
          const order = await tx.order.findUniqueOrThrow({
            where: { id: data.id },
            include: { payment: true },
          });
          if (order.payment?.status !== 'PAID')
            throw new HttpError('Unpaid or cancelled orders cannot be fulfilled.');
          const transitions: Record<string, string[]> = {
            PAID: ['PAID', 'PROCESSING', 'SHIPPED'],
            PROCESSING: ['PROCESSING', 'SHIPPED'],
            SHIPPED: ['SHIPPED', 'DELIVERED'],
            DELIVERED: ['DELIVERED'],
          };
          if (!transitions[order.status]?.includes(data.status))
            throw new HttpError('This status change is not available.');
          if (
            ['SHIPPED', 'DELIVERED'].includes(data.status) &&
            (!data.carrier || !data.trackingNumber)
          )
            throw new HttpError('Carrier and tracking number are required.');
          await tx.order.update({
            where: { id: data.id },
            data: { status: data.status, notes: data.notes },
          });
          if (data.trackingNumber)
            await tx.shipment.upsert({
              where: { orderId: data.id },
              create: {
                orderId: data.id,
                carrier: data.carrier,
                trackingNumber: data.trackingNumber,
              },
              update: { carrier: data.carrier, trackingNumber: data.trackingNumber },
            });
          await tx.auditLog.create({
            data: {
              actorId: admin.id,
              action: 'ORDER_UPDATED',
              entityId: data.id,
              detail: order.status + ' → ' + data.status + '; ' + data.notes,
            },
          });
        });
      } else if (path === 'admin/customer') {
        const data = z
          .object({ id: z.string(), name: z.string().trim().min(2).max(100) })
          .parse(body);
        await db.$transaction(async (tx) => {
          await tx.user.update({ where: { id: data.id }, data: { name: data.name } });
          await tx.auditLog.create({
            data: {
              actorId: admin.id,
              action: 'CUSTOMER_UPDATED',
              entityId: data.id,
              detail: 'Updated display name',
            },
          });
        });
      } else if (path === 'admin/product') {
        const { id, images, variants, ...data } = productSchema.parse(body);
        await db.$transaction(async (tx) => {
          if (id) await transactionLock(tx, `product:${id}`);
          const previous = id ? await tx.product.findUniqueOrThrow({ where: { id } }) : null;
          const p = id
            ? await tx.product.update({ where: { id }, data })
            : await tx.product.create({ data });
          if (previous && (previous.price !== p.price || previous.salePercent !== p.salePercent)) {
            undoId = (
              await saveUndo(
                tx,
                admin.id,
                'PRODUCT_PRICE',
                p.id,
                { price: previous.price, salePercent: previous.salePercent },
                { price: p.price, salePercent: p.salePercent },
              )
            ).id;
            await priceDropNotifications(tx, p, salePrice(previous));
          }
          await tx.image.deleteMany({ where: { productId: p.id } });
          await tx.image.createMany({
            data: images.map((img, position) => ({ ...img, position, productId: p.id })),
          });
          for (const v of variants) {
            const { id: vid, ...vdata } = v;
            if (vid) {
              const found = await tx.variant.findFirst({ where: { id: vid, productId: p.id } });
              if (!found) throw new HttpError('Variant does not belong to this product.');
              await tx.variant.update({ where: { id: vid }, data: vdata });
            } else
              await tx.variant.create({
                data: { ...vdata, productId: p.id, inventory: { create: { quantity: 0 } } },
              });
          }
          await tx.auditLog.create({
            data: {
              actorId: admin.id,
              action: 'PRODUCT_SAVED',
              entityId: p.id,
              detail: JSON.stringify({
                name: p.name,
                before: previous
                  ? { price: previous.price, salePercent: previous.salePercent }
                  : null,
                after: { price: p.price, salePercent: p.salePercent },
              }),
            },
          });
        });
      } else if (path === 'admin/collection') {
        const { id, ...data } = z
          .object({
            id: z.string().optional(),
            slug: z.string().regex(/^[a-z0-9-]+$/),
            name: z.string().min(2).max(100),
            description: z.string().min(5).max(1000),
            image: localImage,
          })
          .parse(body);
        if (id) await db.collection.update({ where: { id }, data });
        else await db.collection.create({ data });
      } else if (path === 'admin/promotion') {
        const { id, expiresAt, ...data } = z
          .object({
            id: z.string().optional(),
            code: z
              .string()
              .regex(/^[A-Z0-9-]+$/)
              .max(30),
            kind: z.enum(['PERCENT', 'FIXED']),
            value: z.number().int().min(1).max(100000),
            minimum: z.number().int().min(0),
            expiresAt: z.string().datetime(),
            usageLimit: z.number().int().min(1).max(100000),
            active: z.boolean(),
          })
          .parse(body);
        if (data.kind === 'PERCENT' && data.value > 100)
          throw new HttpError('Percentage must be at most 100.');
        if (id)
          await db.promotion.update({
            where: { id },
            data: { ...data, expiresAt: new Date(expiresAt) },
          });
        else await db.promotion.create({ data: { ...data, expiresAt: new Date(expiresAt) } });
      } else throw new HttpError('Not found.', 404);
      revalidatePath('/');
      revalidatePath('/sitemap.xml');
      if (path === 'admin/collection') revalidateTag(catalogCacheTag, { expire: 0 });
      return NextResponse.json({ ok: true, undoId });
    }
    throw new HttpError('Not found.', 404);
  } catch (e) {
    return errorResponse(e);
  }
}
