import { useLayoutEffect, useRef } from 'react';
import { SECTION_LIBRARY } from '../data/templates';
import LinkifiedText from './LinkifiedText';
import { getPortfolioFontStack } from '../lib/portfolioFont';
import ProjectPhotoFrames from './ProjectPhotoFrames';

const RESUME_LAYOUTS = new Set(['student-resume', 'resume-blue-corporate', 'resume-black-white-a4', 'resume-minimalist-cv']);

export function isResumeTemplate(templateId) {
  return RESUME_LAYOUTS.has(templateId);
}

function imageCropStyle(section) {
  const zoom = Math.min(250, Math.max(100, Number(section?.imageZoom) || 100));
  const x = section?.imagePositionX ?? 50;
  const y = section?.imagePositionY ?? 50;
  return { objectPosition: `${x}% ${y}%`, transform: `scale(${zoom / 100})`, transformOrigin: 'center' };
}

function AutoResizeTextarea({ value, onChange, ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      onInput={(event) => {
        event.currentTarget.style.height = '0px';
        event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
      }}
      rows={1}
      spellCheck="false"
    />
  );
}

function getProjectEntries(section) {
  const entries = (section.body || '').split(/\n\s*\n/).filter(Boolean);
  const lastPhotoIndex = (section.galleryImages || []).reduce((last, photo, index) => photo ? index : last, -1);
  const count = Math.max(entries.length, lastPhotoIndex + 1, section.image ? 1 : 0);
  while (entries.length < count) entries.push(`Selected project ${String(entries.length + 1).padStart(2, '0')}`);
  return entries;
}

