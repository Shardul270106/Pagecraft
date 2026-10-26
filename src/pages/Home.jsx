import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, clearSession } from '../lib/api';
import { SECTION_LIBRARY, TEMPLATES } from '../data/templates';
import ConfirmDialog from '../components/ConfirmDialog';
import grungeWallpaper from '../assets/grunge/bg.jpg';
import './Home.css';

const FILTERS = ['All', 'Portfolio', 'Resume', 'Case study'];
const previewSlug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 48) || 'your-name';

const TEMPLATE_PREVIEW_COPY = {
  'professional-portfolio': ['Alex Morgan', 'Product designer', 'SELECTED WORK'],
  'developer-portfolio': ['Build useful things.', 'Full stack developer', 'RECENT BUILDS'],
  'student-resume': ['Jordan Lee', 'Computer science student', 'EDUCATION'],
  'creative-portfolio': ['Make ideas matter.', 'Art direction · Design', 'SELECTED PROJECTS'],
  'ux-case-study': ['A clearer way to book.', 'Research · Design · Results', 'THE OUTCOME'],
  'photographer-portfolio': ['Quiet moments.', 'Photo journal · 2026', 'THE COLLECTION'],
  'folio-freelancer': ['Elliott Studio', 'Independent designer', 'FEATURED WORK'],
  'grunge-portfolio': ['Peter Jones', 'Creative direction', 'SELECTED WORKS'],
  'model-portfolio': ['Shawn Gracia', 'Model · Creative collaborator', 'PORTFOLIO'],
  'scrapbook-portfolio': ['Korina Villanueva', 'Creative storyteller', 'PHOTO SCRAPS'],
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
  const [projectType, setProjectType] = useState('all');
  const [projectSort, setProjectSort] = useState('newest');
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const hasLoaded = useRef(false);
  const autoCreateStarted = useRef(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [profileName, setProfileName] = useState(() => JSON.parse(localStorage.getItem('user') || 'null')?.name || '');
  const [profileSlug, setProfileSlug] = useState(() => JSON.parse(localStorage.getItem('user') || 'null')?.publicSlug || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const changeNav = (tab) => {
    if (tab === activeNav) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const result = await api('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: profileName, publicSlug: profileSlug }),
      });
      setUser(result.user);
      localStorage.setItem('user', JSON.stringify(result.user));
      setProfileName(result.user.name);
      setProfileSlug(result.user.publicSlug || '');
      setProfileMessage(result.message || 'Profile updated.');
      await load();
    } catch (err) {
      setProfileMessage(err.message);
    } finally {
      setProfileSaving(false);
    }
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

  useEffect(() => {
    if (activeNav !== 'projects') return undefined;
    const refreshProjects = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener('focus', refreshProjects);
    document.addEventListener('visibilitychange', refreshProjects);
    return () => {
      window.removeEventListener('focus', refreshProjects);
      document.removeEventListener('visibilitychange', refreshProjects);
    };
  }, [activeNav]);

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
      const draft = {
        title: template ? `${template.name} draft` : 'Untitled portfolio',
        templateId: template?.templateId || 'professional-portfolio',
        theme: template?.theme,
        sections: (template?.sections || ['header', 'about', 'projects', 'contact']).map((type, index) => ({
          id: `${type}-${Date.now()}-${index}`, type,
          title: template?.templateId === 'grunge-portfolio' ? grungeCopy[type]?.title || SECTION_LIBRARY[type]?.label || type : template?.defaultContent?.[type]?.title || (type === 'header' ? 'Your name' : SECTION_LIBRARY[type]?.label || type),
          body: template?.templateId === 'grunge-portfolio' ? grungeCopy[type]?.body || `Add your ${SECTION_LIBRARY[type]?.label?.toLowerCase() || type} here.` : template?.defaultContent?.[type]?.body || (type === 'header' ? 'Your role · A short introduction about what you do.' : `Add your ${SECTION_LIBRARY[type]?.label?.toLowerCase() || type} here. Tell visitors what makes your work worth exploring.`),
          image: template?.defaultImages?.[type] || '',
          galleryImages: template?.defaultGalleryBySection?.[type] || (type === 'gallery' ? template?.defaultGallery || [] : []),
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
    // Consume the one-time template handoff before opening the editor. If the
    // user presses Back, they should land on the template dashboard instead
    // of replaying this query and immediately creating another draft.
    navigate('/home', { replace: true });
    createPortfolio(template);
  }, [navigate, searchParams]);

  const duplicate = async (id) => { try { await api(`/api/portfolios/${id}/duplicate`, { method: 'POST' }); await load(); } catch (err) { setError(err.message); } };
  const remove = (portfolio) => setPendingDelete(portfolio);
  const confirmRemove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError('');
    try {
      await api(`/api/portfolios/${pendingDelete.id}`, { method: 'DELETE' });
      setPendingDelete(null);
      await load();
    } catch (err) { setError(err.message); }
    finally { setDeleting(false); }
  };
  const templates = TEMPLATES.filter((template) => activeFilter === 'All' || template.category === activeFilter.toLowerCase().replace(' ', '-'));
  const visiblePortfolios = portfolios
    .filter((portfolio) => {
      if (projectType === 'all') return true;
      const template = TEMPLATES.find((item) => item.templateId === portfolio.templateId);
      return template?.category === projectType;
    })
    .slice()
    .sort((a, b) => (projectSort === 'oldest' ? 1 : -1) * (new Date(a.updatedAt) - new Date(b.updatedAt)));

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
        {activeNav === 'projects' && <>
          <div className="home__header">
            <div><span className="home__eyebrow">YOUR WORKSPACE</span><h1 className="home__title">My portfolios</h1><p className="home__subtitle">Open, duplicate, and publish your pages.</p></div>
          </div>
          {loading ? <div className="home__loading" role="status">Loading your portfolios…</div> : portfolios.length ? <>
            <div className="home__projects-toolbar">
              <div className="home__projects-toolbar-title"><h2>Recent</h2><span>{visiblePortfolios.length} {visiblePortfolios.length === 1 ? 'portfolio' : 'portfolios'}</span></div>
              <div className="home__projects-controls">
                <label>Type<select value={projectType} onChange={(event) => setProjectType(event.target.value)}><option value="all">All types</option><option value="portfolio">Portfolio</option><option value="resume">Resume</option><option value="case-study">Case study</option></select></label>
                <label>Sort<select value={projectSort} onChange={(event) => setProjectSort(event.target.value)}><option value="newest">Recently updated</option><option value="oldest">Least recent</option></select></label>
              </div>
            </div>
            {visiblePortfolios.length ? <section className="home__projects" aria-label="Recent portfolios">{visiblePortfolios.map((portfolio) => {
              const template = TEMPLATES.find((item) => item.templateId === portfolio.templateId) || {
                templateId: 'professional-portfolio', category: 'portfolio', accent: 'highlighter-yellow', sections: portfolio.sections || [],
              };
              return <article className={`home__project-card home__project-card--${template.templateId}`} key={portfolio.id} style={{ '--project-accent': portfolio.theme?.accent || `var(--color-${template.accent})`, '--template-color': portfolio.theme?.accent || `var(--color-${template.accent})`, '--grunge-wallpaper': `url(${grungeWallpaper})` }}>
                <button type="button" className="home__project-preview" onClick={() => navigate(`/editor/${portfolio.id}`)} aria-label={`Open ${portfolio.title}`}>
                  <HomeTemplatePreview template={template} />
                  <span className="home__project-preview-open">Open portfolio <b aria-hidden="true">↗</b></span>
                </button>
                <div className="home__project-main">
                  <div className="home__project-copy"><h2>{portfolio.title}</h2><p>{portfolio.sections?.length || 0} sections · Updated {new Date(portfolio.updatedAt).toLocaleDateString()}</p></div>
                  <span className={`home__status ${portfolio.published ? 'is-published' : ''}`}>{portfolio.published ? 'Published' : 'Draft'}{portfolio.published ? ` · ${portfolio.visits || 0} visits` : ''}</span>
                </div>
                <div className="home__project-actions"><button type="button" onClick={() => navigate(`/editor/${portfolio.id}`)}>Edit</button><button type="button" onClick={() => duplicate(portfolio.id)}>Duplicate</button>{portfolio.published && <a href={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer">View live page</a>}<button type="button" className="is-danger" onClick={() => remove(portfolio)}>Delete</button></div>
              </article>;
            })}</section> : <div className="home__empty"><h2>No portfolios in this type</h2><p>Choose another type to see your recent work.</p><button type="button" onClick={() => setProjectType('all')}>Show all portfolios</button></div>}
          </> : <div className="home__empty"><h2>No portfolios yet</h2><p>Choose a template to create your first page.</p><button type="button" onClick={() => changeNav('templates')}>Browse templates</button></div>}
        </>}
        {activeNav === 'account' && <><div className="home__header"><div><span className="home__eyebrow">ACCOUNT</span><h1 className="home__title">Your profile</h1><p className="home__subtitle">Set the name and public URL people see on your portfolio links.</p></div></div><div className="home__account-card"><div className="home__avatar">{(user?.name || user?.email || 'P').slice(0, 1).toUpperCase()}</div><form className="home__profile-form" onSubmit={saveProfile}><label>Display name<input required maxLength={100} value={profileName} onChange={(event) => setProfileName(event.target.value)} autoComplete="name" /></label><label>Public URL name<input maxLength={48} value={profileSlug} onChange={(event) => setProfileSlug(event.target.value)} placeholder="Use your display name" autoComplete="off" /><small>Spaces and punctuation become hyphens. Each portfolio gets its own short code, for example <strong>/p/{previewSlug(profileSlug || profileName)}-a3f2</strong>. Leave blank to use your display name.</small></label><p className="home__profile-email">{user?.email} · Signed in with {user?.provider || 'local account'}</p>{profileMessage && <p className="home__profile-message" role="status">{profileMessage}</p>}<div className="home__profile-actions"><button type="submit" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save profile'}</button><button type="button" className="home__signout" onClick={() => { clearSession(); navigate('/'); }}>Sign out</button></div></form></div></>}
      </main>
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete portfolio?"
        message={pendingDelete ? `“${pendingDelete.title}” will be permanently deleted. This action cannot be undone.` : ''}
        confirmLabel="Delete portfolio"
        isBusy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
