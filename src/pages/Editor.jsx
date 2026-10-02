import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SECTION_LIBRARY } from '../data/templates';
import { PortfolioView } from '../components/PortfolioView';
import PortfolioIcon, { PORTFOLIO_ICONS } from '../components/PortfolioIcon';
import './Editor.css';

const COLORS = ['#e6e51e', '#466cf3', '#ff8562', '#ff6b2b', '#baf3d6', '#f1e3c6', '#f34646', '#f4f4f4'];
const BACKGROUNDS = ['#ffffff', '#f7f5ee', '#f3f6ff', '#fff8f2'];
const FONTS = ['Inter', 'Poppins', 'DM Sans', 'Manrope', 'Space Grotesk', 'Montserrat', 'Playfair Display', 'Lora', 'Merriweather', 'Source Sans 3', 'Oswald', 'Georgia'];
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
  const isNewDraft = id === 'new' || id.startsWith('draft-');
  const draftStorageKey = id === 'new' ? 'pagecraft:unsaved-draft' : `pagecraft:unsaved-draft:${id}`;
  const editorRootRef = useRef(null);
  const editorCanvasRef = useRef(null);
  const [portfolio, setPortfolio] = useState(null);
  const portfolioRef = useRef(null);
  const dirtyRef = useRef(false);
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
  const [selectedCanvasElement, setSelectedCanvasElement] = useState(null);
  const [activePanel, setActivePanel] = useState('sections');
  const [canvasZoom, setCanvasZoom] = useState(100);
  const zoomCanvasByWheel = useCallback((deltaY) => {
    setCanvasZoom((zoom) => Math.max(30, Math.min(180, zoom + (deltaY < 0 ? 5 : -5))));
  }, []);
  const isIPortfolio = portfolio?.templateId === 'iportfolio-bootstrap';
  const isResume = portfolio?.templateId?.startsWith('resume-');

  const setPortfolioDirect = useCallback((next) => {
    if (portfolioRef.current?.id !== next?.id) historyRef.current = { past: [], future: [], lastKey: null, lastAt: 0 };
    dirtyRef.current = false;
    portfolioRef.current = next;
    setPortfolio(next);
    setMessage('All changes saved');
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
    dirtyRef.current = true;
    portfolioRef.current = next;
    setPortfolio(next);
    setMessage('Unsaved changes');
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
    dirtyRef.current = true;
    portfolioRef.current = previous;
    setPortfolio(previous);
    setMessage('Unsaved changes');
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
    dirtyRef.current = true;
    portfolioRef.current = next;
    setPortfolio(next);
    setMessage('Unsaved changes');
    setHistoryRevision((revision) => revision + 1);
  }, []);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  useEffect(() => {
    const handleEditorWheelZoom = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (!editorRootRef.current?.contains(event.target)) return;
      event.preventDefault();
      if (editorCanvasRef.current?.contains(event.target)) zoomCanvasByWheel(event.deltaY);
    };
    document.addEventListener('wheel', handleEditorWheelZoom, { capture: true, passive: false });
    return () => document.removeEventListener('wheel', handleEditorWheelZoom, { capture: true });
  }, [zoomCanvasByWheel]);

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
    if (isNewDraft) {
      try {
        const draft = JSON.parse(sessionStorage.getItem(draftStorageKey) || 'null');
        if (!draft?.title || !draft?.templateId) throw new Error('No unsaved template draft was found.');
        const unsavedDraft = { ...draft, id, published: false, slug: '', visits: 0, canvasElements: draft.canvasElements || [], templateContent: draft.templateContent || [], templateImages: draft.templateImages || [] };
        portfolioRef.current = unsavedDraft;
        dirtyRef.current = false;
        setPortfolio(unsavedDraft);
        setMessage('Not saved yet');
      } catch (error) {
        setMessage(error.message);
        navigate('/home', { replace: true });
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    api(`/api/portfolios/${id}`).then(setPortfolioDirect).catch((error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [draftStorageKey, id, isNewDraft, navigate, setPortfolioDirect]);

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
  const addCanvasElement = (type, image = '', iconName = 'sparkles') => {
    const index = portfolioRef.current?.canvasElements?.length || 0;
    const element = {
      id: `element-${Date.now()}-${index}`, type, x: 9 + (index % 3) * 8, y: 14 + index * 4,
      width: type === 'text' ? 36 : type === 'icon' ? 16 : 25, height: type === 'text' ? 120 : type === 'icon' ? 96 : 190,
      text: type === 'text' ? 'Add your text here' : '', image, iconName,
      color: portfolioRef.current?.theme?.accent || '#222222', fontSize: 32,
    };
    setPortfolioTracked((current) => ({ ...current, canvasElements: [...(current.canvasElements || []), element] }));
    setSelectedCanvasElement(element.id);
    setActivePanel('elements');
  };
  const updateCanvasElement = (elementId, patch) => setPortfolioTracked((current) => ({
    ...current,
    canvasElements: (current.canvasElements || []).map((element) => element.id === elementId ? { ...element, ...patch } : element),
  }), `element:${elementId}`);
  const removeCanvasElement = (elementId) => {
    setPortfolioTracked((current) => ({ ...current, canvasElements: (current.canvasElements || []).filter((element) => element.id !== elementId) }));
    setSelectedCanvasElement(null);
  };
  const selectCanvasElement = (elementId) => {
    setSelectedCanvasElement(elementId);
    if (elementId) setActivePanel('elements');
  };
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

  const save = useCallback(async () => {
    if (!portfolio) return false;
    setSaving(true);
    setMessage('');
    try {
      if (isNewDraft) {
        const result = await api('/api/portfolios', { method: 'POST', body: JSON.stringify(portfolio) });
        sessionStorage.removeItem(draftStorageKey);
        setPortfolioDirect(result);
        navigate(`/editor/${result.id}`, { replace: true });
      } else {
        await api(`/api/portfolios/${id}`, { method: 'PUT', body: JSON.stringify(portfolio) });
        dirtyRef.current = false;
      }
      setMessage('All changes saved');
      return true;
    } catch (error) { setMessage(error.message); return false; }
    finally { setSaving(false); }
  }, [draftStorageKey, id, isNewDraft, navigate, portfolio, setPortfolioDirect]);

  useEffect(() => {
    if (!portfolio || !dirtyRef.current) return undefined;
    const timer = window.setTimeout(() => {
      save();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [portfolio, id, save]);

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
  const moveSectionByOffset = (sectionId, offset) => setPortfolioTracked((current) => {
    const sections = [...current.sections];
    const from = sections.findIndex((section) => section.id === sectionId);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= sections.length) return current;
    const [section] = sections.splice(from, 1);
    sections.splice(to, 0, section);
    return { ...current, sections };
  });
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
      const savedPortfolio = portfolioRef.current;
      const shouldPublish = !savedPortfolio.published;
      const result = await api(`/api/portfolios/${savedPortfolio.id}/publish`, { method: 'POST', body: JSON.stringify({ published: shouldPublish }) });
      setPortfolioDirect(result);
      setPublicUrl(shouldPublish ? result.publicUrl : '');
      setMessage(shouldPublish ? 'Portfolio published' : 'Portfolio unpublished');
    } catch (error) { setMessage(error.message); }
  };
  const exportPdf = () => window.print();
  if (loading) return <div className="editor-state">Opening your page…</div>;
  if (!portfolio) return <div className="editor-state">{message || 'Portfolio not found.'}<Link to="/home">Back to dashboard</Link></div>;

  if (isPreview) return (
    <main ref={editorRootRef} className={`editor-preview-mode ${portfolio.templateId === 'grunge-portfolio' ? 'editor-preview-mode--grunge' : ''} ${isIPortfolio ? 'editor-preview-mode--iportfolio' : ''}`}>
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
    <main ref={editorRootRef} className="editor-shell">
      <header className="editor-topbar">
        <Link to="/home" className="editor-brand">Page<span>craft</span></Link>
        <div className="editor-document-title"><input aria-label="Portfolio name" value={portfolio.title} onChange={(event) => changeField('title', event.target.value)} /><span role="status" aria-live="polite">{saving ? 'Saving changes…' : message || 'All changes saved'}</span></div>
        <div className="editor-actions"><button type="button" className="editor-button editor-history-button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo">↶ <span className="editor-history-label">Undo</span></button><button type="button" className="editor-button editor-history-button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)" aria-label="Redo">↷ <span className="editor-history-label">Redo</span></button><button type="button" className="editor-button" onClick={() => setIsPreview(true)}>Preview site</button><button type="button" className="editor-button" onClick={exportPdf}>Export PDF</button><button type="button" className="editor-button editor-button--dark" onClick={publish} disabled={saving}>{portfolio.published ? 'Unpublish' : 'Publish'}</button></div>
      </header>
      <div className="editor-workspace">
        <aside className="editor-sidebar" data-active-panel={activePanel}>
          <nav className="editor-sidebar__tabs" aria-label="Editor tools" style={{ gridTemplateColumns: `repeat(${isIPortfolio ? 2 : portfolio.templateId === 'grunge-portfolio' ? 3 : 4}, minmax(0,1fr))` }}>
            {[
              ['sections', 'Sections', '▤'], ['elements', 'Elements', '＋'],
              ...(!isIPortfolio ? [['photos', 'Photos', '▧']] : []),
              ...(!isIPortfolio && portfolio.templateId !== 'grunge-portfolio' ? [['theme', 'Theme', '◐']] : []),
            ].map(([key, label, icon]) => <button type="button" key={key} className={activePanel === key ? 'is-active' : ''} aria-pressed={activePanel === key} onClick={() => setActivePanel(key)}><span aria-hidden="true">{icon}</span>{label}</button>)}
          </nav>
          {isIPortfolio ? <><div className="editor-panel" data-editor-panel="sections"><h2>Edit iPortfolio</h2><p>Click text in the page to edit it. Click a photo to select it, then replace it below. Changes autosave; the original theme and layout stay intact.</p><p className="editor-link-hint">Paste a full URL into page text to make it clickable in preview and on the published page.</p><p>Uploaded template images may total up to 5 MB.</p><p>Use Preview site to review the page without editing controls.</p>{selectedTemplateImage !== null && <><label>Replace selected image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0], (url) => updateTemplateImage(selectedTemplateImage, url))} /></label>{portfolio.templateImages?.[selectedTemplateImage] && <button className="editor-button" onClick={() => updateTemplateImage(selectedTemplateImage, '')}>Restore original image</button>}</>}</div><CanvasElementControls {...{ portfolio, selectedCanvasElement, addCanvasElement, uploadImage, updateCanvasElement, removeCanvasElement }} /></> : <>
          {isResume && <div className="editor-panel editor-resume-fields" data-editor-panel="sections"><h2>Edit resume content</h2><p>Open a section to edit its heading and details. Changes autosave and update the page preview.</p>{portfolio.sections.map((section) => {
            const label = SECTION_LIBRARY[section.type]?.label || section.type;
            return <details className="editor-resume-field" key={`fields-${section.id}`}>
              <summary>{section.title || label}</summary>
              <label>{section.type === 'header' ? 'Name' : 'Section heading'}<input value={section.title || ''} onChange={(event) => updateSection(section.id, 'title', event.target.value)} /></label>
              <label>{section.type === 'header' ? 'Role / subtitle' : section.type === 'contact' ? 'Contact details' : 'Content'}<textarea value={section.body || ''} rows={Math.min(14, Math.max(3, (section.body || '').split('\n').length))} onChange={(event) => updateSection(section.id, 'body', event.target.value)} /></label>
            </details>;
          })}</div>}
          <div className="editor-panel" data-editor-panel="sections"><h2>Sections</h2><p>Drag a block onto the page, or drag blocks below to reorder them.</p><p className="editor-link-hint">Paste links such as linkedin.com/in/name, website URLs, or email addresses into any section. They become clickable in preview and on the published page.</p>
            <div className="editor-library" aria-label="Section library">{Object.entries(SECTION_LIBRARY).map(([type, section]) => <button key={type} draggable onDragStart={(event) => event.dataTransfer.setData('application/x-pagecraft-section', type)} onClick={() => { setNewSection(type); if (type === 'header' && portfolio.sections.some((item) => item.type === 'header')) { setMessage('This page already has a header section. Drag it in the list to change its position.'); return; } setPortfolioTracked((current) => ({ ...current, sections: [...current.sections, initialSection(type, current.sections.length)] })); }} title={`Drag ${section.label} to the page`}><span>＋</span>{section.label}</button>)}</div>
            <div className="editor-section-list">{portfolio.sections.map((section, index) => (
              <div className={`editor-section-item ${dragId === section.id ? 'is-dragging' : ''}`} key={section.id} draggable onDragStart={() => setDragId(section.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveSection(section.id)} onKeyDown={(event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); moveSectionByOffset(section.id, event.key === 'ArrowUp' ? -1 : 1); } }} tabIndex="0" aria-label={`Reorder ${SECTION_LIBRARY[section.type]?.label || section.type}`}>
                <span className="editor-drag-handle" aria-hidden="true">⠿</span><span>{SECTION_LIBRARY[section.type]?.label || section.type}</span><button type="button" className="editor-section-move" aria-label={`Move ${section.type} up`} disabled={index === 0} onClick={() => moveSectionByOffset(section.id, -1)}>↑</button><button type="button" className="editor-section-move" aria-label={`Move ${section.type} down`} disabled={index === portfolio.sections.length - 1} onClick={() => moveSectionByOffset(section.id, 1)}>↓</button><button type="button" aria-label={`Remove ${section.type}`} onClick={() => removeSection(section.id)}>×</button>
              </div>
            ))}</div>
            <div className="editor-add-section"><select value={newSection} onChange={(event) => setNewSection(event.target.value)} aria-label="Section type">{Object.entries(SECTION_LIBRARY).filter(([key]) => key !== 'header').map(([key, section]) => <option key={key} value={key}>{section.label}</option>)}</select><button onClick={addSection}>Add section</button></div>
          </div>
          {!isIPortfolio && <div className="editor-panel editor-photo-panel" data-editor-panel="photos">
            <div className="editor-photo-panel__heading">
              <div><h2>Section photos</h2><p>Add or replace images in your page.</p></div>
              <span>{portfolio.sections.filter((section) => section.image).length}/{portfolio.sections.length}</span>
            </div>
            <div className="editor-photo-list">
              {portfolio.sections.map((section) => {
                const label = SECTION_LIBRARY[section.type]?.label || section.type;
                const inputId = `photo-upload-${section.id}`;
                return <div className="editor-photo-item" key={`photo-${section.id}`}>
                  <div className={`editor-photo-item__thumb ${section.image ? 'has-image' : ''}`}>
                    {section.image ? <img src={section.image} alt={`Current photo in ${label}`} /> : <span aria-hidden="true">＋</span>}
                  </div>
                  <div className="editor-photo-item__details">
                    <strong>{label}</strong>
                    <span>{section.image ? 'Photo added' : 'No photo yet'}</span>
                  </div>
                  <div className="editor-photo-item__actions">
                    <label className="editor-photo-action" htmlFor={inputId}>{section.image ? 'Replace' : 'Add photo'}</label>
                    <input
                      id={inputId}
                      className="editor-photo-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      aria-label={`${section.image ? 'Replace' : 'Add'} photo for ${label}`}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadImage(file, (url) => updateSection(section.id, 'image', url));
                        event.target.value = '';
                      }}
                    />
                    {section.image && <button type="button" className="editor-photo-remove" onClick={() => updateSection(section.id, 'image', '')}>Remove</button>}
                  </div>
                </div>;
              })}
            </div>
            <p className="editor-photo-note">PNG, JPG, WebP, or GIF · Up to 5 MB per image</p>
          </div>}
          <CanvasElementControls {...{ portfolio, selectedCanvasElement, addCanvasElement, uploadImage, updateCanvasElement, removeCanvasElement }} />
          {portfolio.templateId === 'grunge-portfolio' ? <div className="editor-panel" data-editor-panel="theme"><h2>Grunge styling</h2><p>The original charcoal paper background, monochrome palette, and texture are kept intact. Edit the sections and replace the sample images below.</p></div> : <div className="editor-panel" data-editor-panel="theme"><h2>Theme</h2><label>Accent colour<div className="editor-swatch-row">{COLORS.map((color) => <button key={color} aria-label={`Set accent ${color}`} className={`editor-swatch ${portfolio.theme?.accent === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => changeTheme('accent', color)} />)}</div></label><ColorWheel label="Custom accent" value={portfolio.theme?.accent || '#e6e51e'} onChange={(value) => changeTheme('accent', value)} />
            <label>Page background<div className="editor-swatch-row">{BACKGROUNDS.map((color) => <button key={color} aria-label={`Set background ${color}`} className={`editor-swatch ${portfolio.theme?.background === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => changeTheme('background', color)} />)}</div></label><ColorWheel label="Custom background" value={portfolio.theme?.background || '#ffffff'} onChange={(value) => changeTheme('background', value)} />
            <div className="editor-font-library"><strong>Font style library</strong><p>Choose a typeface to apply across your portfolio.</p><div className="editor-font-library__grid">{FONTS.map((font) => <button type="button" key={font} className={portfolio.theme?.font === font ? 'is-active' : ''} onClick={() => changeTheme('font', font)} aria-pressed={portfolio.theme?.font === font} style={{ fontFamily: `'${font}', sans-serif` }}><span>Aa</span><small>{font}</small></button>)}</div></div>
          </div>}
          </>}
        </aside>
        <section className="editor-canvas-wrap"><div className="editor-canvas-heading"><div><span className="editor-live-dot" /> Live preview</div><div className="editor-canvas-heading__actions"><div className="editor-zoom-controls" role="group" aria-label="Canvas zoom" title="Use Ctrl/Cmd + mouse wheel over the page to zoom"><button type="button" aria-label="Zoom out" onClick={() => setCanvasZoom((zoom) => Math.max(30, zoom - 10))} disabled={canvasZoom <= 30}>−</button><input aria-label="Canvas zoom" type="range" min="30" max="180" step="5" value={canvasZoom} onChange={(event) => setCanvasZoom(Number(event.target.value))} /><span>{canvasZoom}%</span><button type="button" aria-label="Zoom in" onClick={() => setCanvasZoom((zoom) => Math.min(180, zoom + 10))} disabled={canvasZoom >= 180}>＋</button><button type="button" onClick={() => setCanvasZoom(100)}>Fit</button></div>{!isIPortfolio && <button type="button" className="editor-button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save now'}</button>}</div></div>
          <div ref={editorCanvasRef} className={`editor-canvas ${portfolio.templateId === 'grunge-portfolio' ? 'editor-canvas--grunge' : ''} ${isIPortfolio ? 'editor-canvas--iportfolio' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={handleCanvasDrop}><div className="editor-canvas-zoom" style={{ zoom: canvasZoom / 100 }}><PortfolioView portfolio={portfolio} editable selectedCanvasElement={selectedCanvasElement} onCanvasElementSelect={selectCanvasElement} onCanvasElementUpdate={updateCanvasElement} onCanvasWheelZoom={zoomCanvasByWheel} onUndo={undo} onRedo={redo} onUploadImage={uploadImage} onTemplateContentChange={(templateContent) => changeField('templateContent', templateContent)} onTemplateImageSelect={setSelectedTemplateImage} onUpdate={updateSection} /></div></div>
        </section>
      </div>
      {publicUrl && <div className="editor-publish-toast" role="status">Published: <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a><button onClick={() => navigator.clipboard?.writeText(publicUrl)}>Copy link</button></div>}
    </main>
  );

}

function CanvasElementControls({ portfolio, selectedCanvasElement, addCanvasElement, uploadImage, updateCanvasElement, removeCanvasElement }) {
  const element = (portfolio.canvasElements || []).find((item) => item.id === selectedCanvasElement);
  return <div className="editor-panel editor-elements-panel" data-editor-panel="elements">
    <h2>Elements</h2><p>Add free placement items to your page, then drag the ✥ handle to position them.</p>
    <div className="editor-element-adders">
      <button type="button" onClick={() => addCanvasElement('text')}><span aria-hidden="true">T</span> Add text</button>
      <label className="editor-element-upload"><span aria-hidden="true">▧</span> Add photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file, (url) => addCanvasElement('image', url)); event.target.value = ''; }} /></label>
      <button type="button" onClick={() => addCanvasElement('rectangle')}><span aria-hidden="true">□</span> Rectangle</button>
      <button type="button" onClick={() => addCanvasElement('circle')}><span aria-hidden="true">○</span> Circle</button>
      <button type="button" onClick={() => addCanvasElement('line')}><span aria-hidden="true">―</span> Line</button>
    </div>
    <div className="editor-icon-library"><div className="editor-icon-library__heading"><strong>{element?.type === 'icon' ? 'Change icon' : 'SVG icons'}</strong><a href="https://www.svgrepo.com/vectors/sparkles/" target="_blank" rel="noreferrer">Browse SVG Repo ↗</a></div><div className="editor-icon-library__grid">{PORTFOLIO_ICONS.map((icon) => <button type="button" key={icon.id} title={icon.label} aria-label={`${element?.type === 'icon' ? 'Use' : 'Add'} ${icon.label} icon`} className={element?.type === 'icon' && element.iconName === icon.id ? 'is-active' : ''} onClick={() => element?.type === 'icon' ? updateCanvasElement(element.id, { iconName: icon.id }) : addCanvasElement('icon', '', icon.id)}><PortfolioIcon name={icon.id} /><span>{icon.label}</span></button>)}</div></div>
    {element && <div className="editor-element-properties">
      <div className="editor-element-properties__heading"><strong>Edit {element.type}</strong><button type="button" aria-label="Delete selected element" onClick={() => removeCanvasElement(element.id)}>Delete</button></div>
      {element.type === 'text' && <label>Text<textarea value={element.text} rows={3} onChange={(event) => updateCanvasElement(element.id, { text: event.target.value })} /></label>}
      {element.type === 'image' && <label>Replace photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file, (url) => updateCanvasElement(element.id, { image: url })); event.target.value = ''; }} /></label>}
      {element.type !== 'image' && <ColorWheel label="Element color" value={element.color} onChange={(value) => updateCanvasElement(element.id, { color: value })} />}
      {element.type === 'text' && <label>Text size<input type="range" min="14" max="72" value={element.fontSize} onChange={(event) => updateCanvasElement(element.id, { fontSize: Number(event.target.value) })} /></label>}
      {(element.type === 'image' || element.type === 'icon' || ['rectangle', 'circle', 'line'].includes(element.type)) && <label>Width<input type="range" min="8" max="90" value={element.width} onChange={(event) => updateCanvasElement(element.id, { width: Number(event.target.value) })} /></label>}
      {element.type !== 'text' && element.type !== 'line' && <label>Height<input type="range" min="30" max="720" value={element.height} onChange={(event) => updateCanvasElement(element.id, { height: Number(event.target.value) })} /></label>}
    </div>}
  </div>;
}

function hexToRgb(hex) {
  const value = String(hex || '#000000').replace('#', '');
  const full = value.length === 3 ? [...value].map((part) => `${part}${part}`).join('') : value.slice(0, 6);
  const parsed = Number.parseInt(full, 16);
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const delta = max - min;
  let h = 0;
  if (delta) h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}

function hsvToHex(h, s, v) {
  const c = v * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = v - c;
  const section = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${section.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function ColorWheel({ label, value, onChange }) {
  const wheelRef = useRef(null);
  const [hexDraft, setHexDraft] = useState(value);
  useEffect(() => setHexDraft(value), [value]);
  const rgb = hexToRgb(value);
  const hsv = rgbToHsv(rgb);
  const markerAngle = (hsv.h - 90) * Math.PI / 180;
  const markerX = 50 + Math.cos(markerAngle) * hsv.s * 42;
  const markerY = 50 + Math.sin(markerAngle) * hsv.s * 42;
  const pick = (event) => {
    const bounds = wheelRef.current.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    const radius = Math.min(bounds.width, bounds.height) / 2;
    const distance = Math.min(radius, Math.hypot(x, y));
    const hue = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
    onChange(hsvToHex(hue, distance / radius, hsv.v));
  };
  const adjustRgb = (channel, next) => onChange(`#${Object.entries({ ...rgb, [channel]: Math.max(0, Math.min(255, Number(next))) }).map(([, part]) => part.toString(16).padStart(2, '0')).join('')}`);
  return <div className="editor-color-control">
    <strong>{label}</strong>
    <div className="editor-color-control__body">
      <button type="button" ref={wheelRef} className="editor-color-wheel" aria-label={`${label} color wheel`} title="Choose hue and saturation" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pick(event); }} onPointerMove={(event) => { if (event.buttons) pick(event); }} onKeyDown={(event) => { if (event.key.startsWith('Arrow')) { event.preventDefault(); const shift = event.shiftKey ? 12 : 3; const hue = (hsv.h + (event.key === 'ArrowRight' || event.key === 'ArrowUp' ? shift : -shift) + 360) % 360; onChange(hsvToHex(hue, hsv.s, hsv.v)); } }} style={{ '--wheel-swatch': value, '--wheel-x': `${markerX}%`, '--wheel-y': `${markerY}%` }} />
      <div className="editor-color-control__values">
        <label>Brightness<input aria-label={`${label} brightness`} type="range" min="10" max="100" value={Math.round(hsv.v * 100)} onChange={(event) => onChange(hsvToHex(hsv.h, hsv.s, Number(event.target.value) / 100))} /></label>
        <div className="editor-rgb-inputs">{['r', 'g', 'b'].map((channel) => <label key={channel}>{channel.toUpperCase()}<input aria-label={`${label} ${channel.toUpperCase()}`} type="number" min="0" max="255" value={rgb[channel]} onChange={(event) => adjustRgb(channel, event.target.value)} /></label>)}</div>
        <label>Hex<input className="editor-hex-input" value={hexDraft} onChange={(event) => { const next = event.target.value; setHexDraft(next); if (/^#[\da-f]{6}$/i.test(next)) onChange(next); }} maxLength={7} aria-label={`${label} hex value`} /></label>
      </div>
    </div>
  </div>;
}
