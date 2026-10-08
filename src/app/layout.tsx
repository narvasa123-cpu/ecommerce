import type { Metadata } from 'next';
import { SiteFrame } from '@/components/site-frame';
import localFont from 'next/font/local';
import './globals.css';
import './customer-tools.css';
const displayFont = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--orven-display',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});
const bodyFont = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/manrope/files/manrope-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--orven-sans',
  display: 'swap',
  adjustFontFallback: 'Arial',
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: { default: 'ORVEN — The art of everyday', template: '%s | ORVEN' },
  description:
    'Considered leather goods. Quiet companions for all the ways you move through life. Explore the ORVEN concept store.',
  openGraph: {
    title: 'ORVEN — The art of everyday',
    description: 'Designed with intention. Carried for years.',
    images: [
      {
        url: '/images/hero.webp',
        width: 1536,
        height: 1024,
        alt: 'ORVEN fictional campaign concept',
      },
    ],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={displayFont.variable + ' ' + bodyFont.variable}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
