import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';

// ponytail: ~20-line pushState router for ~25 static routes; swap in react-router if routes get params or loaders.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const href = (to: string) => BASE + to;

const subscribe = (cb: () => void) => {
  addEventListener('popstate', cb);
  return () => removeEventListener('popstate', cb);
};

const getPath = () => {
  const p = location.pathname.slice(BASE.length) || '/';
  return p.length > 1 ? p.replace(/\/$/, '') : p;
};

export const usePath = () => useSyncExternalStore(subscribe, getPath);

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// Page changes run inside a view transition where the browser has one (styles.css animates it): the old page
// lifts away and the new one rises in, while the header and docs sidebar stay put. flushSync makes React render
// the new page inside the callback, so the browser snapshots the right DOM. No API or reduced motion: plain swap.
export const navigate = (to: string) => {
  const swap = () => {
    history.pushState(null, '', href(to));
    flushSync(() => dispatchEvent(new PopStateEvent('popstate')));
    scrollTo(0, 0);
  };
  if (!document.startViewTransition || reduce.matches) return swap();
  document.startViewTransition(swap);
};

export function Link({ to, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={href(to)} onClick={onClick} aria-current={getPath() === to ? 'page' : undefined} {...rest} />;
}
