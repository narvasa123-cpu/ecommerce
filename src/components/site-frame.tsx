'use client';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Footer } from './footer';
import { StoreProvider } from './store-provider';
import { CustomerToolsProvider, MobileNavigation, RecentPieces } from './customer-tools';
import { BackToTop } from './back-to-top';
export function SiteFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === '/admin' || path.startsWith('/admin/'))
    return (
      <>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <BackToTop />
      </>
    );
  return (
    <StoreProvider>
      <CustomerToolsProvider>
      <Header />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <RecentPieces />
      <Footer />
      <MobileNavigation />
      <BackToTop />
      </CustomerToolsProvider>
    </StoreProvider>
  );
}
