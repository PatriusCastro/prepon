import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

// The site's mouse cursor (requested): a dot exactly at the pointer and a dashed ring, the hero lens in miniature,
// trailing it. The system arrow is hidden only after the first mouse move, so there is never a moment with no cursor.
// The ring widens over anything clickable and shrinks on press; over text fields both hide and the I-beam returns.
// Mouse with hover only; touch, pen and reduced motion keep the system cursor.
const CLICKABLE = 'a, button, summary, label, select, [role="button"], .compare-view, .code';
export function CursorLens() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = el.current;
    const ring = box?.firstElementChild as HTMLElement | null;
    const dot = box?.lastElementChild as HTMLElement | null;
    if (!box || !ring || !dot || !matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    const root = document.documentElement;
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      ring.style.translate = `${x}px ${y}px`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(tick) : 0;
    };
    // `frame` is set for moves inside a same-origin iframe (the demo viewer): its coordinates are mapped back to this
    // page through the frame's box, which the viewer scales, and the frame's own arrow is hidden the same way.
    const move = (e: PointerEvent, frame?: HTMLIFrameElement) => {
      if (e.pointerType !== 'mouse') return;
      let cx = e.clientX, cy = e.clientY;
      if (frame) {
        const r = frame.getBoundingClientRect(), k = r.width / frame.offsetWidth;
        cx = r.left + cx * k; cy = r.top + cy * k;
      }
      if (!box.classList.contains('is-on')) { x = cx; y = cy; }
      tx = cx; ty = cy;
      dot.style.translate = `${tx}px ${ty}px`;
      const on = (sel: string) => e.composedPath().some((n) => n instanceof Element && n.matches(sel));
      box.classList.add('is-on');
      root.classList.add('has-cursor');
      frame?.contentDocument?.documentElement.classList.add('has-cursor');
      box.classList.toggle('is-over', on(CLICKABLE));
      box.classList.toggle('is-text', on('input, textarea, [contenteditable]'));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const down = () => box.classList.add('is-down');
    const up = () => box.classList.remove('is-down');
    const out = () => box.classList.remove('is-on');
    const ac = new AbortController();
    const { signal } = ac;
    const listen = (w: Window, frame?: HTMLIFrameElement) => {
      w.addEventListener('pointermove', (e) => move(e, frame), { signal });
      w.addEventListener('pointerdown', down, { signal });
      w.addEventListener('pointerup', up, { signal });
      w.document.documentElement.addEventListener('mouseleave', out, { signal });
    };
    listen(window);
    // Each iframe load is a new window, so listen again on every load (load doesn't bubble; capture sees it).
    const attach = (f: HTMLIFrameElement) => { try { if (f.contentWindow?.document) listen(f.contentWindow, f); } catch { /* cross-origin: keep its own cursor */ } };
    document.addEventListener('load', (e) => { if (e.target instanceof HTMLIFrameElement) attach(e.target); }, { capture: true, signal });
    document.querySelectorAll('iframe').forEach(attach);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('has-cursor');
      ac.abort();
    };
  }, []);
  return <div ref={el} className="cursor" aria-hidden="true"><i className="cursor-lens" /><i className="cursor-dot" /></div>;
}

// Marks each matched element .is-in the first time it is on screen, so a one-shot demo plays where it can be seen.
// It never hides content: before .is-in, the demo simply shows its final frame.
export function useInView(selector: string) {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -15% 0px' });
    document.querySelectorAll(selector).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [selector]);
}

// Scroll reveal: each matched block enters once, the first time it reaches the viewport, and then stays. Siblings
// stagger by 90 ms. Revealing a block also reveals every block before it, so jumping down the page (End key, an
// anchor) never leaves a hidden gap above you. CSS hides blocks only under prefers-reduced-motion: no-preference.
export function useReveal(selector: string) {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(selector)];
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      els.slice(0, els.indexOf(e.target as HTMLElement) + 1).forEach((el) => { el.classList.add('is-in'); io.unobserve(el); });
    }), { rootMargin: '0px 0px -12% 0px' });
    els.forEach((el) => {
      el.style.setProperty('--d', `${[...el.parentElement!.children].indexOf(el) * 90}ms`);
      el.classList.add('reveal');
      io.observe(el);
    });
    return () => io.disconnect();
  }, [selector]);
}

export function CodeBlock({ code, label, primary }: { code: string; label?: string; primary?: boolean }) {
  const [status, setStatus] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('Copied');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Couldn’t copy. Your browser blocked the clipboard; select the text and copy it.');
    }
  };
  const copied = status === 'Copied';
  return (
    // Click anywhere on the block to copy it; no separate button. The code itself is the <button>, so Tab, Enter and
    // Space work and a screen reader hears "Copy <label>" before the command. Clicks on the caption bar bubble here too.
    <figure className={`code${primary ? ' is-primary' : ''}${copied ? ' is-copied' : ''}`} onClick={copy}>
      <div className="code-head">
        {label ? <figcaption>{label}</figcaption> : <span />}
        <span className="code-hint" aria-hidden="true">
          {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Click to copy'}
        </span>
      </div>
      <button type="button" className="code-body">
        <span className="visually-hidden">Copy{label ? ` ${label}` : ''}: </span><code>{code}</code>
      </button>
      {/* "Copied" is already visible in the bar, so it's only announced; an error is shown too. */}
      <p role="status" className={copied ? 'visually-hidden' : 'code-status'}>{status}</p>
    </figure>
  );
}

export function Table({ head, rows, caption }: { head: string[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="table-scroll" role="region" aria-label={caption ?? head.join(', ')} tabIndex={0}>
      <table>
        {caption && <caption>{caption}</caption>}
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
