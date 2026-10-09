import { FREE_STANDARD_SHIPPING_THRESHOLD_LABEL } from './pricing';

export const serviceContent: Record<
  string,
  {
    title: string;
    eyebrow: string;
    intro: string;
    sections: { title: string; text: string }[];
    legal?: boolean;
  }
> = {
  shipping: {
    title: 'A thoughtful journey.',
    eyebrow: 'DELIVERY',
    intro:
      'From our atelier to your everyday. Every delivery deserves the same consideration as the piece inside.',
    sections: [
      {
        title: 'Where we send',
        text: 'This concept store supports delivery addresses in the Philippines, United States, France, Germany, the Netherlands, and Ireland. All amounts are in Philippine pesos, converted at a fixed reference rate of ₱62.647 per US$1 (5 October 2026); this is not a live exchange-rate feed. No actual products are shipped during sandbox or Stripe test checkout.',
      },
      {
        title: 'At a pace that suits you',
        text: `Standard delivery is illustrated as 3–7 working days, with a ₱751.76 PH/US or ₱1,252.94 EU charge. It is complimentary on orders of ${FREE_STANDARD_SHIPPING_THRESHOLD_LABEL} or more after discounts. Express delivery is illustrated as 1–3 working days, with a ₱1,566.18 PH/US or ₱2,505.88 EU charge. Made-to-order pieces have an additional 4–6 week preparation period.`,
      },
      {
        title: 'A clear total',
        text: 'Your delivery charge and estimated tax are shown before confirmation. The sandbox uses illustrative destination tax rates of 12% for Philippine addresses, 8% for US addresses and 20% for EU addresses. These are development estimates and do not represent a compliant tax determination.',
      },
    ],
  },
  returns: {
    title: 'Room to decide.',
    eyebrow: 'RETURNS & EXCHANGES',
    intro:
      'Some things need a little time. We want the piece you choose to feel right in your everyday.',
    sections: [
      {
        title: 'Thirty considered days',
        text: 'Our proposed policy allows a return request within 30 days of arrival, for an unused piece in its original packaging. This is a sample policy for a fictional store, pending commercial and legal review.',
      },
      {
        title: 'A simple beginning',
        text: 'Send a note through our contact page with your order number and the reason for your request. In this sandbox, requests are saved to the development support inbox for review. No return label or actual refund is issued automatically.',
      },
      {
        title: 'Made to order',
        text: 'Personalised and made-to-order pieces may require a different return arrangement, subject to applicable consumer rights. Contact the atelier to discuss the details before ordering.',
      },
    ],
  },
  care: {
    title: 'Care that continues.',
    eyebrow: 'THE CARE GUIDE',
    intro:
      'The things we keep acquire a life of their own. A little attention helps them age with character.',
    sections: [
      {
        title: 'A gentle routine',
        text: 'Dust your leather piece with a dry, soft cloth. Keep it away from rain, prolonged sunlight and direct heat. If it becomes damp, blot gently and allow it to rest at room temperature.',
      },
      {
        title: 'A place to rest',
        text: 'Store your piece in a breathable dust bag, lightly filled to preserve its form. Avoid plastic bags and tight stacking. Let handles and straps sit naturally.',
      },
      {
        title: 'Respect the material',
        text: 'Suede calls for a dedicated soft brush, while full-grain and pebbled leather may benefit from specialist care. Test any product in a hidden place first. These general guidelines are illustrative; final care instructions must be verified against the actual material.',
      },
    ],
  },
  privacy: {
    title: 'Your details, considered.',
    eyebrow: 'PRIVACY',
    legal: true,
    intro:
      'Legal template requiring review before any public launch. This text describes the development implementation and is not a final privacy policy.',
    sections: [
      {
        title: 'What this store records',
        text: 'The application stores account names, email addresses, hashed passwords, saved addresses, carts, order details, newsletter signups and support notes in its local database. It uses essential cookies for session authentication, anonymous carts and request protection. It does not collect card numbers or security codes.',
      },
      {
        title: 'Purpose and retention',
        text: 'Information supports account access, the ordering demonstration and support. Legacy development reset and order emails are written to server logs; new account confirmation and recovery emails use Supabase Auth. Before launch, define retention periods, legal bases, processors, international transfers and your privacy contact. Remove development data and logs.',
      },
      {
        title: 'Your choices',
        text: 'You can sign out and remove saved addresses through your account. Contact support for other data requests. Data export, deletion request automation, marketing unsubscribe and production consent handling require completion before real customer data is collected.',
      },
    ],
  },
  terms: {
    title: 'A clear understanding.',
    eyebrow: 'TERMS OF THE CONCEPT STORE',
    legal: true,
    intro:
      'Legal template requiring review before launch. ORVEN is a fictional brand and this website is a software demonstration.',
    sections: [
      {
        title: 'The concept collection',
        text: 'All products, descriptions, materials, origins and stock levels are fictional sample data. All photographs are AI-generated concept imagery and may be reused across product pages. They do not depict verified, purchasable merchandise.',
      },
      {
        title: 'Orders and payments',
        text: 'Sandbox checkout records simulated orders and never collects payment details. Stripe integration accepts test keys only. No live money is collected and no physical delivery takes place. An order confirmation in this environment represents a development record.',
      },
      {
        title: 'Before a real launch',
        text: 'A qualified reviewer must complete terms of sale, company identity, consumer rights, warranty terms, tax and duties, regional restrictions, privacy obligations and dispute procedures. Replace sample imagery and product claims with accurate, owned assets and verified information.',
      },
    ],
  },
};
