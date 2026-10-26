import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

export default function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirm', isBusy = false, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  const latestRef = useRef({ onCancel, isBusy });
  latestRef.current = { onCancel, isBusy };

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('[data-dialog-cancel]')?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !latestRef.current.isBusy) {
        event.preventDefault();
        latestRef.current.onCancel?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="confirm-dialog__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isBusy) onCancel?.(); }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" ref={dialogRef}>
        <div className="confirm-dialog__icon" aria-hidden="true">!</div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog__actions">
          <button type="button" data-dialog-cancel onClick={onCancel} disabled={isBusy}>Cancel</button>
          <button type="button" className="confirm-dialog__confirm" onClick={onConfirm} disabled={isBusy}>{isBusy ? 'Deleting…' : confirmLabel}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
