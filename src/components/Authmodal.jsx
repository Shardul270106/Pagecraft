import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Authmodal.css';
import authVideo from '../assets/video1.mp4';

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = 'login',
  onSubmit,
  googleConfigured,
  googleReady,
  onForgotPassword,
  isLoading,
  apiError,
  selectedTemplateName,
}) {
  const [tab, setTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [resetMessage, setResetMessage] = useState('');
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    const container = googleButtonRef.current;
    const googleId = window.google?.accounts?.id;
    if (!isOpen || !googleReady || !container || !googleId) return;

    container.replaceChildren();
    const width = Math.max(180, Math.min(400, Math.floor(container.getBoundingClientRect().width)));
    googleId.renderButton(container, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width,
    });
  }, [isOpen, googleReady]);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrors({});
      setShowPassword(false);
      setResetMessage('');
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    returnFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button, input')?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSignup = tab === 'signup';

  function handleSubmit(e) {
    e.preventDefault();

    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());

    const nextErrors = {};

    if (isSignup && !data.name?.trim()) {
      nextErrors.name = 'Enter your name.';
    }

    if (!data.email?.trim()) {
      nextErrors.email = 'Enter your email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!data.password || data.password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.';
    } else if (isSignup && data.password.length > 128) {
      nextErrors.password = 'Use no more than 128 characters.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onSubmit?.(tab, {
        ...data,
        name: data.name?.trim(),
        email: data.email.trim().toLowerCase(),
      });
    }
  }

  async function handleForgotPassword() {
    const emailInput = dialogRef.current?.querySelector('input[name="email"]');
    const email = emailInput?.value.trim().toLowerCase() || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((current) => ({ ...current, email: 'Enter a valid email address first.' }));
      emailInput?.focus();
      return;
    }
    setErrors((current) => ({ ...current, email: '' }));
    setResetMessage('');
    const result = await onForgotPassword?.(email);
    if (result?.ok) setResetMessage(result.message);
  }

  return createPortal((
    <div
      className="auth-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-heading"
        ref={dialogRef}
      >
        {/* =========================
            CLOSE BUTTON
        ========================= */}

        <button
          type="button"
          className="auth-modal__close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M2 2L14 14M14 2L2 14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* =========================
            VIDEO PANEL
        ========================= */}

        <div className="auth-modal__illustration">

         <video
  className="auth-modal__video"
  src={authVideo}
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  onError={(e) => {
    console.error('Video failed to load. Path was:', authVideo, e.target.error);
  }}
  onLoadedData={() => console.log('✅ Video loaded:', authVideo)}
/>
          {/* Dark overlay for text readability */}
          <div className="auth-modal__video-overlay" />

          {/* Text over video */}
          <div className="auth-modal__illustration-copy">
            <p className="auth-modal__eyebrow">
              pagecraft
            </p>

            <h3 className="auth-modal__marker-heading">
              <span className="auth-modal__marker-swipe">
                Build pages
              </span>
              <br />
              that pop.
            </h3>

            <p className="auth-modal__illustration-sub">
              Drag, drop, and ship a page in minutes.
            </p>
          </div>
        </div>

        {/* =========================
            FORM PANEL
        ========================= */}

        <div className="auth-modal__form-panel">

          {/* LOGIN / SIGNUP TABS */}

          <div
            className="auth-modal__tabs"
            role="tablist"
            aria-label="Login or sign up"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={`auth-modal__tab ${
                !isSignup ? 'is-active' : ''
              }`}
              onClick={() => {
                setTab('login');
                setErrors({});
              }}
            >
              Log in
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={`auth-modal__tab ${
                isSignup ? 'is-active' : ''
              }`}
              onClick={() => {
                setTab('signup');
                setErrors({});
              }}
            >
              Sign up
            </button>

            <span
              className={`auth-modal__tab-indicator ${
                isSignup ? 'is-signup' : ''
              }`}
            />
          </div>

          {/* HEADING */}

          <h2
            id="auth-modal-heading"
            className="auth-modal__heading"
          >
            {isSignup
              ? 'Create your account'
              : 'Welcome back'}
          </h2>

          <p className="auth-modal__subheading">
            {isSignup
              ? selectedTemplateName
                ? `Create an account and we’ll start a ${selectedTemplateName} draft for you.`
                : 'Start building your first page for free.'
              : 'Log in to keep working on your pages.'}
          </p>

          {/* API ERROR */}
          {apiError && (
            <p className="auth-modal__error" style={{ marginBottom: 12 }}>
              {apiError}
            </p>
          )}

          {/* GOOGLE */}

          <div className="auth-modal__google-button">
            {googleConfigured ? (
              googleReady
                ? <div ref={googleButtonRef} />
                : <span role="status">Loading Google sign-in…</span>
            ) : (
              <span role="status">Google sign-in is not configured for this site.</span>
            )}
          </div>

          {/* DIVIDER */}

          <div className="auth-modal__divider">
            <span>or</span>
          </div>

          {/* FORM */}

          <form
            className="auth-modal__form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* NAME */}

            {isSignup && (
              <label className="auth-modal__field">
                <span>Name</span>

                <input
                  className={`auth-modal__input ${
                    errors.name ? 'has-error' : ''
                  }`}
                  name="name"
                  type="text"
                  placeholder="Jordan Lee"
                  autoComplete="name"
                />

                {errors.name && (
                  <span className="auth-modal__error">
                    {errors.name}
                  </span>
                )}
              </label>
            )}

            {/* EMAIL */}

            <label className="auth-modal__field">
              <span>Email</span>

              <input
                className={`auth-modal__input ${
                  errors.email ? 'has-error' : ''
                }`}
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
              />

              {errors.email && (
                <span className="auth-modal__error">
                  {errors.email}
                </span>
              )}
            </label>

            {/* PASSWORD */}

            <label className="auth-modal__field">
              <span>Password</span>

              <div className="auth-modal__password-wrap">
                <input
                  className={`auth-modal__input ${
                    errors.password ? 'has-error' : ''
                  }`}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  autoComplete={
                    isSignup
                      ? 'new-password'
                      : 'current-password'
                  }
                />

                <button
                  type="button"
                  className="auth-modal__password-toggle"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {errors.password && (
                <span className="auth-modal__error">
                  {errors.password}
                </span>
              )}
            </label>

            {/* FORGOT PASSWORD */}
             
            {!isSignup && (
            <button
                type="button"
                className="auth-modal__forgot"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                Forgot password?
              </button>
            )}

            {resetMessage && <p className="auth-modal__reset-message" role="status">{resetMessage}</p>}

            {/* SUBMIT */}

            <button
              type="submit"
              className="pill-btn pill-btn--yellow auth-modal__submit"
              disabled={isLoading}
            >
              {isLoading
                ? 'Please wait...'
                : isSignup
                ? 'Create account'
                : 'Log in'}
            </button>
          </form>

          {/* SWITCH */}

          <p className="auth-modal__switch">
            {isSignup
              ? 'Already have an account?'
              : "Don't have an account?"}{' '}

            <button
              type="button"
              className="auth-modal__switch-link"
              onClick={() => {
                setTab(
                  isSignup
                    ? 'login'
                    : 'signup'
                );
                setErrors({});
              }}
            >
              {isSignup
                ? 'Log in'
                : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  ), document.body);
}
