import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

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
