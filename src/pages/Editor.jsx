import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SECTION_LIBRARY } from '../data/templates';
import { PortfolioView } from '../components/PortfolioView';
import './Editor.css';

const COLORS = ['#e6e51e', '#466cf3', '#ff8562', '#ff6b2b', '#baf3d6', '#f1e3c6', '#f34646', '#f4f4f4'];
const BACKGROUNDS = ['#ffffff', '#f7f5ee', '#f3f6ff', '#fff8f2'];
const FONTS = ['Inter', 'Poppins', 'Georgia', 'Arial'];
const initialSection = (type, index) => ({
  id: `${type}-${Date.now()}-${index}`,
  type,
  title: type === 'header' ? 'Your name' : SECTION_LIBRARY[type]?.label || type,
  body: type === 'header' ? 'Your role · A short introduction about what you do.' : `Add your ${SECTION_LIBRARY[type]?.label?.toLowerCase() || type} here. Tell visitors what makes your work worth exploring.`,
  image: '',
});

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const portfolioRef = useRef(null);
  const historyRef = useRef({ past: [], future: [], lastKey: null, lastAt: 0 });
  const [, setHistoryRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dragId, setDragId] = useState(null);
  const [newSection, setNewSection] = useState('about');
  const [publicUrl, setPublicUrl] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [selectedTemplateImage, setSelectedTemplateImage] = useState(null);
  const isIPortfolio = portfolio?.templateId === 'iportfolio-bootstrap';
  const isResume = portfolio?.templateId?.startsWith('resume-');

  const setPortfolioDirect = useCallback((next) => {
    if (portfolioRef.current?.id !== next?.id) historyRef.current = { past: [], future: [], lastKey: null, lastAt: 0 };
    portfolioRef.current = next;
    setPortfolio(next);
    setHistoryRevision((revision) => revision + 1);
  }, []);

  const setPortfolioTracked = useCallback((update, coalesceKey = null) => {
    const current = portfolioRef.current;
    if (!current) return;
    const next = typeof update === 'function' ? update(current) : update;
    if (!next || next === current) return;

    const history = historyRef.current;
    const now = Date.now();
    const coalesce = coalesceKey && history.lastKey === coalesceKey && now - history.lastAt < 700;
    if (!coalesce) history.past.push(current);
    if (history.past.length > 50) history.past.shift();
    history.future = [];
    history.lastKey = coalesceKey;
    history.lastAt = now;
    portfolioRef.current = next;
    setPortfolio(next);
    setHistoryRevision((revision) => revision + 1);
  }, []);

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (!history.past.length || !portfolioRef.current) return;
    const current = portfolioRef.current;
    history.future.push(current);
    const previous = { ...history.past.pop(), published: current.published, slug: current.slug, visits: current.visits };
    history.lastKey = null;
    history.lastAt = 0;
    portfolioRef.current = previous;
    setPortfolio(previous);
    setHistoryRevision((revision) => revision + 1);
  }, []);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (!history.future.length || !portfolioRef.current) return;
    const current = portfolioRef.current;
    history.past.push(current);
    const next = { ...history.future.pop(), published: current.published, slug: current.slug, visits: current.visits };
    history.lastKey = null;
    history.lastAt = 0;
    portfolioRef.current = next;
    setPortfolio(next);
    setHistoryRevision((revision) => revision + 1);
  }, []);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  useEffect(() => {
    if (isPreview) return undefined;
    const handleHistoryShortcut = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && event.shiftKey) {
        if (!historyRef.current.future.length) return;
        event.preventDefault();
        redo();
      } else if (key === 'z') {
        if (!historyRef.current.past.length) return;
        event.preventDefault();
        undo();
      } else if (key === 'y') {
        if (!historyRef.current.future.length) return;
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleHistoryShortcut);
    return () => window.removeEventListener('keydown', handleHistoryShortcut);
  }, [isPreview, redo, undo]);

  useEffect(() => {
    api(`/api/portfolios/${id}`).then(setPortfolioDirect).catch((error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [id, setPortfolioDirect]);

  const changeField = useCallback((field, value) => setPortfolioTracked((current) => ({ ...current, [field]: value }), `field:${field}`), [setPortfolioTracked]);
  const changeTheme = (key, value) => setPortfolioTracked((current) => ({ ...current, theme: { ...current.theme, [key]: value } }));
  const updateSection = (sectionId, field, value) => setPortfolioTracked((current) => ({
    ...current,
    sections: current.sections.map((section) => section.id === sectionId ? { ...section, [field]: value } : section),
  }), ['title', 'body'].includes(field) ? `section:${sectionId}:${field}` : null);
  const updateTemplateImage = (imageId, value) => setPortfolioTracked((current) => {
    const images = Array.from({ length: Math.max(current.templateImages?.length || 0, imageId + 1) }, (_, index) => current.templateImages?.[index] || '');
    images[imageId] = value;
    return { ...current, templateImages: images };
  });
  const uploadImage = async (file, onUploaded) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Choose an image under 5 MB.');
      return;
    }
    setMessage('Uploading image…');
    try {
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.readAsDataURL(file);
      });
      const result = await api('/api/uploads/image', { method: 'POST', body: JSON.stringify({ image }) });
      onUploaded(result.url);
      setMessage('Image uploaded to Cloudinary');
    } catch (error) {
      setMessage(error.message || 'Image upload failed. Try again.');
    }
  };

  const save = async () => {
    if (!portfolio) return false;
    setSaving(true);
    setMessage('');
    try {
      await api(`/api/portfolios/${id}`, { method: 'PUT', body: JSON.stringify(portfolio) });
      setMessage('All changes saved');
      return true;
    } catch (error) { setMessage(error.message); return false; }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (!portfolio) return undefined;
    const timer = window.setTimeout(() => {
      api(`/api/portfolios/${id}`, { method: 'PUT', body: JSON.stringify(portfolio) })
        .then(() => setMessage('Autosaved'))
        .catch((error) => setMessage(error.message));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [portfolio, id]);

  const addSection = () => {
    setPortfolioTracked((current) => ({ ...current, sections: [...current.sections, initialSection(newSection, current.sections.length)] }));
  };
  const handleCanvasDrop = (event) => {
    const type = event.dataTransfer.getData('application/x-pagecraft-section');
    if (!type || !SECTION_LIBRARY[type]) return;
    event.preventDefault();
    if (type === 'header' && portfolio.sections.some((section) => section.type === 'header')) {
      setMessage('This page already has a header section. Drag it in the list to change its position.');
      return;
    }
    setPortfolioTracked((current) => {
      return { ...current, sections: [...current.sections, initialSection(type, current.sections.length)] };
    });
  };
  const removeSection = (sectionId) => setPortfolioTracked((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== sectionId) }));
  const moveSection = (targetId) => {
    if (!dragId || dragId === targetId) return;
    setPortfolioTracked((current) => {
      const sections = [...current.sections];
      const from = sections.findIndex((section) => section.id === dragId);
      const to = sections.findIndex((section) => section.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = sections.splice(from, 1);
      sections.splice(to, 0, moved);
      return { ...current, sections };
    });
    setDragId(null);
  };

  const publish = async () => {
    try {
      if (!await save()) return;
      const shouldPublish = !portfolio.published;
      const result = await api(`/api/portfolios/${id}/publish`, { method: 'POST', body: JSON.stringify({ published: shouldPublish }) });
      setPortfolioDirect(result);
      setPublicUrl(shouldPublish ? result.publicUrl : '');
      setMessage(shouldPublish ? 'Portfolio published' : 'Portfolio unpublished');
    } catch (error) { setMessage(error.message); }
  };
  const exportPdf = () => window.print();
  if (loading) return <div className="editor-state">Opening your page…</div>;
  if (!portfolio) return <div className="editor-state">{message || 'Portfolio not found.'}<Link to="/home">Back to dashboard</Link></div>;

  if (isPreview) return (
    <main className={`editor-preview-mode ${portfolio.templateId === 'grunge-portfolio' ? 'editor-preview-mode--grunge' : ''} ${isIPortfolio ? 'editor-preview-mode--iportfolio' : ''}`}>
      <header className="editor-preview-toolbar">
        <button className="editor-button" onClick={() => setIsPreview(false)}>← Back to editor</button>
        <div className="editor-preview-label"><strong>Website preview</strong><span>{portfolio.published ? 'Published page · showing current edits' : 'Draft preview · only visible to you'}</span></div>
        <div className="editor-preview-controls" role="group" aria-label="Preview size">
          <button className={previewDevice === 'desktop' ? 'is-active' : ''} aria-pressed={previewDevice === 'desktop'} onClick={() => setPreviewDevice('desktop')}>Desktop</button>
          <button className={previewDevice === 'mobile' ? 'is-active' : ''} aria-pressed={previewDevice === 'mobile'} onClick={() => setPreviewDevice('mobile')}>Phone</button>
        </div>
        {portfolio.published && <a className="editor-button editor-button--dark" href={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer">Open published ↗</a>}
      </header>
      <div className={`editor-preview-stage ${portfolio.templateId === 'grunge-portfolio' ? 'editor-preview-stage--grunge' : ''} ${isIPortfolio ? 'editor-preview-stage--iportfolio' : ''}`}>
        <div className={`editor-preview-frame ${previewDevice === 'mobile' ? 'is-mobile' : ''} ${portfolio.templateId === 'grunge-portfolio' ? 'editor-preview-frame--grunge' : ''} ${isIPortfolio ? 'editor-preview-frame--iportfolio' : ''}`}>
          <PortfolioView portfolio={portfolio} />
        </div>
      </div>
    </main>
  );

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <Link to="/home" className="editor-brand">Page<span>craft</span></Link>
        <div className="editor-document-title"><input aria-label="Portfolio name" value={portfolio.title} onChange={(event) => changeField('title', event.target.value)} /><span>{saving ? 'Saving…' : message || 'Autosaved'}</span></div>
        <div className="editor-actions"><button className="editor-button editor-history-button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo">↶ <span className="editor-history-label">Undo</span></button><button className="editor-button editor-history-button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)" aria-label="Redo">↷ <span className="editor-history-label">Redo</span></button><button className="editor-button" onClick={() => setIsPreview(true)}>Preview site</button><button className="editor-button" onClick={exportPdf}>Export PDF</button><button className="editor-button editor-button--dark" onClick={publish}>{portfolio.published ? 'Unpublish' : 'Publish'}</button></div>
      </header>
      <div className="editor-workspace">
        <aside className="editor-sidebar">
          {isIPortfolio ? <div className="editor-panel"><h2>Edit iPortfolio</h2><p>Click text in the page to edit it. Click a photo to select it, then replace it below. Changes autosave; the original theme and layout stay intact.</p><p className="editor-link-hint">Paste a full URL into page text to make it clickable in preview and on the published page.</p><p>Uploaded template images may total up to 5 MB.</p><p>Use Preview site to review the page without editing controls.</p>{selectedTemplateImage !== null && <><label>Replace selected image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0], (url) => updateTemplateImage(selectedTemplateImage, url))} /></label>{portfolio.templateImages?.[selectedTemplateImage] && <button className="editor-button" onClick={() => updateTemplateImage(selectedTemplateImage, '')}>Restore original image</button>}</>}</div> : <>
          {isResume && <div className="editor-panel editor-resume-fields"><h2>Edit resume content</h2><p>Open a section to edit its heading and details. Changes autosave and update the page preview.</p>{portfolio.sections.map((section) => {
            const label = SECTION_LIBRARY[section.type]?.label || section.type;
            return <details className="editor-resume-field" key={`fields-${section.id}`}>
              <summary>{section.title || label}</summary>
              <label>{section.type === 'header' ? 'Name' : 'Section heading'}<input value={section.title || ''} onChange={(event) => updateSection(section.id, 'title', event.target.value)} /></label>
              <label>{section.type === 'header' ? 'Role / subtitle' : section.type === 'contact' ? 'Contact details' : 'Content'}<textarea value={section.body || ''} rows={Math.min(14, Math.max(3, (section.body || '').split('\n').length))} onChange={(event) => updateSection(section.id, 'body', event.target.value)} /></label>
              <label>Section image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0], (url) => updateSection(section.id, 'image', url))} /></label>
              {section.image && <button className="editor-button" onClick={() => updateSection(section.id, 'image', '')}>Remove image</button>}
            </details>;
          })}</div>}
          <div className="editor-panel"><h2>Sections</h2><p>Drag a block onto the page, or drag blocks below to reorder them.</p><p className="editor-link-hint">Paste links such as linkedin.com/in/name, website URLs, or email addresses into any section. They become clickable in preview and on the published page.</p>
            <div className="editor-library" aria-label="Section library">{Object.entries(SECTION_LIBRARY).map(([type, section]) => <button key={type} draggable onDragStart={(event) => event.dataTransfer.setData('application/x-pagecraft-section', type)} onClick={() => { setNewSection(type); if (type === 'header' && portfolio.sections.some((item) => item.type === 'header')) { setMessage('This page already has a header section. Drag it in the list to change its position.'); return; } setPortfolioTracked((current) => ({ ...current, sections: [...current.sections, initialSection(type, current.sections.length)] })); }} title={`Drag ${section.label} to the page`}><span>＋</span>{section.label}</button>)}</div>
            <div className="editor-section-list">{portfolio.sections.map((section) => (
              <div className={`editor-section-item ${dragId === section.id ? 'is-dragging' : ''}`} key={section.id} draggable onDragStart={() => setDragId(section.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveSection(section.id)} onKeyDown={(event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); const target = portfolio.sections[portfolio.sections.findIndex((item) => item.id === section.id) + (event.key === 'ArrowUp' ? -1 : 1)]; if (target) moveByKeyboard(section.id, target.id); } }} tabIndex="0" aria-label={`Reorder ${SECTION_LIBRARY[section.type]?.label || section.type}`}>
                <span className="editor-drag-handle" aria-hidden="true">⠿</span><span>{SECTION_LIBRARY[section.type]?.label || section.type}</span><button aria-label={`Remove ${section.type}`} onClick={() => removeSection(section.id)}>×</button>
              </div>
            ))}</div>
            <div className="editor-add-section"><select value={newSection} onChange={(event) => setNewSection(event.target.value)} aria-label="Section type">{Object.entries(SECTION_LIBRARY).filter(([key]) => key !== 'header').map(([key, section]) => <option key={key} value={key}>{section.label}</option>)}</select><button onClick={addSection}>Add section</button></div>
          </div>
          {portfolio.templateId === 'grunge-portfolio' ? <div className="editor-panel"><h2>Grunge styling</h2><p>The original charcoal paper background, monochrome palette, and texture are kept intact. Edit the sections and replace the sample images below.</p></div> : <div className="editor-panel"><h2>Theme</h2><label>Accent colour<div className="editor-swatch-row">{COLORS.map((color) => <button key={color} aria-label={`Set accent ${color}`} className={`editor-swatch ${portfolio.theme?.accent === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => changeTheme('accent', color)} />)}</div></label>
            <label>Page background<div className="editor-swatch-row">{BACKGROUNDS.map((color) => <button key={color} aria-label={`Set background ${color}`} className={`editor-swatch ${portfolio.theme?.background === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => changeTheme('background', color)} />)}</div></label>
            <label>Font<select value={portfolio.theme?.font || 'Inter'} onChange={(event) => changeTheme('font', event.target.value)}>{FONTS.map((font) => <option key={font}>{font}</option>)}</select></label>
          </div>}
          </>}
        </aside>
        <section className="editor-canvas-wrap"><div className="editor-canvas-heading"><div><span className="editor-live-dot" /> Live preview</div>{!isIPortfolio && <button className="editor-button" onClick={save}>{saving ? 'Saving…' : 'Save now'}</button>}</div>
          <div className={`editor-canvas ${portfolio.templateId === 'grunge-portfolio' ? 'editor-canvas--grunge' : ''} ${isIPortfolio ? 'editor-canvas--iportfolio' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={handleCanvasDrop}><PortfolioView portfolio={portfolio} editable onUndo={undo} onRedo={redo} onUploadImage={uploadImage} onTemplateContentChange={(templateContent) => changeField('templateContent', templateContent)} onTemplateImageSelect={setSelectedTemplateImage} onUpdate={updateSection} />
            {!isIPortfolio && portfolio.sections.map((section) => <div className="editor-canvas-controls" key={`upload-${section.id}`}><label className="editor-image-upload">Add image to {SECTION_LIBRARY[section.type]?.label || section.type}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0], (url) => updateSection(section.id, 'image', url))} /></label>{section.image && <button onClick={() => updateSection(section.id, 'image', '')}>Remove image</button>}</div>)}
          </div>
        </section>
      </div>
      {publicUrl && <div className="editor-publish-toast" role="status">Published: <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a><button onClick={() => navigator.clipboard?.writeText(publicUrl)}>Copy link</button></div>}
    </main>
  );

  function moveByKeyboard(sourceId, targetId) {
    setPortfolioTracked((current) => { const sections = [...current.sections]; const from = sections.findIndex((item) => item.id === sourceId); const to = sections.findIndex((item) => item.id === targetId); const [item] = sections.splice(from, 1); sections.splice(to, 0, item); return { ...current, sections }; });
  }
}
