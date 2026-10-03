import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SECTION_LIBRARY } from '../data/templates';
import ResumePortfolio, { isResumeTemplate } from './ResumePortfolio';
import LinkifiedText, { getLinkifiedParts } from './LinkifiedText';
import grungeWallpaper from '../assets/grunge/bg.jpg';
import grungeSymbol from '../assets/grunge/symbolWhite.svg';
import grungeBarcode from '../assets/grunge/barcode.svg';
import pagecraftCursor from '../assets/pagecraft-cursor.svg';
import PortfolioIcon from './PortfolioIcon';
import { getPortfolioFontStack } from '../lib/portfolioFont';

const FOLIO_LINKS = [
  ['services', 'Services'],
  ['projects', 'Work'],
  ['about', 'About'],
  ['testimonials', 'Kind words'],
  ['contact', 'Contact'],
];

const TEMPLATE_NAV_LINKS = {
  'developer-portfolio': [['about', 'About'], ['technical-skills', 'Stack'], ['projects', 'Builds'], ['experience', 'Experience']],
  'creative-portfolio': [['projects-work', 'Selected work'], ['about', 'Studio'], ['services', 'Services']],
  'ux-case-study': [['process', 'Process'], ['outcome', 'Outcome'], ['projects-work', 'Case study']],
  'photographer-portfolio': [['gallery', 'Gallery'], ['about', 'About']],
  'editorial-studio-portfolio': [['projects', 'Stories'], ['about', 'Studio'], ['services', 'Services']],
  'midnight-creative-portfolio': [['projects', 'Experiments'], ['skills', 'Practice'], ['about', 'About']],
  'product-designer-portfolio': [['projects', 'Work'], ['process', 'Approach'], ['outcome', 'Impact']],
  'architect-portfolio': [['gallery', 'Spaces'], ['projects', 'Projects'], ['about', 'Practice']],
};

const TEMPLATE_ART_COPY = {
  'developer-portfolio': ['SYSTEM / 01', 'const work = thoughtful;', 'ship(ideas);'],
  'creative-portfolio': ['A FIELD GUIDE', 'Make room for', 'the unexpected.'],
  'ux-case-study': ['FIELD NOTE 01', 'A better way', 'to move forward'],
  'photographer-portfolio': ['FRAME / 001', 'Light, held', 'a little longer'],
  'editorial-studio-portfolio': ['INDEPENDENT JOURNAL', 'Form follows', 'feeling.'],
  'midnight-creative-portfolio': ['STUDY / 04', 'Signals after', 'dark'],
  'product-designer-portfolio': ['PRODUCT NOTE 01', 'Less friction,', 'more flow'],
};

function splitContentBlocks(value) {
  return String(value || '').split(/\n\s*\n/).map((entry) => entry.trim()).filter(Boolean);
}

