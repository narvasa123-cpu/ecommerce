'use client';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Footer } from './footer';
import { StoreProvider } from './store-provider';
export function SiteFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === '/admin' || path.startsWith('/admin/'))
    return (
      <main id="main" tabIndex={-1}>
        {children}
      </main>
    );
  return (
    <StoreProvider>
      <Header />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </StoreProvider>
  );
}
