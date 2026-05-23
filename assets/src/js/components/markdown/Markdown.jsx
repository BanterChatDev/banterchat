import React, { useState } from 'react';
import LiveTimer from './LiveTimer';
import { CheckIcon, CopyIcon } from '../icons';
import { getEmojiByName, getDefaultEmojiById } from '../emoji';
import { tokenize } from './tokens';
import { u } from '../../api/routes';
import EmojiTooltip from '../ui/EmojiTooltip';

function ownDomainIntent(url) {
  try {
    const u = new URL(url);
    if (typeof window === 'undefined' || u.hostname !== window.location.hostname) return null;
    if (u.pathname === '/oauth2/authorize') {
      const cid = u.searchParams.get('client_id');
      if (!cid) return null;
      return { kind: 'bot-invite', clientID: cid, url };
    }
    const m = u.pathname.match(/^\/invite\/([^/?#]+)/);
    if (m) return { kind: 'guild-invite', code: m[1] };
    return null;
  } catch { return null; }
}

function Spoiler({ children }) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) {
    return <span className="bg-white/[0.08] rounded px-0.5">{children}</span>;
  }
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
      className="bg-[var(--bg-tertiary)] text-transparent rounded px-0.5 cursor-pointer select-none hover:bg-white/[0.12] transition-colors"
      title="Click to reveal"
    >
      {children}
    </span>
  );
}

function CodeBlock({ children, inline }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  if (inline) {
    return (
      <span className="relative inline-flex items-center group/code">
        <code className="bg-[var(--bg-tertiary)] text-[var(--text-code)] rounded px-1 py-0.5 text-[12px] font-mono">{children}</code>
        <button onClick={copy} className="ml-0.5 opacity-0 group-hover/code:opacity-100 transition-opacity text-white/20 hover:text-white/50">
          {copied
            ? <CheckIcon className="w-3 h-3 text-green-500" />
            : <CopyIcon className="w-3 h-3" />
          }
        </button>
      </span>
    );
  }
  return (
    <div className="relative group/code my-1">
      <code className="block bg-[var(--bg-tertiary)] text-[var(--text-code)] rounded px-2 py-1 text-[12px] font-mono whitespace-pre-wrap">{children}</code>
      <button onClick={copy} className="absolute top-1 right-1 opacity-0 group-hover/code:opacity-100 transition-opacity text-white/20 hover:text-white/50 p-1 rounded hover:bg-white/[0.06]">
        {copied
          ? <CheckIcon className="w-3.5 h-3.5 text-green-500" />
          : <CopyIcon className="w-3.5 h-3.5" />
        }
      </button>
    </div>
  );
}

