import './Features.css';

const FEATURES = [
  {
    title: 'Live preview, always on',
    body: 'Every edit — text, reorder, template swap — reflects in the preview instantly, so you never publish a surprise.',
    icon: '👀',
    accent: 'yellow',
  },
  {
    title: 'Themes without data loss',
    body: 'Switch fonts, colors, and layout treatments and your content stays exactly where you put it.',
    icon: '🎨',
    accent: 'blue',
  },
  {
    title: 'Publish or export',
    body: 'Ship to a public pagecraft.app URL, or export a clean PDF for applications that want a file.',
    icon: '🚀',
    accent: 'coral',
  },
];

export default function Features() {
  return (
    <section className="features section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Why Pagecraft</span>
          <h2 className="section-heading__title">Built for the last-minute portfolio panic.</h2>
        </div>

        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div className={`feature-card feature-card--${f.accent}`} key={f.title}>
              <span className="feature-card__index">0{i + 1}</span>

              <span className="feature-card__icon" role="img" aria-hidden="true">
                {f.icon}
              </span>

              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__body">{f.body}</p>

              <span className="feature-card__glow" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}