export default function ResumePortfolio({ portfolio, editable, onUpdate, onUploadImage }) {
  const sections = portfolio.sections || [];
  const templateId = portfolio.templateId;
  const header = sections.find((section) => section.type === 'header');
  const contact = sections.find((section) => section.type === 'contact');
  const isStudent = templateId === 'student-resume';
  const isMinimal = templateId === 'resume-minimalist-cv';
  const isBlue = templateId === 'resume-blue-corporate';
  const pageClass = isStudent ? 'resume-sheet--student' : isBlue ? 'resume-sheet--blue' : isMinimal ? 'resume-sheet--minimal' : 'resume-sheet--monochrome';
  const themeStyle = {
    '--portfolio-accent': portfolio.theme?.accent || '#e6e51e',
    '--portfolio-background': portfolio.theme?.background || '#fff',
    '--portfolio-section': portfolio.theme?.section && portfolio.theme.section !== 'transparent' ? portfolio.theme.section : undefined,
    '--portfolio-font': getPortfolioFontStack(portfolio.theme?.font || 'Arial'),
    backgroundColor: portfolio.theme?.background || '#fff',
  };

  const sectionView = (section, variant = '') => (
    <section className={`resume-section ${variant ? `resume-section--${variant}` : ''} resume-section--${section.type}`} key={section.id} style={{ ...(portfolio.theme?.section && portfolio.theme.section !== 'transparent' ? { backgroundColor: portfolio.theme.section } : {}), ...(section.bodyFontSize ? { '--resume-body-size': `${section.bodyFontSize}px` } : {}) }}>
      {editable ? <input className="resume-section__title resume-editable" style={section.titleFontSize ? { fontSize: `${section.titleFontSize}px` } : undefined} aria-label={`${section.title} heading`} value={section.title || ''} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h2 className="resume-section__title" style={section.titleFontSize ? { fontSize: `${section.titleFontSize}px` } : undefined}>{section.title || SECTION_LIBRARY[section.type]?.label || section.type}</h2>}
      {section.type === 'skills' && variant !== 'sidebar' && !editable ? (
        <ul className="resume-skills">{(section.body || '').split('\n').filter(Boolean).map((skill, index) => <li key={`${section.id}-${index}`}><LinkifiedText>{skill}</LinkifiedText></li>)}</ul>
      ) : ['projects', 'projects-work', 'gallery'].includes(section.type) && !editable ? (
        <div className="resume-projects">{getProjectEntries(section).map((entry, index) => { const [title, ...detail] = entry.split('\n'); const photo = section.galleryImages?.[index] || (!section.galleryImages?.length && index === 0 ? section.image : ''); const crop = section.galleryImageSettings?.[index] || { zoom: section.imageZoom, x: section.imagePositionX, y: section.imagePositionY }; return <article key={`${section.id}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h3><LinkifiedText>{title}</LinkifiedText></h3>{detail.length > 0 && <p><LinkifiedText>{detail.join('\n')}</LinkifiedText></p>}</div>{photo && <img src={photo} alt={`${title || 'Project'} photo`} style={{ objectPosition: `${crop.x ?? 50}% ${crop.y ?? 50}%`, transform: `scale(${Math.min(250, Math.max(100, Number(crop.zoom) || 100)) / 100})` }} />}</article>; })}</div>
      ) : ['experience', 'education'].includes(section.type) && !editable ? (
        <div className="resume-items">{(section.body || '').split('\n\n').filter(Boolean).map((entry, index) => {
          const lines = entry.split('\n');
          const divider = lines[0].indexOf('|');
          if (divider < 0) return <p className="resume-entry" key={`${section.id}-${index}`}><LinkifiedText>{entry}</LinkifiedText></p>;
          const first = lines[0].slice(0, divider).trim();
          const second = lines[0].slice(divider + 1).trim();
          const blue = variant === 'blue';
          const detail = lines.slice(blue ? 1 : 2).join('\n');
          return <div className={`resume-item ${blue ? 'resume-item--blue' : ''}`} key={`${section.id}-${index}`}><div className="resume-item__meta"><strong><LinkifiedText>{first}</LinkifiedText></strong>{!blue && lines[1] && <span><LinkifiedText>{lines[1]}</LinkifiedText></span>}</div><div className="resume-item__detail"><strong><LinkifiedText>{second}</LinkifiedText></strong>{detail && <p><LinkifiedText>{detail}</LinkifiedText></p>}</div></div>;
        })}</div>
      ) : editable ? (
        <AutoResizeTextarea className="resume-section__body resume-editable" aria-label={`${section.title} content`} value={section.body || ''} onChange={(value) => onUpdate(section.id, 'body', value)} />
      ) : (
        <div className="resume-section__body">{(section.body || '').split('\n\n').map((entry, index) => <p className="resume-entry" key={`${section.id}-${index}`}><LinkifiedText>{entry}</LinkifiedText></p>)}</div>
      )}
      {editable && ['projects', 'projects-work', 'gallery'].includes(section.type) && <ProjectPhotoFrames section={section} editable={editable} onUpdate={onUpdate} onUploadImage={onUploadImage} />}
    </section>
  );

  if (isStudent) {
    const sidebarTypes = new Set(['contact', 'skills']);
    return (
      <article className={`resume-sheet ${pageClass}`} style={themeStyle}>
        <header className="resume-student__masthead">
          <div>
            <span className="resume-student__eyebrow">EARLY CAREER / SELECTED WORK</span>
            {editable ? <input className="resume-header__name resume-editable" style={header?.titleFontSize ? { fontSize: `${header.titleFontSize}px` } : undefined} aria-label="Full name" value={header?.title || ''} onChange={(event) => onUpdate(header?.id, 'title', event.target.value)} /> : <h1 className="resume-header__name" style={header?.titleFontSize ? { fontSize: `${header.titleFontSize}px` } : undefined}>{header?.title || 'Your name'}</h1>}
            {editable ? <AutoResizeTextarea className="resume-header__role resume-editable" style={header?.bodyFontSize ? { fontSize: `${header.bodyFontSize}px` } : undefined} aria-label="Professional title" value={header?.body || ''} onChange={(value) => onUpdate(header?.id, 'body', value)} /> : <p className="resume-header__role" style={header?.bodyFontSize ? { fontSize: `${header.bodyFontSize}px` } : undefined}>{header?.body || 'Student · Emerging professional'}</p>}
          </div>
          {header?.image ? <span className="resume-student__portrait-frame"><img className="resume-student__portrait" src={header.image} alt={`${header?.title || 'Student'} portrait`} style={imageCropStyle(header)} /></span> : <span className="resume-student__monogram" aria-hidden="true">{(header?.title || 'Y').trim().charAt(0).toUpperCase()}</span>}
        </header>
        <div className="resume-student__grid">
          <aside className="resume-student__sidebar" aria-label="Contact and skills">
            {sections.filter((section) => sidebarTypes.has(section.type)).map((section) => sectionView(section, section.type === 'skills' ? '' : 'student'))}
          </aside>
          <main className="resume-student__main">
            {sections.filter((section) => !sidebarTypes.has(section.type) && !['header', 'contact'].includes(section.type)).map((section) => sectionView(section, 'student'))}
          </main>
        </div>
        <footer className="resume-student__footer"><span>{header?.title || portfolio.title}</span><span>Designed with Pagecraft</span></footer>
      </article>
    );
  }

  if (isMinimal) {
    const sidebarTypes = new Set(['contact', 'skills', 'languages', 'awards']);
    return (
      <article className={`resume-sheet ${pageClass}`} style={themeStyle}>
        <aside className="resume-sidebar">
          {header?.image && <span className="resume-profile-image-frame"><img className="resume-profile-image" src={header.image} alt="Resume profile" style={imageCropStyle(header)} /></span>}
          {sections.filter((section) => sidebarTypes.has(section.type)).map((section) => sectionView(section, 'sidebar'))}
        </aside>
        <main className="resume-main">
          <header className="resume-header resume-header--minimal">
            {editable ? <input className="resume-header__name resume-editable" style={header?.titleFontSize ? { fontSize: `${header.titleFontSize}px` } : undefined} aria-label="Full name" value={header?.title || ''} onChange={(event) => onUpdate(header?.id, 'title', event.target.value)} /> : <h1 className="resume-header__name" style={header?.titleFontSize ? { fontSize: `${header.titleFontSize}px` } : undefined}>{header?.title}</h1>}
            {editable ? <AutoResizeTextarea className="resume-header__role resume-editable" style={header?.bodyFontSize ? { fontSize: `${header.bodyFontSize}px` } : undefined} aria-label="Professional title" value={header?.body || ''} onChange={(value) => onUpdate(header?.id, 'body', value)} /> : <p className="resume-header__role" style={header?.bodyFontSize ? { fontSize: `${header.bodyFontSize}px` } : undefined}>{header?.body}</p>}
          </header>
          {sections.filter((section) => !sidebarTypes.has(section.type) && section.type !== 'header').map((section) => sectionView(section, 'main'))}
        </main>
      </article>
    );
  }

  if (isBlue) {
    return (
      <article className={`resume-sheet ${pageClass}`} style={themeStyle}>
        <header className="resume-header resume-header--center">
          {editable ? <input className="resume-header__name resume-editable" style={header?.titleFontSize ? { fontSize: `${header.titleFontSize}px` } : undefined} aria-label="Full name" value={header?.title || ''} onChange={(event) => onUpdate(header?.id, 'title', event.target.value)} /> : <h1 className="resume-header__name" style={header?.titleFontSize ? { fontSize: `${header.titleFontSize}px` } : undefined}>{header?.title}</h1>}
        {editable ? <AutoResizeTextarea className="resume-header__role resume-editable" style={header?.bodyFontSize ? { fontSize: `${header.bodyFontSize}px` } : undefined} aria-label="Professional title" value={header?.body || ''} onChange={(value) => onUpdate(header?.id, 'body', value)} /> : <p className="resume-header__role" style={header?.bodyFontSize ? { fontSize: `${header.bodyFontSize}px` } : undefined}>{header?.body}</p>}
        </header>
        {contact && <div className="resume-contact resume-contact--blue">{editable ? <AutoResizeTextarea className="resume-editable" aria-label="Contact details" value={contact.body} onChange={(value) => onUpdate(contact.id, 'body', value)} /> : <LinkifiedText>{contact.body}</LinkifiedText>}</div>}
        {sections.filter((section) => !['header', 'contact'].includes(section.type)).map((section) => sectionView(section, 'blue'))}
      </article>
    );
  }

  return (
    <article className={`resume-sheet ${pageClass}`} style={themeStyle}>
      <header className="resume-header resume-header--center">
        {editable ? <input className="resume-header__name resume-editable" style={header?.titleFontSize ? { fontSize: `${header.titleFontSize}px` } : undefined} aria-label="Full name" value={header?.title || ''} onChange={(event) => onUpdate(header?.id, 'title', event.target.value)} /> : <h1 className="resume-header__name" style={header?.titleFontSize ? { fontSize: `${header.titleFontSize}px` } : undefined}>{header?.title}</h1>}
        {editable ? <AutoResizeTextarea className="resume-header__role resume-editable" style={header?.bodyFontSize ? { fontSize: `${header.bodyFontSize}px` } : undefined} aria-label="Professional title" value={header?.body || ''} onChange={(value) => onUpdate(header?.id, 'body', value)} /> : <p className="resume-header__role" style={header?.bodyFontSize ? { fontSize: `${header.bodyFontSize}px` } : undefined}>{header?.body}</p>}
      </header>
      {contact && <div className="resume-contact resume-contact--monochrome">{editable ? <AutoResizeTextarea className="resume-editable" aria-label="Contact details" value={contact.body} onChange={(value) => onUpdate(contact.id, 'body', value)} /> : <LinkifiedText>{contact.body}</LinkifiedText>}</div>}
      {sections.filter((section) => !['header', 'contact'].includes(section.type)).map((section) => sectionView(section, 'monochrome'))}
    </article>
  );
}
