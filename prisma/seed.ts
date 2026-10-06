import { db } from '../src/lib/db';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
async function main() {
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_CUSTOMER_PASSWORD)
  )
    throw new Error('Set seed passwords explicitly in production.');
  const admin = await db.user.upsert({
    where: { email: 'admin@orven.test' },
    update: {},
    create: {
      email: 'admin@orven.test',
      name: 'ORVEN Atelier',
      role: 'ADMIN',
      passwordHash: await hash(process.env.SEED_ADMIN_PASSWORD || 'Atelier2026!demo', 12),
    },
  });
  const customer = await db.user.upsert({
    where: { email: 'customer@orven.test' },
    update: {},
    create: {
      email: 'customer@orven.test',
      name: 'Alex Morgan',
      passwordHash: await hash(process.env.SEED_CUSTOMER_PASSWORD || 'Orven2026!demo', 12),
    },
  });
  const collections = [
    {
      slug: 'the-everyday',
      name: 'The Everyday',
      description: 'Quiet companions. Considered for the rhythm of each day.',
      image: '/images/tote.webp',
    },
    {
      slug: 'the-city',
      name: 'The City',
      description: 'A little structure. A sense of possibility.',
      image: '/images/shoulder.webp',
    },
    {
      slug: 'small-rituals',
      name: 'Small Rituals',
      description: 'The small things, beautifully resolved.',
      image: '/images/wallet.webp',
    },
  ];
  for (const c of collections)
    await db.collection.upsert({ where: { slug: c.slug }, update: {}, create: c });
  const names = [
    'The Forma Tote',
    'The Arc Shoulder Bag',
    'The Linea Crossbody',
    'The Fold Wallet',
    'The Studio Tote',
    'The Élan Shoulder',
    'The Passage Bag',
    'The Slim Cardholder',
    'The Weekender',
    'The Soft Hobo',
    'The Mini Linea',
    'The Envelope',
    'The Market Tote',
    'The Frame Bag',
    'The Evening Pouch',
    'The Pocket Wallet',
    'The Carryall',
    'The Half Moon',
    'The Day Satchel',
    'The Travel Folio',
    'The Tall Tote',
  ];
  for (let i = 0; i < names.length; i++) {
    const kind = i % 4;
    const category = ['Totes', 'Shoulder bags', 'Crossbody bags', 'Small leather goods'][kind];
    const collection = await db.collection.findUniqueOrThrow({
      where: { slug: collections[kind === 0 ? 0 : kind === 3 ? 2 : 1].slug },
    });
    const slug = names[i]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replaceAll(' ', '-');
    const photo = ['tote', 'shoulder', 'crossbody', 'wallet'][kind];
    await db.product.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: names[i],
        description:
          'A study in balance and everyday ease. Clean lines meet a soft, tactile finish, with every detail serving a purpose. Designed to become familiar, and more individual with time.',
        material: i % 3 === 0 ? 'Full-grain leather' : i % 3 === 1 ? 'Pebbled leather' : 'Suede',
        craftsmanship:
          'Hand-finished edges, reinforced stitching and thoughtfully placed seams. The interior is lined with cotton twill. This is illustrative craftsmanship copy for a fictional concept product.',
        dimensions:
          kind === 3 ? '19 × 10 × 2 cm' : kind === 0 ? '36 × 28 × 14 cm' : '26 × 19 × 8 cm',
        origin: 'Italy — concept origin, unverified',
        care: 'Keep dry and away from direct heat. Clean gently with a soft cloth. Store in a dust bag when resting.',
        category,
        price: [48500, 39500, 28500, 14500][kind] + Math.floor(i / 4) * 2500,
        featured: i < 4,
        collectionId: collection.id,
        seoTitle: names[i] + ' | ORVEN',
        seoDescription: 'Discover ' + names[i] + ', a considered leather goods concept from ORVEN.',
        images: {
          create: [
            {
              url: '/images/' + photo + '.webp',
              alt: 'AI-generated concept sample of ' + names[i],
              position: 0,
            },
            {
              url: '/images/hero.webp',
              alt: 'AI-generated campaign concept; illustrative only',
              position: 1,
            },
          ],
        },
        variants: {
          create: [
            {
              sku: 'ORV-' + (i + 1) + '-COG',
              color:
                kind === 1 ? 'Espresso' : kind === 2 ? 'Sand' : kind === 3 ? 'Chocolate' : 'Cognac',
              colorHex: ['#965c37', '#35271f', '#b7a38a', '#493226'][kind],
              madeToOrder: i === 8,
              inventory: { create: { quantity: i === 6 ? 0 : i === 2 ? 2 : 12 } },
            },
            {
              sku: 'ORV-' + (i + 1) + '-INK',
              color: 'Ink',
              colorHex: '#252320',
              inventory: { create: { quantity: i === 6 ? 0 : 5 } },
            },
          ],
        },
      },
    });
  }
  for (const promo of [
    { code: 'WELCOME10', kind: 'PERCENT', value: 10, minimum: 20000 },
    { code: 'ATELIER25', kind: 'FIXED', value: 2500, minimum: 30000 },
  ])
    await db.promotion.upsert({
      where: { code: promo.code },
      update: {},
      create: { ...promo, expiresAt: new Date('2030-12-31'), usageLimit: 100 },
    });
  const product = await db.product.findFirstOrThrow({ include: { variants: true, images: true } });
  for (let i = 0; i < 3; i++) {
    const number = 'ORV-SAMPLE-00' + (i + 1);
    await db.order.upsert({
      where: { number },
      update: {},
      create: {
        number,
        idempotencyKey: 'seed-' + i,
        accessToken: randomUUID(),
        cartId: 'seed',
        userId: customer.id,
        email: customer.email,
        shippingAddress: JSON.stringify({
          name: customer.name,
          line1: '12 Sample Lane',
          city: 'New York',
          region: 'NY',
          postalCode: '10001',
          country: 'US',
        }),
        delivery: 'standard',
        status: i === 0 ? 'DELIVERED' : 'PAID',
        subtotal: product.price,
        discount: 0,
        shipping: 0,
        tax: Math.round(product.price * 0.08),
        total: Math.round(product.price * 1.08),
        createdAt: new Date(Date.now() - (i + 1) * 86400000 * 3),
        items: {
          create: {
            variantId: product.variants[0].id,
            name: product.name,
            variant: product.variants[0].color,
            image: product.images[0].url,
            unitPrice: product.price,
            quantity: 1,
          },
        },
        payment: {
          create: { provider: 'sandbox', status: 'PAID', amount: Math.round(product.price * 1.08) },
        },
        ...(i === 0
          ? { shipment: { create: { carrier: 'Sample carrier', trackingNumber: 'DEMO-123456' } } }
          : {}),
      },
    });
  }
  await db.auditLog.upsert({
    where: { id: 'seed-audit' },
    update: {},
    create: {
      id: 'seed-audit',
      actorId: admin.id,
      action: 'SEED',
      entityId: 'catalog',
      detail: 'Created fictional concept catalogue and sample orders.',
    },
  });
  console.log(
    'Seed complete: 21 concept products, 3 collections, 2 users, 2 promotions, 3 sample orders.',
  );
}
main().finally(() => db.$disconnect());
