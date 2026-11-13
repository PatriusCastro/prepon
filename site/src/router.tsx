import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

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

export const navigate = (to: string) => {
  history.pushState(null, '', href(to));
  dispatchEvent(new PopStateEvent('popstate'));
};

export function Link({ to, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={href(to)} onClick={onClick} aria-current={getPath() === to ? 'page' : undefined} {...rest} />;
}