function resizeTextarea(textarea) {
  if (!textarea) return;
  const currentHeight = textarea.getBoundingClientRect().height;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(currentHeight, textarea.scrollHeight + 2)}px`;
}

function getProjectContent(entry) {
  const lines = entry.split('\n').map((line) => line.trim()).filter(Boolean);
  const first = (lines.shift() || '').replace(/^\d{1,2}\s*[/.—–-]\s*/, '');
  const match = first.match(/^(.+?)\s+(?:—|–|\/|\|)\s+(.+)$/);
  return match
    ? { title: match[1].trim(), detail: [match[2], ...lines].filter(Boolean).join('\n') }
    : { title: first || 'Selected project', detail: lines.join('\n') };
}

function getSkillItems(value) {
  return String(value || '').split(/[\n,;·•]+/).map((item) => item.trim()).filter(Boolean);
}

function linkifyIframeTextNode(node) {
  if (!node.parentElement) return;
  const parentAnchor = node.parentElement.closest('a');
  if (parentAnchor) {
    const text = (node.nodeValue || '').trim();
    const linkedPart = getLinkifiedParts(text).find((part) => part.type === 'link' && part.raw === text);
    if (linkedPart) {
      updateIframeAnchorFromText(node);
      node.nodeValue = linkedPart.text;
    }
    return;
  }
  const parts = getLinkifiedParts(node.nodeValue || '');
  if (!parts.some((part) => part.type === 'link')) return;

  const fragment = node.ownerDocument.createDocumentFragment();
  parts.forEach((part) => {
    if (part.type === 'text') {
      fragment.appendChild(node.ownerDocument.createTextNode(part.text));
      return;
    }
    const anchor = node.ownerDocument.createElement('a');
    anchor.className = 'portfolio-content-link';
    anchor.href = part.href;
    anchor.textContent = part.text;
    if (part.kind === 'web') {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.title = part.raw;
    }
    fragment.appendChild(anchor);
  });
  node.replaceWith(fragment);
}

function updateIframeAnchorFromText(node) {
  const anchor = node.parentElement?.closest('a');
  const text = (node.textContent || '').trim();
  if (!anchor || !text) return;
  const link = getLinkifiedParts(text).find((part) => part.type === 'link' && part.raw === text);
  if (!link) return;
  anchor.href = link.href;
  if (link.kind === 'web') {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
}

export function PortfolioView({ portfolio, editable = false, onUpdate, onTemplateContentChange, onTemplateImageSelect, onUndo, onRedo, onUploadImage, onCanvasElementUpdate, selectedCanvasElement, onCanvasElementSelect, onCanvasWheelZoom }) {
  const theme = portfolio?.theme || {};
  const sections = portfolio?.sections || [];
  const isFolio = portfolio?.templateId === 'folio-freelancer';
  const isGrunge = portfolio?.templateId === 'grunge-portfolio';
  const isIPortfolio = portfolio?.templateId === 'iportfolio-bootstrap';
  const isProfessional = portfolio?.templateId === 'professional-portfolio';
  const navLinks = TEMPLATE_NAV_LINKS[portfolio?.templateId] || [];
  const hasHeroCanvasImage = !isFolio && (portfolio?.canvasElements || []).some((element) => element.type === 'image' && !element.sectionId && element.y < 32);
  const header = sections.find((section) => section.type === 'header');
  const style = {
    '--portfolio-accent': theme.accent || '#e6e51e',
    '--portfolio-background': theme.background || '#fff',
    '--portfolio-section': theme.section && theme.section !== 'transparent' ? theme.section : undefined,
    '--portfolio-font': getPortfolioFontStack(theme.font),
  };
  const sectionHref = (type) => {
    const index = sections.findIndex((section) => section.type === type);
    if (index < 0) return null;
    if (isGrunge) return `#grunge-${type}-${index}`;
    if (isFolio) return `#folio-section-${type}-${index}`;
    return `#${portfolio.templateId}-section-${type}-${index}`;
  };

  if (isIPortfolio) return <PortfolioComposition {...{ portfolio, editable, selectedCanvasElement, onCanvasElementUpdate, onCanvasElementSelect }}><IPortfolioFrame portfolio={portfolio} editable={editable} onContentChange={onTemplateContentChange} onImageSelect={onTemplateImageSelect} onUndo={onUndo} onRedo={onRedo} onZoomWheel={onCanvasWheelZoom} /></PortfolioComposition>;
  if (isGrunge) return <PortfolioComposition {...{ portfolio, editable, selectedCanvasElement, onCanvasElementUpdate, onCanvasElementSelect }}><GrungePortfolio portfolio={portfolio} sections={sections} header={header} editable={editable} onUpdate={onUpdate} onUploadImage={onUploadImage} sectionHref={sectionHref} /></PortfolioComposition>;
  if (isResumeTemplate(portfolio?.templateId)) return <PortfolioComposition {...{ portfolio, editable, selectedCanvasElement, onCanvasElementUpdate, onCanvasElementSelect }}><ResumePortfolio portfolio={portfolio} editable={editable} onUpdate={onUpdate} /></PortfolioComposition>;

  return <PortfolioComposition {...{ portfolio, editable, selectedCanvasElement, onCanvasElementUpdate, onCanvasElementSelect }}>
    <article className={`portfolio-page layout-${isFolio ? 'folio' : (theme.layout || 'modern')} portfolio-page--${portfolio.templateId || 'professional-portfolio'} ${isFolio ? 'portfolio-page--folio' : ''} ${hasHeroCanvasImage ? 'portfolio-page--image-flow' : ''}`} style={style}>
      {isProfessional && <nav className="professional-nav" aria-label="Portfolio navigation">
        <a className="professional-nav__brand" href="#professional-home" aria-label={`${header?.title || portfolio.title} home`}><span>{(header?.title || portfolio.title || 'P').trim().charAt(0).toUpperCase()}</span><b>{header?.title || portfolio.title}</b></a>
        <div className="professional-nav__links">
          {[["about", "About"], ["experience", "Experience"], ["projects", "Work"]].filter(([type]) => sectionHref(type)).map(([type, label]) => <a key={type} href={sectionHref(type)}>{label}</a>)}
        </div>
        {sectionHref('contact') && <a className="professional-nav__cta" href={sectionHref('contact')}>Let’s talk <span aria-hidden="true">↗</span></a>}
      </nav>}
      {!isProfessional && navLinks.length > 0 && <nav className={`template-nav template-nav--${portfolio.templateId}`} aria-label="Portfolio navigation">
        <a className="template-nav__brand" href={`#${portfolio.templateId}-home`} aria-label={`${header?.title || portfolio.title} home`}><span>{(header?.title || portfolio.title || 'P').trim().charAt(0).toUpperCase()}</span><b>{header?.title || portfolio.title}</b></a>
        <div className="template-nav__links">{navLinks.filter(([type]) => sectionHref(type)).map(([type, label]) => <a key={type} href={sectionHref(type)}>{label}</a>)}</div>
        {sectionHref('contact') && <a className="template-nav__cta" href={sectionHref('contact')}>{portfolio.templateId === 'developer-portfolio' ? 'Say hello' : portfolio.templateId === 'photographer-portfolio' ? 'Book a shoot' : 'Let’s talk'} <span aria-hidden="true">↗</span></a>}
      </nav>}
      {isFolio && <nav className="folio-nav" aria-label="Portfolio navigation">
        <a className="folio-nav__brand" href="#folio-hero">{header?.title || portfolio.title}</a>
        <div className="folio-nav__links">{FOLIO_LINKS.filter(([type]) => sectionHref(type)).map(([type, label]) => <a key={type} href={sectionHref(type)}>{label}</a>)}</div>
        {sectionHref('contact') && <a className="folio-nav__cta" href={sectionHref('contact')}>Hire me <span aria-hidden="true">↗</span></a>}
      </nav>}
      <div className={isFolio ? 'folio-content' : undefined}>
        {sections.map((section, index) => {
          const label = SECTION_LIBRARY[section.type]?.label || section.type;
          const sectionId = isFolio ? `folio-section-${section.type}-${index}` : `#${portfolio.templateId}-section-${section.type}-${index}`.slice(1);
          const sectionElements = (portfolio.canvasElements || []).filter((element) => element.sectionId === section.id);
          const hasVisualList = !editable && ['projects', 'projects-work', 'gallery'].includes(section.type) && splitContentBlocks(section.body).length > 0;
          const copyBounds = getSectionCopyBounds(sectionElements) || (section.image ? { left: 0, width: 68 } : null);
          const contentStyle = { '--section-offset-x': `${section.contentOffsetX || 0}px`, '--section-offset-y': `${section.contentOffsetY || 0}px` };
          if (section.type === 'header') return (
            <header data-section-id={section.id} className={`portfolio-page__hero portfolio-page__hero--canvas ${section.image ? 'portfolio-page__hero--with-media' : ''} ${isFolio ? 'folio-hero' : ''}`} id={isFolio ? 'folio-hero' : isProfessional ? 'professional-home' : `${portfolio.templateId}-home`} key={section.id}>
              <SectionCopy section={section} editable={editable} onUpdate={onUpdate} moveBounds={copyBounds} className={isFolio ? 'folio-hero__copy' : ''} style={contentStyle}>
                {isFolio && <span className="folio-hero__availability"><i /> Available for work</span>}
                {isProfessional && <span className="professional-hero__availability"><i /> Open to thoughtful projects</span>}
                {!isFolio && <span className="portfolio-page__eyebrow">{portfolio?.title || 'Your portfolio'}</span>}
                {editable ? <input className="portfolio-page__hero-title" aria-label="Your name" value={section.title || ''} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h1>{section.title || 'Your name'}</h1>}
                {editable ? <textarea ref={resizeTextarea} data-auto-size="true" className="portfolio-page__hero-body" aria-label="Your role and introduction" value={section.body || ''} onChange={(event) => { onUpdate(section.id, 'body', event.target.value); resizeTextarea(event.currentTarget); }} rows={3} /> : <p><LinkifiedText>{section.body || ''}</LinkifiedText></p>}
                {isProfessional && <div className="professional-hero__actions">{sectionHref('projects') && <a className="professional-button professional-button--dark" href={sectionHref('projects')}>Explore my work <span aria-hidden="true">↓</span></a>}{sectionHref('contact') && <a className="professional-button professional-button--text" href={sectionHref('contact')}>Get in touch <span aria-hidden="true">↗</span></a>}</div>}
                {!isProfessional && !isFolio && navLinks.length > 0 && <div className="template-hero__actions">{(sectionHref('projects') || sectionHref('projects-work') || sectionHref('gallery')) && <a className="template-hero__primary" href={sectionHref('projects') || sectionHref('projects-work') || sectionHref('gallery')}>{portfolio.templateId === 'photographer-portfolio' ? 'View the collection' : portfolio.templateId === 'ux-case-study' || portfolio.templateId === 'product-designer-portfolio' ? 'Read the case study' : 'Explore selected work'} <span aria-hidden="true">↘</span></a>}{sectionHref('contact') && <a className="template-hero__secondary" href={sectionHref('contact')}>Get in touch <span aria-hidden="true">↗</span></a>}</div>}
                {isFolio && <div className="folio-hero__actions">
                  {sectionHref('projects') && <a className="folio-button folio-button--dark" href={sectionHref('projects')}>View my work <span aria-hidden="true">↓</span></a>}
                  {sectionHref('contact') && <a className="folio-button folio-button--light" href={sectionHref('contact')}>Get in touch</a>}
                </div>}
              </SectionCopy>
              {section.image && <div className="portfolio-section-media"><img className={`portfolio-page__image ${isFolio ? 'folio-hero__image' : ''}`} src={section.image} alt="Profile or portfolio" /></div>}
              {isProfessional && !section.image && !sectionElements.length && <div className="professional-hero-art" aria-hidden="true"><span className="professional-hero-art__orbit" /><span className="professional-hero-art__initial">{(section.title || 'P').trim().charAt(0).toUpperCase()}</span><span className="professional-hero-art__caption">SELECTED WORK<br />2026 — PRESENT</span><i /></div>}
              {!isProfessional && !isFolio && navLinks.length > 0 && !section.image && !sectionElements.length && <TemplateHeroArtwork templateId={portfolio.templateId} />}
              {!section.image && !sectionElements.length && (isFolio ? <div className="folio-hero__portrait" aria-hidden="true"><span>{(section.title || 'P').trim().charAt(0).toUpperCase()}</span><i /></div> : portfolio?.templateId === 'architect-portfolio' ? <div className="portfolio-page__architect-art" aria-hidden="true"><span /><i /><b /></div> : null)}
              {sectionElements.length > 0 && <CanvasElementsLayer elements={sectionElements} editable={editable} selectedId={selectedCanvasElement} onUpdate={onCanvasElementUpdate} onSelect={onCanvasElementSelect} sectionBound />}
              {portfolio?.ownerName && <small>Portfolio by {portfolio.ownerName}</small>}
            </header>
          );
          return (
            <section data-section-id={section.id} className={`portfolio-page__section portfolio-page__section--canvas portfolio-page__section--${section.type} ${section.image ? 'portfolio-page__section--with-media' : ''} ${hasVisualList ? 'portfolio-page__section--has-visual-list' : ''} ${isFolio ? `folio-section folio-section--${section.type} ${section.image ? 'folio-section--with-media' : ''}` : ''} ${isProfessional ? 'professional-section' : ''}`} id={sectionId} key={section.id}>
              <SectionCopy section={section} editable={editable} onUpdate={onUpdate} moveBounds={copyBounds} style={contentStyle}>
                {isProfessional && <span className="professional-section__index">{String(index).padStart(2, '0')} <i /> {label}</span>}
                {editable ? <input aria-label={`${label} heading`} value={section.title || ''} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h2>{section.title || label}</h2>}
                {editable ? <textarea ref={resizeTextarea} data-auto-size="true" aria-label={`${label} content`} value={section.body || ''} onChange={(event) => { onUpdate(section.id, 'body', event.target.value); resizeTextarea(event.currentTarget); }} rows={Math.max(3, String(section.body || '').split('\n').length)} /> : <SectionDisplay section={section} templateId={portfolio.templateId} />}
              </SectionCopy>
              {section.image && (editable || !['projects', 'projects-work', 'gallery'].includes(section.type)) && <div className="portfolio-section-media"><img className="portfolio-page__image" src={section.image} alt={`${label} visual`} /></div>}
              {hasVisualList && <PortfolioVisualList section={section} templateId={portfolio.templateId} />}
              {sectionElements.length > 0 && <CanvasElementsLayer elements={sectionElements} editable={editable} selectedId={selectedCanvasElement} onUpdate={onCanvasElementUpdate} onSelect={onCanvasElementSelect} sectionBound />}
            </section>
          );
        })}
      </div>
      <footer className={`portfolio-page__footer ${isFolio ? 'folio-footer' : ''} ${isProfessional ? 'professional-footer' : ''}`}><span>{isFolio || isProfessional || navLinks.length ? header?.title || portfolio.title : 'Made with Pagecraft'}</span><span>{isFolio ? 'Designed with care · Built with Pagecraft' : navLinks.length || isProfessional ? 'Made with care · Built with Pagecraft' : ''}</span></footer>
    </article>
  </PortfolioComposition>;
}

