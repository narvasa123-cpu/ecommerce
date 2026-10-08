'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const showAfter = 480;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = document.querySelector<HTMLElement>('.a-content');
    const scrollTarget: Window | HTMLElement = container || window;
    const getScrollTop = () =>
      scrollTarget === window ? window.scrollY : (scrollTarget as HTMLElement).scrollTop;
    const update = () => setVisible(getScrollTop() > showAfter);

    scrollTarget.addEventListener('scroll', update, { passive: true });
    update();
    return () => scrollTarget.removeEventListener('scroll', update);
  }, []);

  const scrollToTop = () => {
    const container = document.querySelector<HTMLElement>('.a-content');
    const target: Window | HTMLElement = container || window;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      className="back-to-top"
      type="button"
      aria-label="Back to top"
      hidden={!visible}
      onClick={scrollToTop}
    >
      <ArrowUp size={19} aria-hidden="true" />
    </button>
  );
}
