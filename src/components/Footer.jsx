import './Footer.css';

export default function Footer({ onStartBuilding }) {
  return (
    <>
      <section className="cta-band section">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-card__title">
              Your portfolio is one drag away
            </h2>
            <p className="cta-card__sub">Free to start. No credit card, no blank-page dread.</p>
            <div className="hero__ctas">
              <button type="button" onClick={onStartBuilding} className="pill-btn pill-btn--yellow">
                Start building free
              </button>
              <a href="#templates" className="pill-btn pill-btn--black">
                Browse templates
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="site-footer__brand">
            <span className="navbar__mark" aria-hidden="true">
              <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                <path
                  d="M4 15 L10 5 L16 15"
                  stroke="#000"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <a href="#top" className="navbar__wordmark">pagecraft</a>
          </div>

          <div className="site-footer__links">
            <div className="site-footer__col">
              <span className="site-footer__heading">Explore</span>
              <a href="#templates">Templates</a>
              <a href="#features">How it works</a>
            </div>
            <div className="site-footer__col">
              <span className="site-footer__heading">Your next step</span>
              <button type="button" onClick={onStartBuilding}>Create a portfolio</button>
            </div>
          </div>
        </div>

        <div className="container site-footer__bottom">
          <span>© {new Date().getFullYear()} Pagecraft. All rights reserved.</span>
        </div>
      </footer>
    </>
  );
}