const HEADER_CLASSES = { 1: 'block text-[20px] font-bold my-2', 2: 'block text-[17px] font-bold my-1.5', 3: 'block text-[15px] font-bold my-1' };
const HEADER_RE = /^(#{1,3}) +(.+)$/;
const UL_RE = /^[-*] +(.+)$/;
const OL_RE = /^(\d+)\. +(.+)$/;

const JUMBO_MAX = 27;
const EMOJI_CLASS_NORMAL = 'inline-block w-5 h-5 align-middle';
const EMOJI_CLASS_JUMBO = 'inline-block w-12 h-12 align-middle';

function isJumboMessage(text) {
  if (!text) return false;
  let count = 0;
  let nonEmojiSeen = false;
  tokenize(text, (m) => {
    if (m[14] !== undefined || m[15] !== undefined) {
      count++;
      return;
    }
    nonEmojiSeen = true;
  }, (s) => {
    if (s && s.trim() !== '') nonEmojiSeen = true;
  });
  return !nonEmojiSeen && count > 0 && count <= JUMBO_MAX;
}

function renderInline(text, keyPrefix, jumbo, embedGifs) {
  const out = [];
  let i = 0;
  const plain = (s) => { if (s) out.push(s); };
  const emojiClass = jumbo ? EMOJI_CLASS_JUMBO : EMOJI_CLASS_NORMAL;
  tokenize(text, (m) => {
    const k = `${keyPrefix}_${i++}`;
    if (m[1] !== undefined)      out.push(<CodeBlock key={k}>{m[1]}</CodeBlock>);
    else if (m[2] !== undefined) out.push(<CodeBlock key={k} inline>{m[2]}</CodeBlock>);
    else if (m[3] !== undefined) out.push(<strong key={k} className="font-bold"><em>{m[3]}</em></strong>);
    else if (m[4] !== undefined) out.push(<strong key={k} className="font-bold">{m[4]}</strong>);
    else if (m[5] !== undefined) out.push(<em key={k}>{m[5]}</em>);
    else if (m[6] !== undefined) out.push(<span key={k} className="line-through">{m[6]}</span>);
    else if (m[16] !== undefined) out.push(<Spoiler key={k}>{m[16]}</Spoiler>);
    else if (m[7] !== undefined && m[8] !== undefined) out.push(<a key={k} href={m[8]} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-info)] hover:underline">{m[7]}</a>);
    else if (m[9] !== undefined) {
      const url = m[9];
      const cleanPath = url.split('?')[0].split('#')[0].toLowerCase();
      if (embedGifs && (cleanPath.endsWith('.gif') || cleanPath.endsWith('.webp'))) {
        out.push(<a key={k} href={url} target="_blank" rel="noopener noreferrer" className="block my-1 max-w-[320px]"><img src={url} alt="" loading="lazy" decoding="async" className="rounded-md max-w-full max-h-[240px] object-contain bg-[var(--bg-tertiary)]" /></a>);
      } else {
        const intent = ownDomainIntent(url);
        if (intent) {
          out.push(<a key={k} href={url} onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('openInviteFlow', { detail: intent })); }} className="text-[var(--accent-info)] hover:underline cursor-pointer">{url}</a>);
        } else {
          out.push(<a key={k} href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-info)] hover:underline">{url}</a>);
        }
      }
    }
    else if (m[10] !== undefined) out.push(<LiveTimer key={k} unix={parseInt(m[10], 10)} format={m[11] || 'R'} />);
    else if (m[14] !== undefined) {
      const known = getDefaultEmojiById(m[14]);
      const emoji = known || { id: m[14], name: m[13], guild_id: 'unknown' };
      out.push(
        <EmojiTooltip key={k} emoji={emoji}>
          <img src={u.emoji(m[14])} alt={`:${m[13]}:`} className={emojiClass} />
        </EmojiTooltip>
      );
    }
    else if (m[15] !== undefined) {
      const resolved = getEmojiByName(m[15]);
      if (resolved) {
        out.push(
          <EmojiTooltip key={k} emoji={resolved}>
            <img src={u.emoji(resolved.id)} alt={`:${m[15]}:`} className={emojiClass} />
          </EmojiTooltip>
        );
      } else {
        out.push(m[0]);
      }
    }
  }, plain);
  return out;
}

// Classify a raw line into a block kind. Returns { kind, ...payload }.
// Kinds: 'h' (heading), 'ul' (unordered list item), 'ol' (ordered list item),
//        'blank' (empty line — paragraph break), 'p' (plain prose line).
function classify(line) {
  const stripped = line.trimEnd();
  if (stripped.trim() === '') return { kind: 'blank' };
  const h = HEADER_RE.exec(stripped);
  if (h) return { kind: 'h', level: h[1].length, text: h[2] };
  const u = UL_RE.exec(stripped);
  if (u) return { kind: 'ul', text: u[1] };
  const o = OL_RE.exec(stripped);
  if (o) return { kind: 'ol', text: o[2], start: parseInt(o[1], 10) };
  return { kind: 'p', text: stripped };
}