function SectionDisplay({ section }) {
  const content = section.body || '';
  if (['skills', 'technical-skills', 'services', 'languages'].includes(section.type)) {
    return <ul className={`portfolio-skill-list portfolio-skill-list--${section.type}`}>{getSkillItems(content).map((skill, index) => <li key={`${section.id}-${index}`}><LinkifiedText>{skill}</LinkifiedText></li>)}</ul>;
  }
  if (['experience', 'education'].includes(section.type)) {
    return <div className="portfolio-timeline">{splitContentBlocks(content).map((entry, index) => {
      const lines = entry.split('\n').map((line) => line.trim()).filter(Boolean);
      return <article className="portfolio-timeline__item" key={`${section.id}-${index}`}><span className="portfolio-timeline__marker" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3><LinkifiedText>{lines[0] || 'Experience'}</LinkifiedText></h3>{lines.length > 1 && <p><LinkifiedText>{lines.slice(1).join('\n')}</LinkifiedText></p>}</div></article>;
    })}</div>;
  }
  if (section.type === 'testimonials') return <blockquote className="portfolio-testimonial"><p><LinkifiedText>{content}</LinkifiedText></p></blockquote>;
  if (section.type === 'process' || section.type === 'outcome') {
    return <div className={`portfolio-steps portfolio-steps--${section.type}`}>{splitContentBlocks(content).map((entry, index) => <article key={`${section.id}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><p><LinkifiedText>{entry}</LinkifiedText></p></article>)}</div>;
  }
  return <p className={`portfolio-copy portfolio-copy--${section.type}`}><LinkifiedText>{content}</LinkifiedText></p>;
}

function PortfolioVisualList({ section, templateId }) {
  const entries = splitContentBlocks(section.body);
  if (!entries.length) return null;
  const isGallery = section.type === 'gallery';
  return <div className={`portfolio-visual-list ${isGallery ? 'portfolio-visual-list--gallery' : ''} portfolio-visual-list--${templateId}`}>
    {entries.map((entry, index) => {
      const project = getProjectContent(entry);
      return <article className="portfolio-visual-card" key={`${section.id}-${index}`}>
        <div className="portfolio-visual-card__art" aria-hidden="true">
          {index === 0 && section.image ? <img src={section.image} alt="" /> : <><span>{String(index + 1).padStart(2, '0')}</span><i /><b /></>}
        </div>
        <div className="portfolio-visual-card__copy"><span className="portfolio-visual-card__index">{isGallery ? 'FRAME' : 'PROJECT'} / {String(index + 1).padStart(2, '0')}</span><h3><LinkifiedText>{project.title}</LinkifiedText></h3>{project.detail && <p><LinkifiedText>{project.detail}</LinkifiedText></p>}</div>
      </article>;
    })}
  </div>;
}

function TemplateHeroArtwork({ templateId }) {
  const copy = TEMPLATE_ART_COPY[templateId];
  if (!copy) return null;
  const isDeveloper = templateId === 'developer-portfolio';
  const isPhotographer = templateId === 'photographer-portfolio';
  return <div className={`template-hero-art template-hero-art--${templateId}`} aria-hidden="true">
    <span className="template-hero-art__kicker">{copy[0]}</span>
    <strong><span>{copy[1]}</span><em>{copy[2]}</em></strong>
    {isDeveloper ? <div className="template-code-card"><span><i /><i /><i /></span><code><b>01</b> const <i>ideas</i> = clear;<br /><b>02</b> const <i>craft</i> = care;<br /><b>03</b> build(ideas, craft);</code><small>READY TO SHIP <i /></small></div> : isPhotographer ? <div className="template-photo-stack"><i /><b /><span>STILL / MOVING</span></div> : <div className="template-hero-art__shapes"><i /><b /><span /></div>}
    <span className="template-hero-art__folio">PAGECRAFT / WORK INDEX</span>
  </div>;
}

function PortfolioComposition({ portfolio, editable, selectedCanvasElement, onCanvasElementUpdate, onCanvasElementSelect, children }) {
  const wideTemplates = ['folio-freelancer', 'editorial-studio-portfolio', 'architect-portfolio', 'professional-portfolio', 'developer-portfolio', 'creative-portfolio', 'ux-case-study', 'photographer-portfolio', 'midnight-creative-portfolio', 'product-designer-portfolio'];
  const templateClass = wideTemplates.includes(portfolio?.templateId) ? 'portfolio-composition--wide' : portfolio?.templateId === 'grunge-portfolio' || portfolio?.templateId === 'iportfolio-bootstrap' ? 'portfolio-composition--full' : isResumeTemplate(portfolio?.templateId) ? 'portfolio-composition--resume' : '';
  const supportsSectionCanvas = portfolio?.templateId !== 'grunge-portfolio' && portfolio?.templateId !== 'iportfolio-bootstrap' && !isResumeTemplate(portfolio?.templateId);
  const sectionIds = new Set((portfolio?.sections || []).map((section) => section.id));
  const freeElements = (portfolio?.canvasElements || []).filter((element) => !supportsSectionCanvas || !sectionIds.has(element.sectionId));
  return <div className={`portfolio-composition ${templateClass}`} style={{ '--portfolio-font': getPortfolioFontStack(portfolio?.theme?.font) }}><div className="portfolio-composition__content">{children}</div><CanvasElementsLayer elements={freeElements} editable={editable} selectedId={selectedCanvasElement} onUpdate={onCanvasElementUpdate} onSelect={onCanvasElementSelect} allowSectionDrop={supportsSectionCanvas} /></div>;
}

function getSectionCopyBounds(elements) {
  const images = elements.filter((element) => element.type === 'image');
  if (!images.length) return null;
  const intervals = images.map((element) => [Math.max(0, element.x), Math.min(100, element.x + element.width)]).sort((a, b) => a[0] - b[0]);
  const gaps = [];
  let cursor = 0;
  intervals.forEach(([left, right]) => {
    if (left > cursor) gaps.push([cursor, left]);
    cursor = Math.max(cursor, right);
  });
  if (cursor < 100) gaps.push([cursor, 100]);
  const widest = gaps.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  if (!widest || widest[1] - widest[0] < 18) return null;
  const inset = Math.min(2, (widest[1] - widest[0]) / 10);
  return { left: widest[0] + inset, width: widest[1] - widest[0] - inset * 2 };
}

function SectionCopy({ section, editable, onUpdate, moveBounds, className = '', style, children }) {
  const copyRef = useRef(null);
  const dragRef = useRef(null);
  const [measuredBounds, setMeasuredBounds] = useState({ minX: 0, maxX: 0, maxY: 0 });
  const slotLeftPercent = moveBounds?.left || 0;
  const slotWidthPercent = moveBounds?.width || 100;

  useLayoutEffect(() => {
    const copy = copyRef.current;
    const sectionNode = copy?.closest('[data-section-id]');
    if (!copy || !sectionNode) return undefined;
    const measure = () => {
      const autoSizeField = copy.querySelector('textarea[data-auto-size="true"]');
      if (autoSizeField) resizeTextarea(autoSizeField);
      const copyRect = copy.getBoundingClientRect();
      const sectionRect = sectionNode.getBoundingClientRect();
      const renderedOffsetX = Number.parseFloat(getComputedStyle(copy).getPropertyValue('--section-offset-x')) || 0;
      const slotWidth = (sectionRect.width * slotWidthPercent) / 100;
      const slotLeft = (sectionRect.width * slotLeftPercent) / 100;
      const naturalLeft = copyRect.left - sectionRect.left - renderedOffsetX;
      const renderedOffsetY = Number.parseFloat(getComputedStyle(copy).getPropertyValue('--section-offset-y')) || 0;
      const naturalTop = copyRect.top - sectionRect.top - renderedOffsetY;
      const next = {
        minX: slotLeft - naturalLeft,
        maxX: Math.max(slotLeft - naturalLeft, slotLeft + slotWidth - copyRect.width - naturalLeft),
        maxY: Math.max(0, sectionRect.height - copyRect.height - naturalTop),
      };
      setMeasuredBounds((current) => Math.abs(current.minX - next.minX) < 1 && Math.abs(current.maxX - next.maxX) < 1 && Math.abs(current.maxY - next.maxY) < 1 ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    observer.observe(sectionNode);
    return () => observer.disconnect();
  }, [section.id, slotLeftPercent, slotWidthPercent]);

  const effectiveOffsetX = Math.max(measuredBounds.minX, Math.min(measuredBounds.maxX, section.contentOffsetX || 0));
  const effectiveOffsetY = Math.max(0, Math.min(measuredBounds.maxY, section.contentOffsetY || 0));
  const copyStyle = {
    ...style,
    '--section-offset-x': `${effectiveOffsetX}px`,
    '--section-offset-y': `${effectiveOffsetY}px`,
    '--section-copy-max-width': moveBounds ? `${100 / 0.9}%` : '540px',
    ...(moveBounds ? { marginLeft: `${slotLeftPercent + slotWidthPercent * 0.05}%`, width: `${slotWidthPercent * 0.9}%` } : {}),
  };

  const startMove = (event) => {
    if (!editable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const copy = copyRef.current;
    const sectionNode = copy?.closest('[data-section-id]');
    if (!copy || !sectionNode) return;
    const copyRect = copy.getBoundingClientRect();
    const sectionRect = sectionNode.getBoundingClientRect();
    const slotLeft = (sectionRect.width * slotLeftPercent) / 100;
    const slotWidth = (sectionRect.width * slotWidthPercent) / 100;
    const startLeft = copyRect.left - sectionRect.left;
    const startTop = copyRect.top - sectionRect.top;
    const startOffsetX = effectiveOffsetX;
    const startOffsetY = effectiveOffsetY;
    const move = (moveEvent) => {
    const naturalLeft = startLeft - startOffsetX;
    const minOffsetX = slotLeft - naturalLeft;
    const maxOffsetX = Math.max(minOffsetX, slotLeft + slotWidth - copyRect.width - naturalLeft);
      const naturalTop = startTop - startOffsetY;
      const maxTop = Math.max(0, sectionRect.height - copyRect.height - naturalTop);
      const nextOffsetX = Math.round(Math.max(minOffsetX, Math.min(maxOffsetX, startOffsetX + moveEvent.clientX - event.clientX)));
      const nextTop = Math.max(0, Math.min(maxTop, startTop + moveEvent.clientY - event.clientY));
      const nextOffsetY = Math.round(startOffsetY + nextTop - startTop);
      if (nextOffsetX !== dragRef.current.lastOffsetX) {
        dragRef.current.lastOffsetX = nextOffsetX;
        onUpdate?.(section.id, 'contentOffsetX', nextOffsetX);
      }
      if (nextOffsetY !== dragRef.current.lastOffsetY) {
        dragRef.current.lastOffsetY = nextOffsetY;
        onUpdate?.(section.id, 'contentOffsetY', nextOffsetY);
      }
    };
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      dragRef.current = null;
    };
    dragRef.current = { finish, lastOffsetX: startOffsetX, lastOffsetY: startOffsetY };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  };

  useEffect(() => () => dragRef.current?.finish?.(), []);
  return <div ref={copyRef} className={`portfolio-section-copy ${className}`} style={copyStyle}>
    {editable && <button type="button" className="portfolio-section-copy__handle" aria-label={`Move ${section.title || 'section'} text`} title="Drag to move this section text" onPointerDown={startMove}>✥</button>}
    {children}
  </div>;
}

function CanvasElementsLayer({ elements, editable, selectedId, onUpdate, onSelect, sectionBound = false, allowSectionDrop = true }) {
  const layerRef = useRef(null);
  const dragRef = useRef(null);
  const pointerMove = (event) => {
    if (!dragRef.current) return;
    if (!dragRef.current.isDragging) {
      const deltaX = event.clientX - dragRef.current.startClientX;
      const deltaY = event.clientY - dragRef.current.startClientY;
      if (Math.hypot(deltaX, deltaY) < 4) return;
      dragRef.current.isDragging = true;
    }
    if (event.cancelable) event.preventDefault();
    const element = dragRef.current.element;
    const currentSection = allowSectionDrop && dragRef.current.currentSectionId && [...document.querySelectorAll('[data-section-id]')]
      .find((node) => node.dataset.sectionId === dragRef.current.currentSectionId);
    const composition = currentSection?.closest('.portfolio-composition') || layerRef.current?.closest('.portfolio-composition') || document.querySelector('.portfolio-composition');
    const globalLayer = composition?.querySelector('.portfolio-canvas-layer:not(.portfolio-canvas-layer--section)') || null;
    const rect = currentSection?.getBoundingClientRect() || layerRef.current?.getBoundingClientRect() || globalLayer?.getBoundingClientRect();
    if (!rect) return;
    if (dragRef.current.mode === 'resize') {
      const start = dragRef.current;
      const coordinateNode = currentSection || layerRef.current;
      const scaleY = rect.height / (coordinateNode?.offsetHeight || rect.height || 1);
      const localHeight = coordinateNode?.offsetHeight || rect.height / scaleY;
      const maxWidth = Math.max(8, 100 - element.x);
      const maxHeight = Math.max(30, localHeight * (1 - element.y / 100));
      const resizeRect = coordinateNode?.getBoundingClientRect() || rect;
      const width = Math.max(8, Math.min(maxWidth, start.startWidth + ((event.clientX - start.startX) / resizeRect.width) * 100));
      const height = Math.max(30, Math.min(maxHeight, start.startHeight + (event.clientY - start.startY) / scaleY));
      onUpdate?.(element.id, { width, height });
      return;
    }
    // Section layers are intentionally local to each section. Detect a section
    // under the pointer before applying the local-layer clamp so an element can
    // actually cross that boundary and be assigned to its new section.
    const destinationSection = allowSectionDrop && [...document.querySelectorAll('[data-section-id]')]
      .map((node) => ({ node, rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom)
      .sort((a, b) => Math.abs((a.rect.top + a.rect.bottom) / 2 - event.clientY) - Math.abs((b.rect.top + b.rect.bottom) / 2 - event.clientY))[0]?.node;
    const coordinateNode = destinationSection || globalLayer || currentSection || layerRef.current;
    const coordinateRect = coordinateNode?.getBoundingClientRect() || rect;
    const movingToSection = Boolean(destinationSection && destinationSection.dataset.sectionId !== dragRef.current.currentSectionId);
    const elementWidth = movingToSection ? element.type === 'image' ? 30 : element.type === 'text' ? 44 : element.type === 'icon' ? 14 : 22 : element.width;
    const localHeight = coordinateNode?.offsetHeight || coordinateRect.height;
    const maxX = Math.max(0, Math.min(96, 100 - elementWidth));
    const maxY = Math.max(0, 100 - (element.height / localHeight) * 100);
    const x = Math.max(0, Math.min(maxX, ((event.clientX - coordinateRect.left - dragRef.current.offsetX) / coordinateRect.width) * 100));
    const y = Math.max(0, Math.min(maxY, ((event.clientY - coordinateRect.top - dragRef.current.offsetY) / coordinateRect.height) * 100));
    const patch = destinationSection ? { sectionId: destinationSection.dataset.sectionId, x, y } : { ...(dragRef.current.currentSectionId ? { sectionId: '' } : {}), x, y };
    if (destinationSection) {
      dragRef.current.currentSectionId = destinationSection.dataset.sectionId;
      dragRef.current.element = { ...element, ...patch, width: elementWidth, sectionCanvasVersion: 1 };
    } else {
      dragRef.current.currentSectionId = null;
    }
    onUpdate?.(element.id, patch);
  };
  const stopDrag = () => { dragRef.current = null; window.removeEventListener('pointermove', pointerMove); window.removeEventListener('pointerup', stopDrag); window.removeEventListener('pointercancel', stopDrag); };
  const startDrag = (event, element) => {
    if (!editable || event.button !== 0) return;
    if (event.currentTarget.matches?.('.portfolio-canvas-element__handle')) event.preventDefault();
    event.stopPropagation();
    onSelect?.(element.id);
    const rect = layerRef.current.getBoundingClientRect();
    dragRef.current = {
      element,
      currentSectionId: sectionBound ? element.sectionId || null : null,
      startClientX: event.clientX,
      startClientY: event.clientY,
      offsetX: event.clientX - (rect.left + (element.x / 100) * rect.width),
      offsetY: event.clientY - (rect.top + (element.y / 100) * rect.height),
    };
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', stopDrag, { once: true });
    window.addEventListener('pointercancel', stopDrag, { once: true });
  };
  const startResize = (event, element) => {
    if (!editable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(element.id);
    const coordinateNode = sectionBound && element.sectionId
      ? [...document.querySelectorAll('[data-section-id]')].find((node) => node.dataset.sectionId === element.sectionId)
      : layerRef.current;
    const coordinateRect = coordinateNode?.getBoundingClientRect();
    const scaleY = coordinateRect?.height / (coordinateNode?.offsetHeight || coordinateRect?.height || 1) || 1;
    const renderedHeight = event.currentTarget.parentElement?.getBoundingClientRect().height || 0;
    dragRef.current = { element, mode: 'resize', isDragging: true, startX: event.clientX, startY: event.clientY, startWidth: element.width, startHeight: Math.max(element.height, renderedHeight / scaleY) };
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', stopDrag, { once: true });
    window.addEventListener('pointercancel', stopDrag, { once: true });
  };
  return <div className={`portfolio-canvas-layer ${sectionBound ? 'portfolio-canvas-layer--section' : ''}`} ref={layerRef} aria-label="Custom portfolio elements">
    {elements.map((element) => {
      const layoutElement = element;
      const style = { left: `${layoutElement.x}%`, top: `${layoutElement.y}%`, width: `${layoutElement.width}%`, ...(element.type === 'text' ? { minHeight: `${layoutElement.height}px` } : {}), color: element.color, fontSize: `${element.fontSize}px` };
      const selected = editable && selectedId === element.id;
      return <div key={element.id} className={`portfolio-canvas-element portfolio-canvas-element--${element.type} ${editable ? 'is-editable' : ''} ${selected ? 'is-selected' : ''}`} style={style} onPointerDown={(event) => { if (event.pointerType !== 'touch') startDrag(event, layoutElement); }} onClick={(event) => editable && onSelect?.(element.id, event.currentTarget.getBoundingClientRect())}>
        {editable && <button type="button" className="portfolio-canvas-element__handle" aria-label={`Move ${element.type} element`} title="Drag to move" onPointerDown={(event) => startDrag(event, layoutElement)}>✥</button>}
        {element.type === 'text' && <div className="portfolio-canvas-element__text">{element.text || 'Your text'}</div>}
        {element.type === 'icon' && <PortfolioIcon name={element.iconName} className="portfolio-canvas-element__icon" style={{ height: `${element.height}px` }} />}
        {element.type === 'image' && (element.image ? <img src={element.image} alt="Custom portfolio element" draggable={false} style={{ height: `${element.height}px`, objectFit: element.imageFit === 'contain' ? 'contain' : 'cover' }} /> : <span className="portfolio-canvas-element__empty">Add a photo from the Elements panel</span>)}
        {element.type === 'rectangle' && <div className="portfolio-canvas-element__shape" style={{ height: `${element.height}px`, background: element.color }} />}
        {element.type === 'circle' && <div className="portfolio-canvas-element__shape portfolio-canvas-element__shape--circle" style={{ height: `${element.height}px`, background: element.color }} />}
        {element.type === 'line' && <div className="portfolio-canvas-element__shape portfolio-canvas-element__shape--line" style={{ height: `${element.height}px`, background: element.color }} />}
        {editable && element.type !== 'line' && <button type="button" className="portfolio-canvas-element__resize" aria-label={`Resize ${element.type} element`} title="Drag to resize" onPointerDown={(event) => startResize(event, layoutElement)} />}
      </div>;
    })}
  </div>;
}

function IPortfolioFrame({ portfolio, editable, onContentChange, onImageSelect, onUndo, onRedo, onZoomWheel }) {
  const frameRef = useRef(null);
  const stateRef = useRef({ editable, content: portfolio.templateContent || [], images: portfolio.templateImages || [], onContentChange, onImageSelect, onUndo, onRedo, onZoomWheel });

  useEffect(() => {
    stateRef.current = { editable, content: portfolio.templateContent || [], images: portfolio.templateImages || [], onContentChange, onImageSelect, onUndo, onRedo, onZoomWheel };
    const imageNodes = frameRef.current?.contentDocument?.querySelectorAll('img') || [];
    imageNodes.forEach((node, index) => {
      if (portfolio.templateImages?.[index]) node.src = portfolio.templateImages[index];
      else if (node.dataset.pagecraftOriginalSrc) node.src = node.dataset.pagecraftOriginalSrc;
    });
  }, [editable, portfolio.templateContent, portfolio.templateImages, onContentChange, onImageSelect, onUndo, onRedo, onZoomWheel]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const attachEditor = () => {
      const doc = frame.contentDocument;
      const current = stateRef.current;
      if (!doc?.body) return;
      if (doc.__pagecraftWheelZoom) doc.removeEventListener('wheel', doc.__pagecraftWheelZoom, true);
      doc.__pagecraftWheelZoom = (event) => {
        const currentState = stateRef.current;
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        currentState.onZoomWheel?.(event.deltaY);
      };
      doc.addEventListener('wheel', doc.__pagecraftWheelZoom, { capture: true, passive: false });
      let cursorStyle = doc.getElementById('pagecraft-custom-cursor-style');
      if (!cursorStyle) {
        cursorStyle = doc.createElement('style');
        cursorStyle.id = 'pagecraft-custom-cursor-style';
        doc.head.appendChild(cursorStyle);
      }
      cursorStyle.textContent = `body,body *{cursor:url("${pagecraftCursor}") 5 5,auto!important}input[type="text"],input[type="search"],input[type="email"],input[type="url"],input[type="tel"],input[type="password"],input[type="number"],textarea,[contenteditable="true"]{cursor:text!important}`;
      doc.onkeydown = current.editable ? (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        const key = event.key.toLowerCase();
        if (key === 'z' && event.shiftKey && current.onRedo) {
          event.preventDefault();
          current.onRedo();
        } else if (key === 'z' && current.onUndo) {
          event.preventDefault();
          current.onUndo();
        } else if (key === 'y' && current.onRedo) {
          event.preventDefault();
          current.onRedo();
        }
      } : null;

      const collectTextNodes = () => {
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!node.nodeValue?.trim() || !parent || parent.closest('script,style,noscript,svg,.typed,.typed-cursor,[data-pagecraft-text-id]')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        });
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        return textNodes;
      };

      const imageNodes = [...doc.querySelectorAll('img')];
      imageNodes.forEach((node, index) => {
        if (current.editable && !node.dataset.pagecraftOriginalSrc) node.dataset.pagecraftOriginalSrc = node.getAttribute('src') || '';
        if (current.images[index]) node.src = current.images[index];
        if (current.editable) {
          node.dataset.pagecraftImageId = String(index);
          node.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          current.onImageSelect?.(index);
          };
          node.style.cursor = 'pointer';
        }
      });

      if (!current.editable) {
        const textNodes = collectTextNodes();
        if (current.content.length) textNodes.forEach((node, index) => {
          if (current.content[index] !== undefined) node.nodeValue = current.content[index];
        });
        textNodes.forEach(linkifyIframeTextNode);
        return;
      }

      let imageStyle = doc.getElementById('pagecraft-inline-image-style');
      if (current.editable && !imageStyle) {
        imageStyle = doc.createElement('style');
        imageStyle.id = 'pagecraft-inline-image-style';
        imageStyle.textContent = '[data-pagecraft-image-id]:hover{outline:2px dashed #149ddd;outline-offset:3px}';
        doc.head.appendChild(imageStyle);
      }

      let editableNodes = [...doc.querySelectorAll('[data-pagecraft-text-id]')];
      if (!editableNodes.length) editableNodes = collectTextNodes().map((node, index) => {
        const span = doc.createElement('span');
        span.dataset.pagecraftTextId = String(index);
        span.textContent = node.nodeValue;
        node.replaceWith(span);
        return span;
      });

      let style = doc.getElementById('pagecraft-inline-editor-style');
      if (!style) {
        style = doc.createElement('style');
        style.id = 'pagecraft-inline-editor-style';
        style.textContent = '[data-pagecraft-text-id][contenteditable="true"]:hover{outline:1px dashed #149ddd;outline-offset:2px;cursor:text}[data-pagecraft-text-id][contenteditable="true"]:focus{outline:2px solid #149ddd;outline-offset:2px;background-color:#149ddd12}';
        doc.head.appendChild(style);
      }

      const values = editableNodes.map((node) => node.textContent || '');
      if (current.content.length) {
        editableNodes.forEach((node, index) => {
          if (current.content[index] !== undefined) node.textContent = current.content[index];
          updateIframeAnchorFromText(node);
        });
      } else {
        editableNodes.forEach(updateIframeAnchorFromText);
      }

      editableNodes.forEach((node) => {
        node.contentEditable = String(current.editable);
        node.spellcheck = current.editable;
        const anchor = node.parentElement?.closest('a');
        if (anchor) anchor.onclick = (event) => { if (stateRef.current.editable) event.preventDefault(); };
        node.oninput = current.editable ? () => {
          updateIframeAnchorFromText(node);
          const next = editableNodes.map((editableNode) => editableNode.textContent || '');
          current.onContentChange?.(next);
        } : null;
      });
      if (!current.content.length) current.content = values;
    };

    frame.addEventListener('load', attachEditor);
    if (frame.contentDocument?.readyState === 'complete') attachEditor();
    return () => frame.removeEventListener('load', attachEditor);
  }, []);

  return <iframe ref={frameRef} className="iportfolio-frame" src="/templates/iPortfolio-1.0.0/index.html" title="iPortfolio website editor" />;
}

function GrungePortfolio({ portfolio, sections, header, editable, onUpdate, onUploadImage, sectionHref }) {
  const wallpaperStyle = { '--grunge-wallpaper': `url("${grungeWallpaper}")` };
  const headerSection = (section, index) => (
    <header className="grunge-hero" id="grunge-hero" key={section.id}>
      <div className="grunge-hero__copy">
        <p className="grunge-hero__intro">{editable ? <textarea ref={resizeTextarea} aria-label="Introduction" value={section.body || ''} onChange={(event) => { onUpdate(section.id, 'body', event.target.value); resizeTextarea(event.currentTarget); }} rows={4} /> : <LinkifiedText>{section.body || ''}</LinkifiedText>}</p>
        <span className="grunge-kicker">{String(index + 1).padStart(2, '0')} / Available for work</span>
        {editable ? <input className="grunge-display grunge-display--name" aria-label="Your name" value={section.title || ''} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h1 className="grunge-display grunge-display--name">{section.title || 'Your name'}</h1>}
        <div className="grunge-hero__links">{sectionHref('projects') && <a href={sectionHref('projects')}>Explore selected works <span>↓</span></a>}{sectionHref('contact') && <a href={sectionHref('contact')}>Start a project <span>↗</span></a>}</div>
      </div>
      <figure className="grunge-hero__portrait">{section.image ? <img src={section.image} alt="Portfolio owner" /> : <div className="grunge-hero__placeholder"><img src={grungeSymbol} alt="" /><span>{(section.title || 'P').trim().charAt(0).toUpperCase()}</span></div>}{editable && <label className="grunge-profile-upload">{section.image ? 'Change portrait' : 'Upload portrait'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={section.image ? 'Change profile portrait' : 'Upload profile portrait'} onChange={(event) => onUploadImage?.(event.target.files?.[0], (url) => onUpdate(section.id, 'image', url))} /></label>}<figcaption>PROFILE / {portfolio.title}</figcaption></figure>
    </header>
  );

  return (
    <div className="portfolio-world portfolio-world--grunge" style={wallpaperStyle}>
      <div className="grunge-noise" aria-hidden="true" />
      <nav className="grunge-nav" aria-label="Portfolio navigation">
        <a className="grunge-nav__identity" href="#grunge-hero"><img src={grungeSymbol} alt="" /><span>{header?.title || portfolio.title}</span></a>
        <div className="grunge-nav__links">{[['projects', 'Works'], ['about', 'About'], ['contact', 'Contact']].filter(([type]) => sectionHref(type)).map(([type, label], index) => <a key={type} href={sectionHref(type)}>{String(index + 1).padStart(2, '0')}. {label}</a>)}</div>
      </nav>
      <main className="grunge-page">
        {sections.map((section, index) => {
          if (section.type === 'header') return headerSection(section, index);
          const label = SECTION_LIBRARY[section.type]?.label || section.type;
          return (
            <section className={`grunge-section grunge-section--${section.type}`} id={`grunge-${section.type}-${index}`} key={section.id}>
              <div className="grunge-section__index">{String(index + 1).padStart(2, '0')}<span> / {String(sections.length).padStart(2, '0')}</span></div>
              <div className="grunge-section__content">
                <span className="grunge-kicker">{label}</span>
                {editable ? <input className="grunge-display grunge-display--section" aria-label={`${label} heading`} value={section.title || ''} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h2 className="grunge-display grunge-display--section">{section.title || label}</h2>}
                {section.image && <img className="grunge-section__image" src={section.image} alt={`${label} visual`} />}
                {editable ? <textarea ref={resizeTextarea} className="grunge-section__body" aria-label={`${label} content`} value={section.body || ''} onChange={(event) => { onUpdate(section.id, 'body', event.target.value); resizeTextarea(event.currentTarget); }} rows={Math.max(3, String(section.body || '').split('\n').length)} /> : <p className="grunge-section__body"><LinkifiedText>{section.body || ''}</LinkifiedText></p>}
              </div>
              <div className="grunge-divider" aria-hidden="true"><img className="grunge-divider__symbol" src={grungeSymbol} alt="" /><img className="grunge-divider__barcode" src={grungeBarcode} alt="" /></div>
            </section>
          );
        })}
        <footer className="grunge-footer"><div><span>{header?.title || portfolio.title}</span><small>Independent creative portfolio</small></div><img src={grungeBarcode} alt="" /><div className="grunge-footer__credit"><span>Built with Pagecraft</span><small>Design adapted from Grunge by Jess Gaspar · ThemeWagon</small></div></footer>
      </main>
    </div>
  );
}
