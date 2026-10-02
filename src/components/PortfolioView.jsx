import { useEffect, useRef } from 'react';
import { SECTION_LIBRARY } from '../data/templates';
import ResumePortfolio, { isResumeTemplate } from './ResumePortfolio';
import LinkifiedText, { getLinkifiedParts } from './LinkifiedText';
import grungeWallpaper from '../assets/grunge/bg.jpg';
import grungeSymbol from '../assets/grunge/symbolWhite.svg';
import grungeBarcode from '../assets/grunge/barcode.svg';

const FOLIO_LINKS = [
  ['services', 'Services'],
  ['projects', 'Work'],
  ['about', 'About'],
  ['testimonials', 'Kind words'],
  ['contact', 'Contact'],
];

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

export function PortfolioView({ portfolio, editable = false, onUpdate, onTemplateContentChange, onTemplateImageSelect, onUndo, onRedo, onUploadImage }) {
  const theme = portfolio?.theme || {};
  const sections = portfolio?.sections || [];
  const isFolio = portfolio?.templateId === 'folio-freelancer';
  const isGrunge = portfolio?.templateId === 'grunge-portfolio';
  const isIPortfolio = portfolio?.templateId === 'iportfolio-bootstrap';
  const header = sections.find((section) => section.type === 'header');
  const style = {
    '--portfolio-accent': theme.accent || '#e6e51e',
    '--portfolio-background': theme.background || '#fff',
    '--portfolio-font': theme.font || 'Inter',
  };
  const sectionHref = (type) => {
    const index = sections.findIndex((section) => section.type === type);
    if (index < 0) return null;
    return isGrunge ? `#grunge-${type}-${index}` : `#folio-section-${type}-${index}`;
  };

  if (isIPortfolio) return <IPortfolioFrame portfolio={portfolio} editable={editable} onContentChange={onTemplateContentChange} onImageSelect={onTemplateImageSelect} onUndo={onUndo} onRedo={onRedo} />;
  if (isGrunge) return <GrungePortfolio portfolio={portfolio} sections={sections} header={header} editable={editable} onUpdate={onUpdate} onUploadImage={onUploadImage} sectionHref={sectionHref} />;
  if (isResumeTemplate(portfolio?.templateId)) return <ResumePortfolio portfolio={portfolio} editable={editable} onUpdate={onUpdate} />;

  return (
    <article className={`portfolio-page layout-${isFolio ? 'folio' : (theme.layout || 'modern')} ${isFolio ? 'portfolio-page--folio' : ''}`} style={style}>
      {isFolio && <nav className="folio-nav" aria-label="Portfolio navigation">
        <a className="folio-nav__brand" href="#folio-hero">{header?.title || portfolio.title}</a>
        <div className="folio-nav__links">{FOLIO_LINKS.filter(([type]) => sectionHref(type)).map(([type, label]) => <a key={type} href={sectionHref(type)}>{label}</a>)}</div>
        {sectionHref('contact') && <a className="folio-nav__cta" href={sectionHref('contact')}>Hire me <span aria-hidden="true">↗</span></a>}
      </nav>}
      <div className={isFolio ? 'folio-content' : undefined}>
        {sections.map((section, index) => {
          const label = SECTION_LIBRARY[section.type]?.label || section.type;
          const sectionId = isFolio ? `folio-section-${section.type}-${index}` : undefined;
          if (section.type === 'header') return (
            <header className={`portfolio-page__hero ${isFolio ? 'folio-hero' : ''}`} id={isFolio ? 'folio-hero' : undefined} key={section.id}>
              <div className={isFolio ? 'folio-hero__copy' : undefined}>
                {isFolio && <span className="folio-hero__availability"><i /> Available for work</span>}
                {!isFolio && <span className="portfolio-page__eyebrow">{portfolio?.title || 'Your portfolio'}</span>}
                {editable ? <input className="portfolio-page__hero-title" aria-label="Your name" value={section.title} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h1>{section.title || 'Your name'}</h1>}
                {editable ? <textarea className="portfolio-page__hero-body" aria-label="Your role and introduction" value={section.body} onChange={(event) => onUpdate(section.id, 'body', event.target.value)} rows={3} /> : <p><LinkifiedText>{section.body}</LinkifiedText></p>}
                {isFolio && <div className="folio-hero__actions">
                  {sectionHref('projects') && <a className="folio-button folio-button--dark" href={sectionHref('projects')}>View my work <span aria-hidden="true">↓</span></a>}
                  {sectionHref('contact') && <a className="folio-button folio-button--light" href={sectionHref('contact')}>Get in touch</a>}
                </div>}
              </div>
              {section.image ? <img className={`portfolio-page__image ${isFolio ? 'folio-hero__image' : ''}`} src={section.image} alt="Profile or portfolio" /> : isFolio && <div className="folio-hero__portrait" aria-hidden="true"><span>{(section.title || 'P').trim().charAt(0).toUpperCase()}</span><i /></div>}
              {portfolio?.ownerName && <small>Portfolio by {portfolio.ownerName}</small>}
            </header>
          );
          return (
            <section className={`portfolio-page__section ${isFolio ? `folio-section folio-section--${section.type}` : ''}`} id={sectionId} key={section.id}>
              {editable ? <input aria-label={`${label} heading`} value={section.title} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h2>{section.title || label}</h2>}
              {section.image && <img className="portfolio-page__image" src={section.image} alt={`${label} visual`} />}
              {editable ? <textarea aria-label={`${label} content`} value={section.body} onChange={(event) => onUpdate(section.id, 'body', event.target.value)} rows={Math.max(3, section.body.split('\n').length)} /> : <p><LinkifiedText>{section.body}</LinkifiedText></p>}
            </section>
          );
        })}
      </div>
      <footer className={`portfolio-page__footer ${isFolio ? 'folio-footer' : ''}`}>{isFolio ? <><span>{header?.title || portfolio.title}</span><span>Designed with care · Built with Pagecraft</span></> : 'Made with Pagecraft'}</footer>
    </article>
  );
}

