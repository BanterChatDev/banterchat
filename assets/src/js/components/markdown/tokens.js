export const INLINE_RE = /```([\s\S]*?)```|`([^`\n]+)`|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)|<t:(\d+):([RFftTdD])>|<(a)?:([a-zA-Z0-9_]+):([a-f0-9]{8,32})>|:([a-zA-Z0-9_+-]+):|\|\|([\s\S]+?)\|\|/g;

// Tokenize inline markdown. `visit` is called once per match with the
// RegExp match object and a `plain(text)` callback for the run of plain
// text preceding the match. After the loop, the trailing plain text is
// emitted via `plain` too. Keeping this as a visitor (not an array build)
// lets each caller decide whether to emit React nodes, strings, or dim-
// wrapped spans without allocating an intermediate token array.
export function tokenize(text, visit, plain) {
  if (!text) return;
  INLINE_RE.lastIndex = 0;
  let last = 0;
  let match;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > last) plain(text.slice(last, match.index));
    visit(match);
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length) plain(text.slice(last));
}