// Group contiguous runs by block kind so list items coalesce into a
// single <ul>/<ol> and adjacent prose lines render with <br> between
// them (single-newline is a soft break; blank lines separate paragraphs
// via the CSS margins on <p>).
function groupBlocks(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const c = classify(lines[i]);
    if (c.kind === 'blank') { blocks.push({ kind: 'blank' }); i++; continue; }
    if (c.kind === 'h')     { blocks.push(c); i++; continue; }
    if (c.kind === 'ul' || c.kind === 'ol') {
      const items = [c.text];
      const listKind = c.kind;
      const start = c.start;
      i++;
      while (i < lines.length) {
        const n = classify(lines[i]);
        if (n.kind !== listKind) break;
        items.push(n.text);
        i++;
      }
      blocks.push({ kind: listKind, items, start });
      continue;
    }
    // Plain prose run: keep consuming until we hit a non-'p' line.
    const para = [c.text];
    i++;
    while (i < lines.length) {
      const n = classify(lines[i]);
      if (n.kind !== 'p') break;
      para.push(n.text);
      i++;
    }
    blocks.push({ kind: 'p', lines: para });
  }
  return blocks;
}

function splitFences(text) {
  const FENCE_RE = /```([\s\S]*?)```/g;
  const segs = [];
  let last = 0;
  let m;
  while ((m = FENCE_RE.exec(text)) !== null) {
    if (m.index > last) segs.push({ kind: 'text', body: text.slice(last, m.index) });
    segs.push({ kind: 'fence', body: m[1].replace(/^\n|\n$/g, '') });
    last = FENCE_RE.lastIndex;
  }
  if (last < text.length) segs.push({ kind: 'text', body: text.slice(last) });
  return segs.length ? segs : [{ kind: 'text', body: text }];
}

export default function Markdown({ text, inline, embedGifs = false }) {
  if (!text) return null;
  const segs = splitFences(text);
  const jumbo = !inline && isJumboMessage(text);
  const out = [];

  segs.forEach((seg, si) => {
    if (seg.kind === 'fence') {
      out.push(<CodeBlock key={`s${si}f`} inline={inline}>{seg.body}</CodeBlock>);
      return;
    }
    if (inline) {
      const lines = seg.body.split('\n');
      lines.forEach((ln, li) => {
        if (li > 0 || (si > 0 && li === 0)) out.push(<br key={`s${si}_ibr${li}`} />);
        out.push(...renderInline(ln, `s${si}_i${li}`, false, embedGifs));
      });
      return;
    }
    const blocks = groupBlocks(seg.body.split('\n'));
    blocks.forEach((b, bi) => {
      if (b.kind === 'blank') return;
      const k = `s${si}_b${bi}`;
      if (b.kind === 'h') {
        const Tag = b.level === 1 ? 'h1' : b.level === 2 ? 'h2' : 'h3';
        out.push(<Tag key={k} className={HEADER_CLASSES[b.level]}>{renderInline(b.text, k, jumbo, embedGifs)}</Tag>);
        return;
      }
      if (b.kind === 'ul') {
        out.push(
          <ul key={k} className="list-disc pl-5 my-1 space-y-0.5">
            {b.items.map((t, ii) => <li key={ii}>{renderInline(t, `${k}_${ii}`, jumbo, embedGifs)}</li>)}
          </ul>
        );
        return;
      }
      if (b.kind === 'ol') {
        out.push(
          <ol key={k} start={b.start} className="list-decimal pl-5 my-1 space-y-0.5">
            {b.items.map((t, ii) => <li key={ii}>{renderInline(t, `${k}_${ii}`, jumbo, embedGifs)}</li>)}
          </ol>
        );
        return;
      }
      const children = [];
      b.lines.forEach((ln, li) => {
        if (li > 0) children.push(<br key={`${k}_br${li}`} />);
        children.push(...renderInline(ln, `${k}_${li}`, jumbo, embedGifs));
      });
      out.push(<p key={k} className="my-0.5 whitespace-pre-wrap">{children}</p>);
    });
  });
  return <>{out}</>;
}