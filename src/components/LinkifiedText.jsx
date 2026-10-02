const LINK_PATTERN = /(mailto:[^\s<>"']+|tel:\+?[\d().\s-]+|[\w.%+-]+@[\w.-]+\.[a-z]{2,}|(?:https?:\/\/|www\.)[^\s<>"']+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?)/gi;
const TRAILING_PUNCTUATION = /[.,!?;:)\]}]+$/;
const SOCIAL_LABELS = new Map([
  ['linkedin.com', 'LinkedIn'],
  ['github.com', 'GitHub'],
  ['behance.net', 'Behance'],
  ['dribbble.com', 'Dribbble'],
  ['instagram.com', 'Instagram'],
  ['x.com', 'X'],
  ['twitter.com', 'Twitter'],
  ['facebook.com', 'Facebook'],
  ['youtube.com', 'YouTube'],
]);

function parseLink(candidate) {
  if (/^mailto:/i.test(candidate)) return { href: candidate, label: candidate.slice(7), kind: 'email' };
  if (/^tel:/i.test(candidate)) return { href: `tel:${candidate.slice(4).replace(/[^\d+]/g, '')}`, label: candidate.slice(4), kind: 'phone' };
  if (/^[\w.%+-]+@[\w.-]+\.[a-z]{2,}$/i.test(candidate)) return { href: `mailto:${candidate}`, label: candidate, kind: 'email' };

  const href = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate.replace(/^www\./i, 'www.')}`;
  try {
    const parsed = new URL(href);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return { href: parsed.href, label: SOCIAL_LABELS.get(hostname), kind: 'web' };
  } catch {
    return null;
  }
}

export function getLinkifiedParts(value) {
  const text = String(value ?? '');
  const parts = [];
  let cursor = 0;
  let match;
  LINK_PATTERN.lastIndex = 0;

  while ((match = LINK_PATTERN.exec(text))) {
    const raw = match[0];
    const link = raw.replace(TRAILING_PUNCTUATION, '');
    const punctuation = raw.slice(link.length);
    if (!link) continue;
    if (match.index > cursor) parts.push({ type: 'text', text: text.slice(cursor, match.index) });

    const destination = parseLink(link);
    if (destination) {
      const wholeValueIsLink = text.trim() === link;
      const label = wholeValueIsLink && destination.kind === 'web' && destination.label ? destination.label : link;
      parts.push({ type: 'link', href: destination.href, text: label, raw: link, kind: destination.kind });
    } else {
      parts.push({ type: 'text', text: link });
    }
    if (punctuation) parts.push({ type: 'text', text: punctuation });
    cursor = match.index + raw.length;
  }

  if (cursor < text.length) parts.push({ type: 'text', text: text.slice(cursor) });
  return parts;
}

export default function LinkifiedText({ children, className }) {
  const parts = getLinkifiedParts(children);
  return <span className={className}>{parts.map((part, index) => part.type === 'link'
    ? <a className="portfolio-content-link" href={part.href} key={`link-${index}`} target={part.kind === 'web' ? '_blank' : undefined} rel={part.kind === 'web' ? 'noopener noreferrer' : undefined} title={part.kind === 'web' ? part.raw : undefined}>{part.text}</a>
    : <span key={`text-${index}`}>{part.text}</span>)}</span>;
}
