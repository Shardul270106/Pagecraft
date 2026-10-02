import { useState } from 'react';
import { TEMPLATES } from '../data/templates';
import './Templates.css';

const FILTERS = [
  { label: 'All', category: 'all' },
  { label: 'Portfolios', category: 'portfolio' },
  { label: 'Resumes', category: 'resume' },
  { label: 'Case studies', category: 'case-study' },
];

const TEMPLATE_PREVIEWS = {
  'professional-portfolio': ['Alex Morgan', 'Product designer', 'Selected work'],
  'developer-portfolio': ['Build useful things.', 'Full stack developer', 'Recent projects'],
  'student-resume': ['Jordan Lee', 'Computer science student', 'Education'],
  'creative-portfolio': ['Make ideas matter.', 'Art direction · Design', 'Selected projects'],
  'ux-case-study': ['A clearer way to book.', 'Research · Design · Results', 'The outcome'],
  'photographer-portfolio': ['Quiet moments.', 'Photo journal · 2026', 'The collection'],
  'folio-freelancer': ['Elliott Studio', 'Independent designer', 'Selected work'],
  'grunge-portfolio': ['Peter Jones', 'Creative direction', 'Selected works'],
  'iportfolio-bootstrap': ['Alex Smith', 'Designer & developer', 'Featured projects'],
  'resume-blue-corporate': ['Olivia Sanchez', 'Administrative manager', 'Work experience'],
  'resume-black-white-a4': ['Anaisha Parvati', 'Operations manager', 'Experience'],
  'resume-minimalist-cv': ['Isabel Mercado', 'Marketing manager', 'Expertise'],
};

export default function Templates({ onPick, activeTemplateId, onStartBuilding }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const templates = TEMPLATES.filter((template) => activeFilter === 'all' || template.category === activeFilter);
  const selectedTemplate = TEMPLATES.find((template) => template.templateId === activeTemplateId);

  return (
    <section className="templates section" id="templates">
      <div className="container">
        <div className="templates__heading">
          <div>
            <span className="eyebrow">A strong place to start</span>
            <h2>Choose a direction.<br />Make it yours.</h2>
          </div>
          <p>Every template is editable. Pick the format that fits your work, then shape it around you.</p>
        </div>
        <div className="templates__filters">
          {FILTERS.map((filter) => (
            <button
              key={filter.category}
              type="button"
              className={`filter-pill ${activeFilter === filter.category ? 'filter-pill--active' : ''}`}
              aria-pressed={activeFilter === filter.category}
              onClick={() => {
                setActiveFilter(filter.category);
                if (filter.category !== 'all' && selectedTemplate?.category !== filter.category) {
                  const firstInCategory = TEMPLATES.find((template) => template.category === filter.category);
                  if (firstInCategory) onPick?.(firstInCategory.templateId);
                }
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="templates__bento">
          {templates.map((template) => (
            <button
              key={template.templateId}
              className={`template-card template-card--${template.templateId} ${activeTemplateId === template.templateId ? 'template-card--active' : ''}`}
              style={{
                '--template-accent': `var(--color-${template.accent})`,
              }}
              onClick={() => onPick?.(template.templateId)}
              type="button"
              aria-pressed={activeTemplateId === template.templateId}
              aria-label={`Select ${template.name}`}
            >
              <TemplateThumbnail template={template} />
              <div className="template-card__body">
                <div className="template-card__meta"><span>{FILTERS.find((filter) => filter.category === template.category)?.label || 'Portfolio'}</span><span>{template.sections.length} sections</span></div>
                <h3>{template.name}</h3>
                <p>{template.purpose}</p>
                <div className="template-card__footer"><span className="template-card__editability">✳ Fully editable</span><span className="template-card__cta">Use template <b aria-hidden="true">↗</b></span></div>
              </div>

              {activeTemplateId === template.templateId && (
                <span className="template-card__selected">Selected ✓</span>
              )}
            </button>
          ))}
        </div>
        {selectedTemplate && (
          <div className="templates__selection" aria-live="polite">
            <p><strong>{selectedTemplate.name}</strong> selected · You can change it later.</p>
            <button type="button" className="pill-btn pill-btn--black" onClick={() => {
              sessionStorage.setItem('pagecraft:template', selectedTemplate.templateId);
              onStartBuilding?.(selectedTemplate.templateId);
            }}>
              Use this template <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function TemplateThumbnail({ template }) {
  const [name, role, feature] = TEMPLATE_PREVIEWS[template.templateId] || ['Your name', 'Your role', 'Selected work'];
  return <div className="template-preview">
    <div className={`template-preview__page template-preview__page--${template.category} template-preview__page--${template.templateId}`}>
      <div className="template-preview__nav"><b>{template.templateId === 'folio-freelancer' ? 'eliott' : template.templateId === 'grunge-portfolio' ? 'G/P' : template.templateId.startsWith('resume-') ? 'CURRICULUM VITAE' : 'PORTFOLIO'}</b><span /><span /><span /></div>
      <div className="template-preview__hero">
        <div className="template-preview__copy"><i>{template.templateId === 'grunge-portfolio' ? 'DESIGNER · AVAILABLE FOR WORK' : 'INTRODUCTION'}</i><strong>{name}</strong><small>{role}</small><em>View selected work&nbsp; ↗</em></div>
        <div className="template-preview__portrait"><span>{name.trim().charAt(0)}</span></div>
      </div>
      {template.category === 'resume' ? <div className="template-preview__resume-sections"><b>{feature}</b><span /><span /><span /><b>EDUCATION</b><span /><span /></div> : <div className="template-preview__work"><div className="template-preview__section-title">{feature}<i /></div><div className="template-preview__tiles"><span /><span /><span /></div></div>}
    </div>
    <span className="template-preview__overlay"><span>Preview layout</span><b aria-hidden="true">↗</b></span>
  </div>;
}