function IPortfolioFrame({ portfolio, editable, onContentChange, onImageSelect, onUndo, onRedo }) {
  const frameRef = useRef(null);
  const stateRef = useRef({ editable, content: portfolio.templateContent || [], images: portfolio.templateImages || [], onContentChange, onImageSelect, onUndo, onRedo });

  useEffect(() => {
    stateRef.current = { editable, content: portfolio.templateContent || [], images: portfolio.templateImages || [], onContentChange, onImageSelect, onUndo, onRedo };
    const imageNodes = frameRef.current?.contentDocument?.querySelectorAll('img') || [];
    imageNodes.forEach((node, index) => {
      if (portfolio.templateImages?.[index]) node.src = portfolio.templateImages[index];
      else if (node.dataset.pagecraftOriginalSrc) node.src = node.dataset.pagecraftOriginalSrc;
    });
  }, [editable, portfolio.templateContent, portfolio.templateImages, onContentChange, onImageSelect, onUndo, onRedo]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const attachEditor = () => {
      const doc = frame.contentDocument;
      const current = stateRef.current;
      if (!doc?.body) return;
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
        <p className="grunge-hero__intro">{editable ? <textarea aria-label="Introduction" value={section.body} onChange={(event) => onUpdate(section.id, 'body', event.target.value)} rows={4} /> : <LinkifiedText>{section.body}</LinkifiedText>}</p>
        <span className="grunge-kicker">{String(index + 1).padStart(2, '0')} / Available for work</span>
        {editable ? <input className="grunge-display grunge-display--name" aria-label="Your name" value={section.title} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h1 className="grunge-display grunge-display--name">{section.title}</h1>}
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
                {editable ? <input className="grunge-display grunge-display--section" aria-label={`${label} heading`} value={section.title} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h2 className="grunge-display grunge-display--section">{section.title || label}</h2>}
                {section.image && <img className="grunge-section__image" src={section.image} alt={`${label} visual`} />}
                {editable ? <textarea className="grunge-section__body" aria-label={`${label} content`} value={section.body} onChange={(event) => onUpdate(section.id, 'body', event.target.value)} rows={Math.max(3, section.body.split('\n').length)} /> : <p className="grunge-section__body"><LinkifiedText>{section.body}</LinkifiedText></p>}
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
