const ICON_PATHS = {
  sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 3l.7 1.8L7.5 5.5l-1.8.7L5 8l-.7-1.8-1.8-.7 1.8-.7L5 3Z" /></>,
  star: <path d="m12 3 2.7 5.6 6.2.9-4.5 4.4 1.1 6.2-5.5-2.9-5.5 2.9 1.1-6.2-4.5-4.4 6.2-.9L12 3Z" />,
  heart: <path d="M20.8 8.8c0 4.4-8.8 10.2-8.8 10.2S3.2 13.2 3.2 8.8a4.3 4.3 0 0 1 8.8-1.2 4.3 4.3 0 0 1 8.8 1.2Z" />,
  leaf: <><path d="M20.5 3.5C11 3.4 5 5.6 4 11.2c-.7 3.8 2.5 6.2 5.7 5.1 5.2-1.8 7.1-7 10.8-12.8Z" /><path d="M3.5 21c3.6-6.3 7.1-8.3 11.7-10.8" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11-1v3h4v-3" /></>,
  camera: <><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="4" /><circle cx="18" cy="9" r=".7" fill="currentColor" stroke="none" /></>,
};

export const PORTFOLIO_ICONS = [
  { id: 'sparkles', label: 'Sparkles', source: 'https://www.svgrepo.com/svg/400756/sparkles' },
  { id: 'star', label: 'Star' },
  { id: 'heart', label: 'Heart' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'briefcase', label: 'Briefcase' },
  { id: 'camera', label: 'Camera' },
];

export default function PortfolioIcon({ name = 'sparkles', ...props }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{ICON_PATHS[name] || ICON_PATHS.sparkles}</svg>;
}
