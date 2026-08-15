import './Footer.css';

const FOOTER_LINKS = {
  Product: ['Templates', 'Sections', 'Pricing', 'Changelog'],
  Resources: ['Guides', 'Examples', 'Support'],
  Company: ['About', 'Careers', 'Contact'],
};

export default function Footer() {
  return (
    <>
      <section className="cta-band section">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-card__title">
              Your portfolio is one drag away
              <span role="img" aria-label="party popper" className="cta-card__emoji">
                🎉
              </span>
            </h2>
            <p className="cta-card__sub">Free to start. No credit card, no blank-page dread.</p>
            <div className="hero__ctas">
              <a href="#signup" className="pill-btn pill-btn--yellow">
                Start building free
              </a>
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
            <span className="navbar__wordmark">pagecraft</span>
          </div>

          <div className="site-footer__links">
            {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
              <div className="site-footer__col" key={heading}>
                <span className="site-footer__heading">{heading}</span>
                {links.map((link) => (
                  <a href="#" key={link}>
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="container site-footer__bottom">
          <span>© {new Date().getFullYear()} Pagecraft. All rights reserved.</span>
        </div>
      </footer>
    </>
  );
}
