import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, clearSession } from '../lib/api';
import { SECTION_LIBRARY, TEMPLATES } from '../data/templates';
import grungeWallpaper from '../assets/grunge/bg.jpg';
import './Home.css';

const FILTERS = ['All', 'Portfolio', 'Resume', 'Case study'];

const TEMPLATE_PREVIEW_COPY = {
  'professional-portfolio': ['Alex Morgan', 'Product designer', 'SELECTED WORK'],
  'developer-portfolio': ['Build useful things.', 'Full stack developer', 'RECENT BUILDS'],
  'student-resume': ['Jordan Lee', 'Computer science student', 'EDUCATION'],
  'creative-portfolio': ['Make ideas matter.', 'Art direction · Design', 'SELECTED PROJECTS'],
  'ux-case-study': ['A clearer way to book.', 'Research · Design · Results', 'THE OUTCOME'],
  'photographer-portfolio': ['Quiet moments.', 'Photo journal · 2026', 'THE COLLECTION'],
  'folio-freelancer': ['Elliott Studio', 'Independent designer', 'FEATURED WORK'],
  'grunge-portfolio': ['Peter Jones', 'Creative direction', 'SELECTED WORKS'],
  'iportfolio-bootstrap': ['Alex Smith', 'Designer & developer', 'FEATURED PROJECTS'],
  'resume-blue-corporate': ['Olivia Sanchez', 'Administrative manager', 'EXPERIENCE'],
  'resume-black-white-a4': ['Anaisha Parvati', 'Operations manager', 'EXPERIENCE'],
  'resume-minimalist-cv': ['Isabel Mercado', 'Marketing manager', 'EXPERTISE'],
  'editorial-studio-portfolio': ['Maya Chen', 'Art direction & digital', 'SELECTED STORIES'],
  'midnight-creative-portfolio': ['Noah Rivera', 'Creative developer', 'AFTER HOURS'],
  'product-designer-portfolio': ['Jordan Lee', 'Product designer', 'WORK, WITH OUTCOMES'],
  'architect-portfolio': ['Avery Morgan', 'Architecture & interiors', 'SPACES IN FOCUS'],
};

