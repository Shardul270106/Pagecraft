import ProductMockup from './ProductMockup';
import './Hero.css';

export default function Hero({ onStartBuilding }) {
  return (
    <section className="hero" id="top">
      <div className="container hero__inner">
        <div className="hero__text">
            <span className="eyebrow eyebrow--pill">Your next page, made yours</span>

          <h1 className="hero__headline">
            Your work deserves
            <br />
            a better stage.
          </h1>

          <p className="hero__sub">
            Build a polished portfolio from a template, then make every detail your own.
          </p>

          <div className="hero__ctas">
            <button type="button" className="pill-btn pill-btn--yellow" onClick={onStartBuilding}>
              Create your portfolio
            </button>
            <a href="#templates" className="hero__secondary-link">Explore templates <span aria-hidden="true">↓</span></a>
          </div>
        </div>

        <div className="hero__visual">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
