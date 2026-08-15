import ProductMockup from './ProductMockup';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero__inner">
        <div className="hero__text">
          <span className="eyebrow eyebrow--pill">New feature</span>

          <h1 className="hero__headline">
            Create Your
            <br />
            Custom
            <br />
            Portfolio.
          </h1>

          <p className="hero__sub">
            Pagecraft turns a blank canvas into a published portfolio in minutes.
          </p>

          <div className="hero__ctas">
            <a href="#templates" className="pill-btn pill-btn--yellow">
              Start building free
            </a>
          </div>
        </div>

        <div className="hero__visual">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}