function HomeTemplatePreview({ template }) {
  const [name, role, feature] = TEMPLATE_PREVIEW_COPY[template.templateId] || ['Your name', 'Your role', 'Selected work'];
  const isResume = template.category === 'resume';
  return <div className={`home__template-preview home__template-preview--page home__template-preview--${template.templateId}`} aria-hidden="true">
    <div className="home__mini-page">
      <div className="home__mini-nav"><b>{template.templateId === 'grunge-portfolio' ? 'G/P' : template.templateId.startsWith('resume-') || template.templateId === 'student-resume' ? 'PROFILE / CV' : 'PORTFOLIO'}</b><span>ABOUT</span><span>WORK</span><span>CONTACT</span></div>
      <div className={`home__mini-hero ${isResume ? 'home__mini-hero--resume' : ''}`}>
        <div className="home__mini-copy"><i>{template.templateId === 'grunge-portfolio' ? 'DESIGNER · AVAILABLE FOR WORK' : 'INTRODUCTION'}</i><strong>{name}</strong><small>{role}</small><em>Explore work ↗</em></div>
        {!isResume && <div className="home__mini-portrait"><span>{name.trim().charAt(0)}</span><i /></div>}
      </div>
      <div className="home__mini-work"><div className="home__mini-section"><b>{feature}</b><span /></div><div className={`home__mini-tiles ${template.templateId === 'photographer-portfolio' || template.templateId === 'architect-portfolio' ? 'home__mini-tiles--gallery' : ''}`}><i /><i /><i /></div></div>
    </div>
    <span className="home__preview-editable"><span aria-hidden="true">✳</span> Fully editable</span>
  </div>;
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeNav = requestedTab === 'projects' || requestedTab === 'account' ? requestedTab : 'templates';
  const [activeFilter, setActiveFilter] = useState('All');
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const hasLoaded = useRef(false);
  const autoCreateStarted = useRef(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const changeNav = (tab) => {
    if (tab === activeNav) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };

  const load = () => {
    setLoading(true);
    return api('/api/portfolios').then(setPortfolios).catch((err) => {
      setError(err.message);
      if (err.status === 401 || err.message.toLowerCase().includes('sign in') || err.message.toLowerCase().includes('session')) {
        clearSession(); navigate('/');
      }
    }).finally(() => setLoading(false));
  };
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    load();
  }, []);

  const createPortfolio = async (template) => {
    setBusy(true); setError('');
    try {
      const grungeCopy = {
        header: { title: 'Peter Jones', body: 'Hey there! I specialize in crafting unique, eye-catching designs that help small businesses stand out in a crowded market.' },
        projects: { title: 'Selected Works', body: 'A selection of independent projects, visual identities, and digital experiences. Add a featured project image below.' },
        services: { title: 'Services', body: '01. Web design\nDigital experiences built to engage users and tell a clear brand story.\n\n02. Product design\nThoughtful products shaped around the people who use them.\n\n03. Branding\nDistinctive visual systems made to be remembered.' },
        about: { title: 'About', body: 'I’m a creative problem-solver working at the intersection of design, strategy, and human behavior. I help brands and startups turn complex challenges into intuitive, useful experiences.' },
        experience: { title: 'Experience', body: 'Independent designer · 2021—Now\nPartnering with ambitious teams to build thoughtful digital products.' },
        education: { title: 'Education', body: 'Add your education, training, and creative practice here.' },
        faq: { title: 'FAQ', body: 'Project timelines vary with scope. Share a few details about your project and I’ll help you find the right next step.' },
        contact: { title: 'Let’s work together', body: 'Have a good project in mind? Get in touch and tell me what you are building.' },
      };
      const iPortfolioCopy = {
        header: { title: 'Alex Smith', body: "I'm Designer, Developer, Freelancer, Photographer" },
        about: { title: 'About', body: 'Magnam dolores commodi suscipit. Necessitatibus eius consequatur ex aliquid fuga eum quidem. Sit sint consectetur velit. Quisquam quos quisquam cupiditate. Et nemo qui impedit suscipit alias ea. Quia fugiat sit in iste officiis commodi quidem hic quas.' },
        experience: { title: 'Resume', body: 'Original iPortfolio resume content is preserved in the supplied site.' },
        projects: { title: 'Portfolio', body: 'Original iPortfolio portfolio items are preserved in the supplied site.' },
        services: { title: 'Services', body: 'Original iPortfolio services content is preserved in the supplied site.' },
        testimonials: { title: 'Testimonials', body: 'Original iPortfolio testimonials are preserved in the supplied site.' },
        contact: { title: 'Contact', body: 'Original iPortfolio contact section is preserved in the supplied site.' },
      };
      const isIPortfolio = template?.templateId === 'iportfolio-bootstrap';
      const draft = {
        title: template ? `${template.name} draft` : 'Untitled portfolio',
        templateId: template?.templateId || 'professional-portfolio',
        theme: template?.theme,
        sections: (template?.sections || ['header', 'about', 'projects', 'contact']).map((type, index) => ({
          id: `${type}-${Date.now()}-${index}`, type,
          title: template?.templateId === 'grunge-portfolio' ? grungeCopy[type]?.title || SECTION_LIBRARY[type]?.label || type : isIPortfolio ? iPortfolioCopy[type]?.title || SECTION_LIBRARY[type]?.label || type : template?.defaultContent?.[type]?.title || (type === 'header' ? 'Your name' : SECTION_LIBRARY[type]?.label || type),
          body: template?.templateId === 'grunge-portfolio' ? grungeCopy[type]?.body || `Add your ${SECTION_LIBRARY[type]?.label?.toLowerCase() || type} here.` : isIPortfolio ? iPortfolioCopy[type]?.body || '' : template?.defaultContent?.[type]?.body || (type === 'header' ? 'Your role · A short introduction about what you do.' : `Add your ${SECTION_LIBRARY[type]?.label?.toLowerCase() || type} here. Tell visitors what makes your work worth exploring.`),
          image: template?.defaultImages?.[type] || '',
        })),
      };
      const draftId = `draft-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
      sessionStorage.setItem(`pagecraft:unsaved-draft:${draftId}`, JSON.stringify(draft));
      navigate(`/editor/${draftId}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const templateId = searchParams.get('template');
    if (!templateId || autoCreateStarted.current) return;
    const template = TEMPLATES.find((item) => item.templateId === templateId);
    if (!template) return;
    autoCreateStarted.current = true;
    createPortfolio(template);
  }, [searchParams]);

  const duplicate = async (id) => { try { await api(`/api/portfolios/${id}/duplicate`, { method: 'POST' }); await load(); } catch (err) { setError(err.message); } };
  const remove = async (portfolio) => {
    if (!window.confirm(`Delete “${portfolio.title}”? This cannot be undone.`)) return;
    try { await api(`/api/portfolios/${portfolio.id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err.message); }
  };
  const templates = TEMPLATES.filter((template) => activeFilter === 'All' || template.category === activeFilter.toLowerCase().replace(' ', '-'));

  return (
    <div className="home">
      <header className="home__topbar">
        <Link to="/home" className="home__brand">Page<span>craft</span></Link>
        <nav className="home__nav" aria-label="Dashboard">
          {[['templates', 'Templates'], ['projects', 'My portfolios'], ['account', 'Account']].map(([id, label]) => <button type="button" key={id} className={`home__nav-item ${activeNav === id ? 'home__nav-item--active' : ''}`} aria-current={activeNav === id ? 'page' : undefined} onClick={() => changeNav(id)}>{label}</button>)}
        </nav>
        <button className="home__create-btn" onClick={() => createPortfolio()} disabled={busy}>＋ Create portfolio</button>
      </header>
      <main className="home__main">
        {error && <p className="home__error" role="alert">{error}</p>}
        {activeNav === 'templates' && <>
          <div className="home__header"><div><span className="home__eyebrow">YOUR NEXT PAGE STARTS HERE</span><h1 className="home__title">Choose a template</h1><p className="home__subtitle">Pick a starting point. You can change everything later.</p></div></div>
          <div className="home__filters" role="group" aria-label="Filter templates">{FILTERS.map((filter) => <button type="button" key={filter} className={`home__filter-tab ${activeFilter === filter ? 'home__filter-tab--active' : ''}`} aria-pressed={activeFilter === filter} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div>
          {templates.length === 0 && <div className="home__empty"><h2>No templates in this category yet</h2><p>Try another category to find a starting point.</p></div>}
          {templates.length > 0 && <section className="home__grid" aria-label="Available templates">{templates.map((template) => <article className={`home__template-card home__template-card--${template.templateId}`} data-template-id={template.templateId} key={template.templateId} style={{ '--template-color': `var(--color-${template.accent})`, '--grunge-wallpaper': `url(${grungeWallpaper})` }}>
            <HomeTemplatePreview template={template} />
            <div className="home__template-info"><div className="home__template-copy"><div className="home__template-meta"><span>{FILTERS.find((filter) => filter.toLowerCase().replace(' ', '-') === template.category) || 'Portfolio'}</span><span>{template.sections.length} sections</span></div><h2>{template.name}</h2><p>{template.purpose}</p></div><button onClick={() => createPortfolio(template)} disabled={busy}>{busy ? 'Creating…' : 'Use template'} <span aria-hidden="true">↗</span></button></div>
          </article>)}</section>}
        </>}
        {activeNav === 'projects' && <><div className="home__header"><div><span className="home__eyebrow">YOUR WORKSPACE</span><h1 className="home__title">My portfolios</h1><p className="home__subtitle">Open, duplicate, and publish your pages.</p></div></div>{loading ? <div className="home__loading" role="status">Loading your portfolios…</div> : portfolios.length ? <div className="home__projects">{portfolios.map((portfolio) => <article className="home__project-card" key={portfolio.id}><div className="home__project-art" style={{ background: portfolio.theme?.accent || '#e6e51e' }}><span>{portfolio.title.slice(0, 1).toUpperCase()}</span></div><div className="home__project-main"><h2>{portfolio.title}</h2><p>{portfolio.sections?.length || 0} sections · Updated {new Date(portfolio.updatedAt).toLocaleDateString()}</p><span className={`home__status ${portfolio.published ? 'is-published' : ''}`}>{portfolio.published ? 'Published' : 'Draft'}{portfolio.published ? ` · ${portfolio.visits || 0} visits` : ''}</span></div><div className="home__project-actions"><button type="button" onClick={() => navigate(`/editor/${portfolio.id}`)}>Edit</button><button type="button" onClick={() => duplicate(portfolio.id)}>Duplicate</button>{portfolio.published && <a href={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer">View public page</a>}<button type="button" className="is-danger" onClick={() => remove(portfolio)}>Delete</button></div></article>)}</div> : <div className="home__empty"><h2>No portfolios yet</h2><p>Choose a template to create your first page.</p><button type="button" onClick={() => changeNav('templates')}>Browse templates</button></div>}</>}
        {activeNav === 'account' && <><div className="home__header"><div><span className="home__eyebrow">ACCOUNT</span><h1 className="home__title">Your profile</h1><p className="home__subtitle">Account details and session settings.</p></div></div><div className="home__account-card"><div className="home__avatar">{(user?.name || user?.email || 'P').slice(0, 1).toUpperCase()}</div><div><h2>{user?.name || 'Pagecraft user'}</h2><p>{user?.email || ''}</p><p>Signed in with {user?.provider || 'local account'}</p></div><button onClick={() => { clearSession(); navigate('/'); }}>Sign out</button></div></>}
      </main>
    </div>
  );
}
