'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to listen to CSS media query matches.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      media.addListener(listener);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

export type Breakpoint = 'base' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Returns current responsive state helper booleans.
 */
export function useBreakpoint() {
  const isXs = useMediaQuery('(min-width: 475px)');
  const isSm = useMediaQuery('(min-width: 640px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isXl = useMediaQuery('(min-width: 1280px)');
  const is2Xl = useMediaQuery('(min-width: 1536px)');

  let current: Breakpoint = 'base';
  if (is2Xl) current = '2xl';
  else if (isXl) current = 'xl';
  else if (isLg) current = 'lg';
  else if (isMd) current = 'md';
  else if (isSm) current = 'sm';
  else if (isXs) current = 'xs';

  return {
    current,
    isMobile: !isSm,        // < 640px
    isTablet: isSm && !isLg,// 640px - 1023px
    isDesktop: isLg,        // >= 1024px
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
  };
}
