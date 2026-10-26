import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function getPreviewStyle({ zoom, x, y }) {
  return {
    width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${x}% ${y}%`,
    transform: `scale(${zoom / 100})`, transformOrigin: 'center', pointerEvents: 'none',
  };
}

export default function PhotoAdjustDialog({ src, zoom = 100, x = 50, y = 50, aspect = '4 / 3', onChange }) {
  const [draft, setDraft] = useState(null);
  const dragRef = useRef(null);
  const openEditor = () => setDraft({ zoom: zoom || 100, x: x ?? 50, y: y ?? 50 });
  const update = (key, value) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const beginPan = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const pan = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - drag.x) / Math.max(1, bounds.width) * 100;
    const dy = (event.clientY - drag.y) / Math.max(1, bounds.height) * 100;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setDraft((current) => current ? {
      ...current,
      x: Math.min(100, Math.max(0, current.x + dx)),
      y: Math.min(100, Math.max(0, current.y + dy)),
    } : current);
  };
  const close = () => { dragRef.current = null; setDraft(null); };
  const apply = () => {
    if (!draft) return;
    onChange('zoom', draft.zoom);
    onChange('x', draft.x);
    onChange('y', draft.y);
    close();
  };

  return <>
    <button type="button" className="editor-photo-adjust-trigger" onClick={openEditor}>Adjust photo</button>
    {draft && createPortal(<div className="editor-crop-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="editor-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-crop-title">
        <header><div><h2 id="editor-crop-title">Adjust photo</h2><p>Drag the photo to reposition it. Use the slider or scroll to zoom.</p></div><button type="button" aria-label="Close photo editor" onClick={close}>×</button></header>
        <div className="editor-crop-viewport" style={{ aspectRatio: aspect }} onPointerDown={beginPan} onPointerMove={pan} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onWheel={(event) => { event.preventDefault(); setDraft((current) => current ? { ...current, zoom: Math.min(250, Math.max(100, current.zoom + (event.deltaY < 0 ? 5 : -5))) } : current); }}>
          <img src={src} alt="Crop preview" draggable="false" style={getPreviewStyle(draft)} />
          <span className="editor-crop-viewport__hint">DRAG TO REPOSITION</span>
        </div>
        <div className="editor-crop-controls">
          <label>Zoom <span>{draft.zoom}%</span><input type="range" min="100" max="250" step="1" value={draft.zoom} onChange={(event) => update('zoom', Number(event.target.value))} /></label>
          <label>Horizontal <span>{Math.round(draft.x)}%</span><input type="range" min="0" max="100" step="1" value={draft.x} onChange={(event) => update('x', Number(event.target.value))} /></label>
          <label>Vertical <span>{Math.round(draft.y)}%</span><input type="range" min="0" max="100" step="1" value={draft.y} onChange={(event) => update('y', Number(event.target.value))} /></label>
        </div>
        <footer><button type="button" className="editor-crop-reset" onClick={() => setDraft({ zoom: 100, x: 50, y: 50 })}>Reset</button><div><button type="button" onClick={close}>Cancel</button><button type="button" className="editor-button--dark" onClick={apply}>Done</button></div></footer>
      </section>
    </div>, document.body)}
  </>;
}
