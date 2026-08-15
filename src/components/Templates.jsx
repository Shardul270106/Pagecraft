import { TEMPLATES, SECTION_LIBRARY } from '../data/templates';
import './Templates.css';

const FILTERS = ['All', 'Professional', 'Developer', 'Student', 'Creative', 'Print', 'Education'];

export default function Templates({ onPick, activeTemplateId }) {
  return (
    <section className="templates section" id="templates">
      <div className="container">
        <div className="templates__filters">
          {FILTERS.map((filter, i) => (
            <button
              key={filter}
              type="button"
              className={`filter-pill ${i === 1 ? 'filter-pill--active' : ''}`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="templates__bento">
          {TEMPLATES.map((template, i) => (
            <button
              key={template.templateId}
              className={`bento-card bento-card--${i} ${
                activeTemplateId === template.templateId ? 'bento-card--active' : ''
              }`}
              style={{ background: `var(--color-${template.accent})` }}
              onClick={() => onPick?.(template.templateId)}
              type="button"
            >
              <div className="bento-card__top">
                <h3 className="bento-card__title">{template.name}</h3>
                <span className="bento-card__cta">Try it now</span>
              </div>

              <div className="bento-card__visual">
                {template.sections.slice(0, 5).map((sectionId) => (
                  <span
                    key={sectionId}
                    className="bento-card__bar"
                    title={SECTION_LIBRARY[sectionId]?.label ?? sectionId}
                  />
                ))}
              </div>

              {activeTemplateId === template.templateId && (
                <span className="bento-card__badge">Selected ✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}