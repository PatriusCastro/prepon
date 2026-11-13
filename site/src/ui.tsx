import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

export function CodeBlock({ code, label, primary }: { code: string; label?: string; primary?: boolean }) {
  const [status, setStatus] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('Copied');
    } catch {
      setStatus('Couldn’t copy. Select the text and copy it.');
    }
  };
  return (
    <figure className="code">
      <div className="code-head">
        {label ? <figcaption>{label}</figcaption> : <span />}
        <button type="button" onClick={copy} className={primary ? 'btn btn-primary' : 'btn btn-quiet'}>
          {status === 'Copied' ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}{status === 'Copied' ? 'Copied' : 'Copy'}{label ? <span className="visually-hidden"> {label}</span> : null}</button>
      </div>
      <pre><code>{code}</code></pre>
      {/* "Copied" is already visible on the button, so it's only announced; an error is shown too. */}
      <p role="status" className={status === 'Copied' ? 'visually-hidden' : 'code-status'}>{status}</p>
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
