import { useLayoutEffect, useRef } from 'react';
import { SECTION_LIBRARY } from '../data/templates';
import LinkifiedText from './LinkifiedText';

const RESUME_LAYOUTS = new Set(['resume-blue-corporate', 'resume-black-white-a4', 'resume-minimalist-cv']);

export function isResumeTemplate(templateId) {
  return RESUME_LAYOUTS.has(templateId);
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

export default function ResumePortfolio({ portfolio, editable, onUpdate }) {
  const sections = portfolio.sections || [];
  const templateId = portfolio.templateId;
  const header = sections.find((section) => section.type === 'header');
  const contact = sections.find((section) => section.type === 'contact');
  const isMinimal = templateId === 'resume-minimalist-cv';
  const isBlue = templateId === 'resume-blue-corporate';
  const pageClass = isBlue ? 'resume-sheet--blue' : isMinimal ? 'resume-sheet--minimal' : 'resume-sheet--monochrome';
  const themeStyle = {
    '--portfolio-accent': portfolio.theme?.accent || '#e6e51e',
    '--portfolio-background': portfolio.theme?.background || '#fff',
    '--portfolio-section': portfolio.theme?.section && portfolio.theme.section !== 'transparent' ? portfolio.theme.section : undefined,
  };

  const sectionView = (section, variant = '') => (
    <section className={`resume-section ${variant ? `resume-section--${variant}` : ''} resume-section--${section.type}`} key={section.id}>
      {editable ? <input className="resume-section__title resume-editable" aria-label={`${section.title} heading`} value={section.title || ''} onChange={(event) => onUpdate(section.id, 'title', event.target.value)} /> : <h2 className="resume-section__title">{section.title || SECTION_LIBRARY[section.type]?.label || section.type}</h2>}
      {section.type === 'skills' && variant !== 'sidebar' && !editable ? (
        <ul className="resume-skills">{(section.body || '').split('\n').filter(Boolean).map((skill, index) => <li key={`${skill}-${index}`}><LinkifiedText>{skill}</LinkifiedText></li>)}</ul>
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
    </section>
  );

  if (isMinimal) {
    const sidebarTypes = new Set(['contact', 'skills', 'languages', 'awards']);
    return (
      <article className={`resume-sheet ${pageClass}`} style={themeStyle}>
        <aside className="resume-sidebar">
          {header?.image && <img className="resume-profile-image" src={header.image} alt="Resume profile" />}
          {sections.filter((section) => sidebarTypes.has(section.type)).map((section) => sectionView(section, 'sidebar'))}
        </aside>
        <main className="resume-main">
          <header className="resume-header resume-header--minimal">
            {editable ? <input className="resume-header__name resume-editable" aria-label="Full name" value={header?.title || ''} onChange={(event) => onUpdate(header.id, 'title', event.target.value)} /> : <h1 className="resume-header__name">{header?.title}</h1>}
            {editable ? <AutoResizeTextarea className="resume-header__role resume-editable" aria-label="Professional title" value={header?.body || ''} onChange={(value) => onUpdate(header.id, 'body', value)} /> : <p className="resume-header__role">{header?.body}</p>}
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
          {editable ? <input className="resume-header__name resume-editable" aria-label="Full name" value={header?.title || ''} onChange={(event) => onUpdate(header.id, 'title', event.target.value)} /> : <h1 className="resume-header__name">{header?.title}</h1>}
        {editable ? <AutoResizeTextarea className="resume-header__role resume-editable" aria-label="Professional title" value={header?.body || ''} onChange={(value) => onUpdate(header.id, 'body', value)} /> : <p className="resume-header__role">{header?.body}</p>}
        </header>
        {contact && <div className="resume-contact resume-contact--blue">{editable ? <AutoResizeTextarea className="resume-editable" aria-label="Contact details" value={contact.body} onChange={(value) => onUpdate(contact.id, 'body', value)} /> : <LinkifiedText>{contact.body}</LinkifiedText>}</div>}
        {sections.filter((section) => !['header', 'contact'].includes(section.type)).map((section) => sectionView(section, 'blue'))}
      </article>
    );
  }

  return (
    <article className={`resume-sheet ${pageClass}`} style={themeStyle}>
      <header className="resume-header resume-header--center">
        {editable ? <input className="resume-header__name resume-editable" aria-label="Full name" value={header?.title || ''} onChange={(event) => onUpdate(header.id, 'title', event.target.value)} /> : <h1 className="resume-header__name">{header?.title}</h1>}
        {editable ? <AutoResizeTextarea className="resume-header__role resume-editable" aria-label="Professional title" value={header?.body || ''} onChange={(value) => onUpdate(header.id, 'body', value)} /> : <p className="resume-header__role">{header?.body}</p>}
      </header>
      {contact && <div className="resume-contact resume-contact--monochrome">{editable ? <AutoResizeTextarea className="resume-editable" aria-label="Contact details" value={contact.body} onChange={(value) => onUpdate(contact.id, 'body', value)} /> : <LinkifiedText>{contact.body}</LinkifiedText>}</div>}
      {sections.filter((section) => !['header', 'contact'].includes(section.type)).map((section) => sectionView(section, 'monochrome'))}
    </article>
  );
}
