const LINK_PATTERN = /(mailto:[^\s<>"']+|tel:\+?[\d().\s-]+|[\w.%+-]+@[\w.-]+\.[a-z]{2,}|(?:https?:\/\/|www\.)[^\s<>"']+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?)/gi;
const LABELLED_LINK_PATTERN = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const TRAILING_PUNCTUATION = /[.,!?;:)\]}]+$/;
const INSTAGRAM_RESERVED_PATHS = new Set(['accounts', 'direct', 'explore', 'p', 'reel', 'reels', 'stories']);
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
    const instagramProfile = hostname === 'instagram.com'
      ? parsed.pathname.split('/').filter(Boolean)[0]
      : '';
    const label = instagramProfile && !INSTAGRAM_RESERVED_PATHS.has(instagramProfile.toLowerCase())
      ? `@${decodeURIComponent(instagramProfile)}`
      : SOCIAL_LABELS.get(hostname);
    return { href: parsed.href, label, kind: 'web' };
  } catch {
    return null;
  }
}

export function getLinkifiedParts(value) {
  const text = String(value ?? '');
  const parts = [];
  const links = [];
  let cursor = 0;
  let match;

  LABELLED_LINK_PATTERN.lastIndex = 0;
  while ((match = LABELLED_LINK_PATTERN.exec(text))) {
    const destination = parseLink(match[2]);
    if (!destination) continue;
    links.push({
      start: match.index,
      end: match.index + match[0].length,
      href: destination.href,
      text: match[1],
      raw: match[2],
      kind: destination.kind,
    });
  }

  LINK_PATTERN.lastIndex = 0;

  while ((match = LINK_PATTERN.exec(text))) {
    const raw = match[0];
    const link = raw.replace(TRAILING_PUNCTUATION, '');
    const punctuation = raw.slice(link.length);
    if (!link) continue;
    const start = match.index;
    const end = start + link.length;
    if (links.some((labelledLink) => start < labelledLink.end && end > labelledLink.start)) continue;

    const destination = parseLink(link);
    if (destination) {
      const wholeValueIsLink = text.trim() === link;
      const label = destination.kind === 'web' && destination.label?.startsWith('@')
        ? destination.label
        : wholeValueIsLink && destination.kind === 'web' && destination.label
          ? destination.label
          : link;
      links.push({ start, end, href: destination.href, text: label, raw: link, kind: destination.kind, punctuation });
    } else {
      links.push({ start, end, text: link, raw: link, punctuation });
    }
  }

  links.sort((left, right) => left.start - right.start || right.end - left.end);
  links.forEach((link) => {
    if (link.start < cursor) return;
    if (link.start > cursor) parts.push({ type: 'text', text: text.slice(cursor, link.start) });
    if (link.href) parts.push({ type: 'link', href: link.href, text: link.text, raw: link.raw, kind: link.kind });
    else parts.push({ type: 'text', text: link.text });
    if (link.punctuation) parts.push({ type: 'text', text: link.punctuation });
    cursor = link.end + (link.punctuation?.length || 0);
  });

  if (cursor < text.length) parts.push({ type: 'text', text: text.slice(cursor) });
  return parts;
}

export default function LinkifiedText({ children, className }) {
  const parts = getLinkifiedParts(children);
  return <span className={className}>{parts.map((part, index) => part.type === 'link'
    ? <a className="portfolio-content-link" href={part.href} key={`link-${index}`} target={part.kind === 'web' ? '_blank' : undefined} rel={part.kind === 'web' ? 'noopener noreferrer' : undefined} title={part.kind === 'web' ? part.raw : undefined}>{part.text}</a>
    : <span key={`text-${index}`}>{part.text}</span>)}</span>;
}
