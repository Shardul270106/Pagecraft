import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SECTION_LIBRARY } from '../data/templates';
import { PortfolioView } from '../components/PortfolioView';
import PortfolioIcon, { PORTFOLIO_ICONS } from '../components/PortfolioIcon';
import './Editor.css';
import '../components/PortfolioTemplates.css';

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
const normalizeSectionCanvas = (portfolio) => ({
  ...portfolio,
  canvasElements: (portfolio.canvasElements || []).map((element) => {
    if (!element.sectionId || element.sectionCanvasVersion) return element;
    // Earlier saved objects used coordinates inside a narrow section media column.
    return { ...element, x: Math.min(100 - element.width * 0.32, 65 + (element.x || 0) * 0.32), width: Math.max(element.type === 'text' ? 30 : 8, element.width * 0.32), sectionCanvasVersion: 1 };
  }),
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
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [activePanel, setActivePanel] = useState('sections');
  const [canvasZoom, setCanvasZoom] = useState(100);
  const zoomCanvasByWheel = useCallback((deltaY) => {
    setCanvasZoom((zoom) => Math.max(30, Math.min(180, zoom + (deltaY < 0 ? 5 : -5))));
  }, []);
  const isIPortfolio = portfolio?.templateId === 'iportfolio-bootstrap';
  const isResume = portfolio?.templateId?.startsWith('resume-');
  const supportsSectionCanvas = Boolean(portfolio && !isIPortfolio && !isResume && portfolio.templateId !== 'grunge-portfolio');

  useEffect(() => {
    if (!portfolio?.sections?.length) return;
    if (!portfolio.sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(portfolio.sections.find((section) => section.type === 'header')?.id || portfolio.sections[0].id);
    }
  }, [portfolio?.id, portfolio?.sections, selectedSectionId]);

  const setPortfolioDirect = useCallback((next) => {
    const normalized = normalizeSectionCanvas(next);
    if (portfolioRef.current?.id !== normalized?.id) historyRef.current = { past: [], future: [], lastKey: null, lastAt: 0 };
    dirtyRef.current = false;
    portfolioRef.current = normalized;
    setPortfolio(normalized);
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
        const unsavedDraft = normalizeSectionCanvas({ ...draft, id, published: false, slug: '', visits: 0, canvasElements: draft.canvasElements || [], templateContent: draft.templateContent || [], templateImages: draft.templateImages || [] });
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
  }), ['title', 'body'].includes(field) ? `section:${sectionId}:${field}` : ['contentOffsetX', 'contentOffsetY'].includes(field) ? `section:${sectionId}:position` : null);
  const updateTemplateImage = (imageId, value) => setPortfolioTracked((current) => {
    const images = Array.from({ length: Math.max(current.templateImages?.length || 0, imageId + 1) }, (_, index) => current.templateImages?.[index] || '');
    images[imageId] = value;
    return { ...current, templateImages: images };
  });
  const addCanvasElement = (type, image = '', iconName = 'sparkles') => {
    const index = portfolioRef.current?.canvasElements?.length || 0;
    const isPhoto = type === 'image';
    const sectionId = supportsSectionCanvas ? selectedSectionId || portfolioRef.current?.sections?.find((section) => section.type === 'header')?.id || portfolioRef.current?.sections?.[0]?.id : '';
    const sectionPlacement = sectionId ? { x: isPhoto ? 62 : type === 'icon' ? 78 : type === 'text' ? 8 : 10, y: isPhoto ? 8 : type === 'text' ? 68 : 12, width: isPhoto ? 30 : type === 'text' ? 44 : type === 'icon' ? 14 : 22 } : null;
    const element = {
      id: `element-${Date.now()}-${index}`, type, sectionId, ...(sectionId ? { sectionCanvasVersion: 1 } : {}),
      x: sectionPlacement?.x ?? (isPhoto ? 62 : 9 + (index % 3) * 8),
      y: sectionPlacement?.y ?? (isPhoto ? 12 + (index % 3) * 3 : 14 + index * 4),
      width: sectionPlacement?.width ?? (type === 'text' ? 36 : type === 'icon' ? 16 : isPhoto ? 30 : 25),
      height: type === 'text' ? 120 : type === 'icon' ? 96 : isPhoto ? 250 : 190,
      text: type === 'text' ? 'Add your text here' : '', image, iconName,
      color: portfolioRef.current?.theme?.accent || '#222222', fontSize: 32,
    };
    setPortfolioTracked((current) => ({ ...current, canvasElements: [...(current.canvasElements || []), element] }));
    setSelectedCanvasElement(element.id);
    setActivePanel('elements');
  };
  const updateCanvasElement = useCallback((elementId, patch) => {
    if (patch.sectionId) setSelectedSectionId(patch.sectionId);
    setPortfolioTracked((current) => ({
      ...current,
      canvasElements: (current.canvasElements || []).map((element) => {
        if (element.id !== elementId) return element;
        const movedToSection = Boolean(patch.sectionId && patch.sectionId !== element.sectionId);
        const next = { ...element, ...patch };
        if (next.sectionId && patch.width !== undefined) {
          next.width = Math.min(Math.max(8, 100 - next.x), patch.width);
        }
        if (movedToSection) {
          next.sectionCanvasVersion = 1;
          next.x = patch.x ?? (element.type === 'image' ? 62 : element.type === 'icon' ? 78 : 8);
          next.y = patch.y ?? (element.type === 'image' ? 8 : element.type === 'text' ? 68 : 12);
          next.width = element.type === 'image' ? 30 : element.type === 'text' ? 44 : element.type === 'icon' ? 14 : 22;
        }
        next.x = Math.min(next.x, Math.max(0, 100 - next.width));
        return next;
      }),
    }), `element:${elementId}`);
  }, [setPortfolioTracked]);
  const removeCanvasElement = useCallback((elementId) => {
    setPortfolioTracked((current) => ({ ...current, canvasElements: (current.canvasElements || []).filter((element) => element.id !== elementId) }));
    setSelectedCanvasElement(null);
  }, [setPortfolioTracked]);
  const getCanvasElementBounds = useCallback((element) => {
    if (element?.sectionId) {
      const section = [...document.querySelectorAll('[data-section-id]')].find((node) => node.dataset.sectionId === element.sectionId);
      if (section) return section.getBoundingClientRect();
    }
    return editorCanvasRef.current?.querySelector('.portfolio-composition')?.getBoundingClientRect() || null;
  }, []);
  const duplicateCanvasElement = useCallback((elementId) => {
    const source = portfolioRef.current?.canvasElements?.find((element) => element.id === elementId);
    if (!source || (portfolioRef.current.canvasElements || []).length >= 100) return;
    const bounds = getCanvasElementBounds(source);
    const maxX = Math.max(0, Math.min(source.sectionId ? 100 - source.width : 96, 100 - source.width));
    const maxY = bounds ? Math.max(0, 100 - (source.height / bounds.height) * 100) : 99;
    const copy = { ...source, id: `element-${Date.now()}-${portfolioRef.current.canvasElements.length}`, x: Math.max(0, Math.min(maxX, source.x + 3)), y: Math.max(0, Math.min(maxY, source.y + 3)) };
    setPortfolioTracked((current) => ({ ...current, canvasElements: [...(current.canvasElements || []), copy] }));
    setSelectedCanvasElement(copy.id);
  }, [getCanvasElementBounds, setPortfolioTracked]);
  const moveCanvasElementLayer = (elementId, offset) => setPortfolioTracked((current) => {
    const elements = [...(current.canvasElements || [])];
    const from = elements.findIndex((element) => element.id === elementId);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= elements.length) return current;
    const [element] = elements.splice(from, 1);
    elements.splice(to, 0, element);
    return { ...current, canvasElements: elements };
  });
  const alignCanvasElement = (element, axis, position) => {
    const bounds = getCanvasElementBounds(element);
    if (axis === 'horizontal') {
      const maxX = Math.max(0, Math.min(element.sectionId ? 100 - element.width : 96, 100 - element.width));
      const x = position === 'left' ? 0 : position === 'center' ? maxX / 2 : maxX;
      updateCanvasElement(element.id, { x: Math.max(0, x) });
      return;
    }
    const elementHeight = bounds ? (element.height / bounds.height) * 100 : 10;
    const maxY = Math.max(0, 100 - elementHeight);
    const y = position === 'top' ? 0 : position === 'middle' ? maxY / 2 : maxY;
    updateCanvasElement(element.id, { y });
  };

  useEffect(() => {
    if (isPreview) return undefined;
    const handleCanvasShortcuts = (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      const selected = portfolioRef.current?.canvasElements?.find((element) => element.id === selectedCanvasElement);
      if (!selected) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && key === 'd') {
        event.preventDefault();
        duplicateCanvasElement(selected.id);
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        removeCanvasElement(selected.id);
        return;
      }
      if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      const bounds = getCanvasElementBounds(selected);
      const maxX = Math.max(0, Math.min(selected.sectionId ? 100 - selected.width : 96, 100 - selected.width));
      const maxY = bounds ? Math.max(0, 100 - (selected.height / bounds.height) * 100) : 99;
      const x = Math.max(0, Math.min(maxX, selected.x + (key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0)));
      const y = Math.max(0, Math.min(maxY, selected.y + (key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0)));
      updateCanvasElement(selected.id, { x, y });
    };
    window.addEventListener('keydown', handleCanvasShortcuts);
    return () => window.removeEventListener('keydown', handleCanvasShortcuts);
  }, [duplicateCanvasElement, getCanvasElementBounds, isPreview, removeCanvasElement, selectedCanvasElement, updateCanvasElement]);
  const selectCanvasElement = (elementId, elementRect) => {
    setSelectedCanvasElement(elementId);
    if (elementId) {
      setActivePanel('elements');
      const element = portfolioRef.current?.canvasElements?.find((item) => item.id === elementId);
      if (supportsSectionCanvas && element && !element.sectionId && elementRect) {
        const centerY = elementRect.top + elementRect.height / 2;
        const sections = [...(document.querySelectorAll('[data-section-id]') || [])]
          .map((node) => ({ id: node.dataset.sectionId, rect: node.getBoundingClientRect() }))
          .filter((section) => portfolioRef.current?.sections.some((item) => item.id === section.id));
        const target = sections.find((section) => centerY >= section.rect.top && centerY <= section.rect.bottom)
          || sections.sort((a, b) => Math.abs((a.rect.top + a.rect.bottom) / 2 - centerY) - Math.abs((b.rect.top + b.rect.bottom) / 2 - centerY))[0];
        if (target) {
          setSelectedSectionId(target.id);
          updateCanvasElement(elementId, { sectionId: target.id });
        }
      } else if (element?.sectionId) setSelectedSectionId(element.sectionId);
    }
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
  const removeSection = (sectionId) => setPortfolioTracked((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== sectionId), canvasElements: (current.canvasElements || []).filter((element) => element.sectionId !== sectionId) }));
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
          {isIPortfolio ? <><div className="editor-panel" data-editor-panel="sections"><h2>Edit iPortfolio</h2><p>Click text in the page to edit it. Click a photo to select it, then replace it below. Changes autosave; the original theme and layout stay intact.</p><p className="editor-link-hint">Paste a full URL into page text to make it clickable in preview and on the published page.</p><p>Uploaded template images may total up to 5 MB.</p><p>Use Preview site to review the page without editing controls.</p>{selectedTemplateImage !== null && <><label>Replace selected image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0], (url) => updateTemplateImage(selectedTemplateImage, url))} /></label>{portfolio.templateImages?.[selectedTemplateImage] && <button className="editor-button" onClick={() => updateTemplateImage(selectedTemplateImage, '')}>Restore original image</button>}</>}</div><CanvasElementControls {...{ portfolio, selectedCanvasElement, selectedSectionId, setSelectedSectionId, supportsSectionCanvas, addCanvasElement, uploadImage, updateCanvasElement, updateSection, removeCanvasElement, duplicateCanvasElement, moveCanvasElementLayer, alignCanvasElement }} /></> : <>
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
          <CanvasElementControls {...{ portfolio, selectedCanvasElement, selectedSectionId, setSelectedSectionId, supportsSectionCanvas, addCanvasElement, uploadImage, updateCanvasElement, updateSection, removeCanvasElement, duplicateCanvasElement, moveCanvasElementLayer, alignCanvasElement }} />
          {portfolio.templateId === 'grunge-portfolio' ? <div className="editor-panel" data-editor-panel="theme"><h2>Grunge styling</h2><p>The original charcoal paper background, monochrome palette, and texture are kept intact. Edit the sections and replace the sample images below.</p></div> : <div className="editor-panel" data-editor-panel="theme"><h2>Theme</h2><label>Accent colour<div className="editor-swatch-row">{COLORS.map((color) => <button key={color} aria-label={`Set accent ${color}`} className={`editor-swatch ${portfolio.theme?.accent === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => changeTheme('accent', color)} />)}</div></label><ColorWheel label="Custom accent" value={portfolio.theme?.accent || '#e6e51e'} onChange={(value) => changeTheme('accent', value)} />
            <label>Page background<div className="editor-swatch-row">{BACKGROUNDS.map((color) => <button key={color} aria-label={`Set background ${color}`} className={`editor-swatch ${portfolio.theme?.background === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => changeTheme('background', color)} />)}</div></label><ColorWheel label="Custom background" value={portfolio.theme?.background || '#ffffff'} onChange={(value) => changeTheme('background', value)} />
            <div className="editor-theme-control"><strong>Section color</strong><div className="editor-swatch-row"><button type="button" aria-label="Use transparent section color" aria-pressed={!portfolio.theme?.section || portfolio.theme.section === 'transparent'} className={`editor-swatch editor-swatch--transparent ${!portfolio.theme?.section || portfolio.theme.section === 'transparent' ? 'selected' : ''}`} onClick={() => changeTheme('section', 'transparent')}>×</button>{['#ffffff', '#f7f5ee', '#f3f6ff', '#fff1e8', '#eaf5ef'].map((color) => <button type="button" key={color} aria-label={`Set section color ${color}`} aria-pressed={portfolio.theme?.section === color} className={`editor-swatch ${portfolio.theme?.section === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => changeTheme('section', color)} />)}<label className="editor-native-color" title="Choose custom section color">Custom<input type="color" aria-label="Custom section color" value={portfolio.theme?.section && portfolio.theme.section !== 'transparent' ? portfolio.theme.section : '#ffffff'} onChange={(event) => changeTheme('section', event.target.value)} /></label></div></div>
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

function CanvasElementControls({ portfolio, selectedCanvasElement, selectedSectionId, setSelectedSectionId, supportsSectionCanvas, addCanvasElement, uploadImage, updateCanvasElement, updateSection, removeCanvasElement, duplicateCanvasElement, moveCanvasElementLayer, alignCanvasElement }) {
  const element = (portfolio.canvasElements || []).find((item) => item.id === selectedCanvasElement);
  const editingSectionId = element?.sectionId || selectedSectionId;
  const editingSection = portfolio.sections.find((section) => section.id === editingSectionId);
  return <div className="editor-panel editor-elements-panel" data-editor-panel="elements">
    <h2>Elements</h2><p>Choose a section, then add items. Photos stay inside that section and the text makes room.</p>
    {supportsSectionCanvas && <label className="editor-section-target">Place in section<select value={editingSectionId || ''} onChange={(event) => { const sectionId = event.target.value; setSelectedSectionId(sectionId); if (element) updateCanvasElement(element.id, { sectionId }); }} aria-label="Place element in section">{portfolio.sections.map((section) => <option key={section.id} value={section.id}>{SECTION_LIBRARY[section.type]?.label || section.type}</option>)}</select></label>}
    {supportsSectionCanvas && editingSection && <div className="editor-section-text-position"><strong>Move section text</strong><p>Drag the ✥ handle beside section text to move it inside this section.</p><label>Left / right<input type="range" min="-600" max="600" step="1" value={editingSection.contentOffsetX || 0} onChange={(event) => updateSection(editingSection.id, 'contentOffsetX', Number(event.target.value))} /></label><label>Up / down<input type="range" min="-600" max="600" step="1" value={editingSection.contentOffsetY || 0} onChange={(event) => updateSection(editingSection.id, 'contentOffsetY', Number(event.target.value))} /></label></div>}
    <div className="editor-element-adders">
      <button type="button" onClick={() => addCanvasElement('text')}><span aria-hidden="true">T</span> Add text</button>
      <label className="editor-element-upload"><span aria-hidden="true">▧</span> Add photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file, (url) => addCanvasElement('image', url)); event.target.value = ''; }} /></label>
      <button type="button" onClick={() => addCanvasElement('rectangle')}><span aria-hidden="true">□</span> Rectangle</button>
      <button type="button" onClick={() => addCanvasElement('circle')}><span aria-hidden="true">○</span> Circle</button>
      <button type="button" onClick={() => addCanvasElement('line')}><span aria-hidden="true">―</span> Line</button>
    </div>
    <div className="editor-icon-library"><div className="editor-icon-library__heading"><strong>{element?.type === 'icon' ? 'Change icon' : 'SVG icons'}</strong><a href="https://www.svgrepo.com/vectors/sparkles/" target="_blank" rel="noreferrer">Browse SVG Repo ↗</a></div><div className="editor-icon-library__grid">{PORTFOLIO_ICONS.map((icon) => <button type="button" key={icon.id} title={icon.label} aria-label={`${element?.type === 'icon' ? 'Use' : 'Add'} ${icon.label} icon`} className={element?.type === 'icon' && element.iconName === icon.id ? 'is-active' : ''} onClick={() => element?.type === 'icon' ? updateCanvasElement(element.id, { iconName: icon.id }) : addCanvasElement('icon', '', icon.id)}><PortfolioIcon name={icon.id} /><span>{icon.label}</span></button>)}</div></div>
    {element && <div className="editor-element-properties">
      <div className="editor-element-properties__heading"><strong>{element.type === 'image' ? 'Edit image' : `Edit ${element.type}`}</strong><span>{element.type === 'image' ? 'Drag the photo to move it. Use its corner handle to resize.' : 'Drag the item to move it. Use its corner handle to resize.'}</span></div>
      <div className="editor-element-align" aria-label="Align selected element">
        <span>Align</span>
        <div><button type="button" aria-label="Align left" title="Align left" onClick={() => alignCanvasElement(element, 'horizontal', 'left')}>⇤</button><button type="button" aria-label="Align horizontal center" title="Center horizontally" onClick={() => alignCanvasElement(element, 'horizontal', 'center')}>↔</button><button type="button" aria-label="Align right" title="Align right" onClick={() => alignCanvasElement(element, 'horizontal', 'right')}>⇥</button></div>
        <div><button type="button" aria-label="Align top" title="Align top" onClick={() => alignCanvasElement(element, 'vertical', 'top')}>⇡</button><button type="button" aria-label="Align vertical middle" title="Center vertically" onClick={() => alignCanvasElement(element, 'vertical', 'middle')}>↕</button><button type="button" aria-label="Align bottom" title="Align bottom" onClick={() => alignCanvasElement(element, 'vertical', 'bottom')}>⇣</button></div>
      </div>
      <p className="editor-element-shortcuts">Arrow keys nudge · Shift + arrows move faster · Ctrl/Cmd + D duplicates · Delete removes</p>
      {element.type === 'text' && <label>Text<textarea value={element.text} rows={3} onChange={(event) => updateCanvasElement(element.id, { text: event.target.value })} /></label>}
      {element.type === 'image' && <>
        <label className="editor-image-replace">Replace image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file, (url) => updateCanvasElement(element.id, { image: url })); event.target.value = ''; }} /></label>
        <div className="editor-image-fit" role="group" aria-label="Image crop mode"><span>Image crop</span><div><button type="button" className={(element.imageFit || 'cover') === 'cover' ? 'is-active' : ''} aria-pressed={(element.imageFit || 'cover') === 'cover'} onClick={() => updateCanvasElement(element.id, { imageFit: 'cover' })}>Fill</button><button type="button" className={element.imageFit === 'contain' ? 'is-active' : ''} aria-pressed={element.imageFit === 'contain'} onClick={() => updateCanvasElement(element.id, { imageFit: 'contain' })}>Fit</button></div></div>
      </>}
      <div className="editor-element-action-grid">
        {(portfolio.canvasElements || []).length > 1 && <>
          <button type="button" aria-label="Send element backward" title="Send backward one layer" disabled={(portfolio.canvasElements || []).findIndex((item) => item.id === element.id) === 0} onClick={() => moveCanvasElementLayer(element.id, -1)}><span aria-hidden="true">↓</span> Backward</button>
          <button type="button" aria-label="Bring element forward" title="Bring forward one layer" disabled={(portfolio.canvasElements || []).findIndex((item) => item.id === element.id) === (portfolio.canvasElements || []).length - 1} onClick={() => moveCanvasElementLayer(element.id, 1)}><span aria-hidden="true">↑</span> Forward</button>
        </>}
        <button type="button" aria-label="Duplicate selected element" disabled={(portfolio.canvasElements || []).length >= 100} onClick={() => duplicateCanvasElement(element.id)}><span aria-hidden="true">⧉</span> Duplicate</button>
        <button type="button" className="is-danger" aria-label="Delete selected element" onClick={() => removeCanvasElement(element.id)}><span aria-hidden="true">×</span> Delete</button>
      </div>
      {element.type !== 'image' && <ColorWheel label="Element color" value={element.color} onChange={(value) => updateCanvasElement(element.id, { color: value })} />}
      {element.type === 'text' && <label>Text size<input type="range" min="14" max="72" value={element.fontSize} onChange={(event) => updateCanvasElement(element.id, { fontSize: Number(event.target.value) })} /></label>}
      {(element.type === 'text' || element.type === 'image' || element.type === 'icon' || ['rectangle', 'circle', 'line'].includes(element.type)) && <label>Width<input type="range" min="8" max={Math.max(8, Math.min(100 - element.x, element.sectionId ? 100 - element.x : 96 - element.x))} value={element.width} onChange={(event) => updateCanvasElement(element.id, { width: Number(event.target.value) })} /></label>}
      {element.type !== 'line' && <label>Height<input type="range" min="30" max="720" value={element.height} onChange={(event) => updateCanvasElement(element.id, { height: Number(event.target.value) })} /></label>}
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
        <label>Picker<input type="color" aria-label={`${label} picker`} value={`#${[rgb.r, rgb.g, rgb.b].map((part) => part.toString(16).padStart(2, '0')).join('')}`} onChange={(event) => { setHexDraft(event.target.value); onChange(event.target.value); }} /></label>
        <label>Brightness<input aria-label={`${label} brightness`} type="range" min="10" max="100" value={Math.round(hsv.v * 100)} onChange={(event) => onChange(hsvToHex(hsv.h, hsv.s, Number(event.target.value) / 100))} /></label>
        <div className="editor-rgb-inputs">{['r', 'g', 'b'].map((channel) => <label key={channel}>{channel.toUpperCase()}<input aria-label={`${label} ${channel.toUpperCase()}`} type="number" min="0" max="255" value={rgb[channel]} onChange={(event) => adjustRgb(channel, event.target.value)} /></label>)}</div>
        <label>Hex<input className="editor-hex-input" value={hexDraft} onChange={(event) => { const next = event.target.value; setHexDraft(next); if (/^#[\da-f]{6}$/i.test(next)) onChange(next); }} maxLength={7} aria-label={`${label} hex value`} /></label>
      </div>
    </div>
  </div>;
}
