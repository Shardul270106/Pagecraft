const LINK_PATTERN = /(mailto:[^\s<>"']+|tel:\+?[\d().\s-]+|[\w.%+-]+@[\w.-]+\.[a-z]{2,}|(?:https?:\/\/|www\.)[^\s<>"']+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?)/gi;
const MARKDOWN_LINK_PATTERN = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
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

export function adjustBodyLinks(previousText, nextText, links = []) {
  const previous = String(previousText ?? '');
  const next = String(nextText ?? '');
  const validLinks = Array.isArray(links) ? links : [];
  if (previous === next) return validLinks;

  let prefixLength = 0;
  while (prefixLength < previous.length && prefixLength < next.length && previous[prefixLength] === next[prefixLength]) prefixLength += 1;
  let suffixLength = 0;
  while (
    suffixLength < previous.length - prefixLength
    && suffixLength < next.length - prefixLength
    && previous[previous.length - suffixLength - 1] === next[next.length - suffixLength - 1]
  ) suffixLength += 1;

  const previousEditEnd = previous.length - suffixLength;
  const nextEditEnd = next.length - suffixLength;
  const offset = nextEditEnd - previousEditEnd;
  return validLinks.flatMap((link) => {
    const start = Number(link.start);
    const end = Number(link.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) return [];
    if (end <= prefixLength) return [{ ...link, start, end }];
    if (start >= previousEditEnd) return [{ ...link, start: start + offset, end: end + offset }];
    return [];
  }).filter((link) => link.start >= 0 && link.end <= next.length);
}

export function getBodyLinksForText(bodyValue, textValue, links = []) {
  const body = String(bodyValue ?? '');
  const text = String(textValue ?? '');
  if (!text) return [];
  const validLinks = (Array.isArray(links) ? links : []).filter((link) => Number.isInteger(Number(link.start)) && Number.isInteger(Number(link.end)));
  const occurrences = [];
  let searchFrom = 0;
  while (searchFrom <= body.length - text.length) {
    const occurrence = body.indexOf(text, searchFrom);
    if (occurrence < 0) break;
    occurrences.push(occurrence);
    searchFrom = occurrence + 1;
  }
  const offset = occurrences.find((occurrence) => validLinks.some((link) => Number(link.start) >= occurrence && Number(link.end) <= occurrence + text.length)) ?? occurrences[0];
  if (offset === undefined) return [];
  const end = offset + text.length;
  return validLinks
    .filter((link) => Number.isInteger(Number(link.start)) && Number.isInteger(Number(link.end)) && Number(link.start) >= offset && Number(link.end) <= end)
    .map((link) => ({ ...link, start: Number(link.start) - offset, end: Number(link.end) - offset }));
}

export function getLinkifiedParts(value, linkedRanges = []) {
  const text = String(value ?? '');
  const parts = [];
  const links = [];
  let cursor = 0;
  let match;

  [...(Array.isArray(linkedRanges) ? linkedRanges : [])]
    .map((range) => ({ ...range, start: Number(range.start), end: Number(range.end) }))
    .filter((range) => typeof range.href === 'string' && Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= 0 && range.end > range.start && range.end <= text.length)
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .forEach((range) => {
      if (links.some((link) => range.start < link.end && range.end > link.start)) return;
      const destination = parseLink(range.href);
      if (!destination) return;
      links.push({
        start: range.start,
        end: range.end,
        href: destination.href,
        text: text.slice(range.start, range.end),
        raw: range.href,
        kind: destination.kind,
      });
    });

  MARKDOWN_LINK_PATTERN.lastIndex = 0;
  while ((match = MARKDOWN_LINK_PATTERN.exec(text))) {
    const destination = parseLink(match[2]);
    if (!destination || links.some((link) => match.index < link.end && match.index + match[0].length > link.start)) continue;
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
    if (links.some((range) => start < range.end && end > range.start)) continue;

    const destination = parseLink(link);
    if (!destination) continue;
    const wholeValueIsLink = text.trim() === link;
    const label = destination.kind === 'web' && destination.label?.startsWith('@')
      ? destination.label
      : wholeValueIsLink && destination.kind === 'web' && destination.label
        ? destination.label
        : link;
    links.push({ start, end, href: destination.href, text: label, raw: link, kind: destination.kind, punctuation });
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

export default function LinkifiedText({ children, className, links }) {
  const parts = getLinkifiedParts(children, links);
  return <span className={className}>{parts.map((part, index) => part.type === 'link'
    ? <a className="portfolio-content-link" href={part.href} key={`link-${index}`} target={part.kind === 'web' ? '_blank' : undefined} rel={part.kind === 'web' ? 'noopener noreferrer' : undefined} title={part.kind === 'web' ? part.raw : undefined}>{part.text}</a>
    : <span key={`text-${index}`}>{part.text}</span>)}</span>;
}
