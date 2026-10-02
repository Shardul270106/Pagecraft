import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, clearSession } from '../lib/api';
import { SECTION_LIBRARY, TEMPLATES } from '../data/templates';
import grungeWallpaper from '../assets/grunge/bg.jpg';
import './Home.css';

const FILTERS = ['All', 'Portfolio', 'Resume', 'Case study'];

export default function Home() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('templates');
  const [activeFilter, setActiveFilter] = useState('All');
  const [portfolios, setPortfolios] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const hasLoaded = useRef(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const load = () => api('/api/portfolios').then(setPortfolios).catch((err) => {
    setError(err.message);
    if (err.status === 401 || err.message.toLowerCase().includes('sign in') || err.message.toLowerCase().includes('session')) {
      clearSession(); navigate('/');
    }
  });
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
      const result = await api('/api/portfolios', { method: 'POST', body: JSON.stringify({
        title: template ? `${template.name} draft` : 'Untitled portfolio',
        templateId: template?.templateId || 'professional-portfolio',
        theme: template?.theme,
        sections: (template?.sections || ['header', 'about', 'projects', 'contact']).map((type, index) => ({
          id: `${type}-${Date.now()}-${index}`, type,
          title: template?.templateId === 'grunge-portfolio' ? grungeCopy[type]?.title || SECTION_LIBRARY[type]?.label || type : isIPortfolio ? iPortfolioCopy[type]?.title || SECTION_LIBRARY[type]?.label || type : template?.defaultContent?.[type]?.title || (type === 'header' ? 'Your name' : SECTION_LIBRARY[type]?.label || type),
          body: template?.templateId === 'grunge-portfolio' ? grungeCopy[type]?.body || `Add your ${SECTION_LIBRARY[type]?.label?.toLowerCase() || type} here.` : isIPortfolio ? iPortfolioCopy[type]?.body || '' : template?.defaultContent?.[type]?.body || (type === 'header' ? 'Your role · A short introduction about what you do.' : `Add your ${SECTION_LIBRARY[type]?.label?.toLowerCase() || type} here. Tell visitors what makes your work worth exploring.`),
          image: template?.defaultImages?.[type] || '',
        })),
      }) });
      navigate(`/editor/${result.id}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const duplicate = async (id) => { try { await api(`/api/portfolios/${id}/duplicate`, { method: 'POST' }); await load(); } catch (err) { setError(err.message); } };
  const remove = async (id) => { try { await api(`/api/portfolios/${id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message); } };
  const templates = TEMPLATES.filter((template) => activeFilter === 'All' || template.category === activeFilter.toLowerCase().replace(' ', '-'));

  return (
    <div className="home">
      <header className="home__topbar">
        <Link to="/home" className="home__brand">Page<span>craft</span></Link>
        <nav className="home__nav" aria-label="Dashboard">
          {[['templates', 'Templates'], ['projects', 'My portfolios'], ['account', 'Account']].map(([id, label]) => <button key={id} className={`home__nav-item ${activeNav === id ? 'home__nav-item--active' : ''}`} onClick={() => setActiveNav(id)}>{label}</button>)}
        </nav>
        <button className="home__create-btn" onClick={() => createPortfolio()} disabled={busy}>＋ Create portfolio</button>
      </header>
      <main className="home__main">
        {error && <p className="home__error" role="alert">{error}</p>}
        {activeNav === 'templates' && <>
          <div className="home__header"><div><span className="home__eyebrow">YOUR NEXT PAGE STARTS HERE</span><h1 className="home__title">Choose a template</h1><p className="home__subtitle">Pick a starting point. You can change everything later.</p></div></div>
          <div className="home__filters">{FILTERS.map((filter) => <button key={filter} className={`home__filter-tab ${activeFilter === filter ? 'home__filter-tab--active' : ''}`} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div>
          <section className="home__grid">{templates.map((template, index) => <article className={`home__template-card ${template.templateId === 'folio-freelancer' ? 'home__template-card--folio' : ''} ${template.templateId === 'grunge-portfolio' ? 'home__template-card--grunge' : ''}`} data-template-id={template.templateId} key={template.templateId} style={{ '--template-color': `var(--color-${template.accent})`, '--grunge-wallpaper': `url(${grungeWallpaper})` }}>{template.templateId === 'grunge-portfolio' ? <div className="home__template-preview home__template-preview--grunge"><div className="home__grunge-preview"><div className="home__grunge-preview-nav"><span>GRUNGE / PORTFOLIO</span><small>01. WORK　 02. ABOUT　 03. CONTACT</small></div><div className="home__grunge-preview-hero"><div><small>DESIGNER · AVAILABLE FOR WORK</small><strong>PETER<br />JONES</strong><p>Creative direction and digital design.</p></div><img src="/grunge/peter.jpg" alt="Grunge template portrait preview" /></div><div className="home__grunge-preview-foot"><span>SELECTED WORKS</span><img src="/grunge/barcode.svg" alt="" /></div></div></div> : template.templateId === 'iportfolio-bootstrap' ? <div className="home__template-preview home__template-preview--iportfolio"><iframe src="/templates/iPortfolio-1.0.0/index.html" title="iPortfolio template preview" tabIndex="-1" /></div> : <div className={`home__template-preview home__template-preview--${index % 4}`}> {template.templateId === 'folio-freelancer' ? <div className="home__folio-preview"><div className="home__folio-nav"><b>eli<span>ott</span></b><small>Services　 Work　 About　 Contact</small></div><div className="home__folio-hero"><div><i>AVAILABLE FOR WORK</i><strong>Hi, I'm <em>Eliott</em></strong><p>Freelance designer &amp; frontend developer</p><button>View my work →</button></div><div className="home__folio-avatar">E</div></div><div className="home__folio-work"><span /><span /><span /></div></div> : <><div className="home__preview-bar" /><div className="home__preview-title" /><div className="home__preview-line" /><div className="home__preview-columns"><span /><span /></div></>}</div>}<div className="home__template-info"><div><h2>{template.name}</h2><p>{template.purpose}</p></div><button onClick={() => createPortfolio(template)} disabled={busy}>Use template</button></div></article>)}</section>
        </>}
        {activeNav === 'projects' && <><div className="home__header"><div><span className="home__eyebrow">YOUR WORKSPACE</span><h1 className="home__title">My portfolios</h1><p className="home__subtitle">Open, duplicate, and publish your pages.</p></div></div>{portfolios.length ? <div className="home__projects">{portfolios.map((portfolio) => <article className="home__project-card" key={portfolio.id}><div className="home__project-art" style={{ background: portfolio.theme?.accent || '#e6e51e' }}><span>{portfolio.title.slice(0, 1).toUpperCase()}</span></div><div className="home__project-main"><h2>{portfolio.title}</h2><p>{portfolio.sections?.length || 0} sections · Updated {new Date(portfolio.updatedAt).toLocaleDateString()}</p><span className={`home__status ${portfolio.published ? 'is-published' : ''}`}>{portfolio.published ? 'Published' : 'Draft'}{portfolio.published ? ` · ${portfolio.visits || 0} visits` : ''}</span></div><div className="home__project-actions"><button onClick={() => navigate(`/editor/${portfolio.id}`)}>Edit</button><button onClick={() => duplicate(portfolio.id)}>Duplicate</button>{portfolio.published && <a href={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer">View public page</a>}<button className="is-danger" onClick={() => remove(portfolio.id)}>Delete</button></div></article>)}</div> : <div className="home__empty"><h2>No portfolios yet</h2><p>Choose a template to create your first page.</p><button onClick={() => setActiveNav('templates')}>Browse templates</button></div>}</>}
        {activeNav === 'account' && <><div className="home__header"><div><span className="home__eyebrow">ACCOUNT</span><h1 className="home__title">Your profile</h1><p className="home__subtitle">Account details and session settings.</p></div></div><div className="home__account-card"><div className="home__avatar">{(user?.name || user?.email || 'P').slice(0, 1).toUpperCase()}</div><div><h2>{user?.name || 'Pagecraft user'}</h2><p>{user?.email || ''}</p><p>Signed in with {user?.provider || 'local account'}</p></div><button onClick={() => { clearSession(); navigate('/'); }}>Sign out</button></div></>}
      </main>
    </div>
  );
}
