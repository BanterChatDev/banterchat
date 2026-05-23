import React from 'react';
import { tokenize } from './tokens';

export default function MarkdownHighlight({ text }) {
  if (!text) return null;
  const tokens = [];
  let k = 0;
  const dim = (s) => <span key={k++} className="text-white/20">{s}</span>;
  const plain = (s) => { if (s) tokens.push(s); };
  tokenize(text, (m) => {
    if (m[1] !== undefined) {
      tokens.push(dim('```'));
      tokens.push(<span key={k++} className="text-[var(--text-code)]">{m[1]}</span>);
      tokens.push(dim('```'));
    } else if (m[2] !== undefined) {
      tokens.push(dim('`'));
      tokens.push(<span key={k++} className="text-[var(--text-code)]">{m[2]}</span>);
      tokens.push(dim('`'));
    } else if (m[3] !== undefined) {
      tokens.push(dim('***'));
      tokens.push(<strong key={k++} className="font-bold"><em>{m[3]}</em></strong>);
      tokens.push(dim('***'));
    } else if (m[4] !== undefined) {
      tokens.push(dim('**'));
      tokens.push(<strong key={k++} className="font-bold">{m[4]}</strong>);
      tokens.push(dim('**'));
    } else if (m[5] !== undefined) {
      tokens.push(dim('*'));
      tokens.push(<em key={k++}>{m[5]}</em>);
      tokens.push(dim('*'));
    } else if (m[6] !== undefined) {
      tokens.push(dim('~~'));
      tokens.push(<span key={k++} className="line-through">{m[6]}</span>);
      tokens.push(dim('~~'));
    } else if (m[7] !== undefined && m[8] !== undefined) {
      tokens.push(dim('['));
      tokens.push(<span key={k++} className="text-[var(--accent-info)]">{m[7]}</span>);
      tokens.push(dim(']('));
      tokens.push(<span key={k++} className="text-[rgb(var(--accent-info-rgb)/0.5)]">{m[8]}</span>);
      tokens.push(dim(')'));
    } else if (m[9] !== undefined) {
      tokens.push(<span key={k++} className="text-[var(--accent-info)]">{m[9]}</span>);
    } else if (m[10] !== undefined) {
      tokens.push(<span key={k++} className="text-[var(--accent-info)]">{m[0]}</span>);
    } else if (m[14] !== undefined) {
      tokens.push(m[0]);
    } else if (m[15] !== undefined) {
      tokens.push(m[0]);
    } else if (m[16] !== undefined) {
      tokens.push(dim('||'));
      tokens.push(<span key={k++} className="bg-white/[0.08] rounded px-0.5">{m[16]}</span>);
      tokens.push(dim('||'));
    }
  }, plain);

  // Preserve input newlines as visible <br>s in the mirror layer — the
  // textarea above us grows row-by-row and the mirror has to match.
  const result = [];
  tokens.forEach((t, i) => {
    if (typeof t !== 'string') { result.push(t); return; }
    t.split('\n').forEach((line, li) => {
      if (li > 0) result.push(<br key={`br${i}_${li}`} />);
      if (line) result.push(line);
    });
  });
  return <>{result}</>;
}