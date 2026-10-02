import { useState, useEffect, useRef } from 'react';
import './Authmodal.css';
import authVideo from '../assets/video1.mp4';

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = 'login',
  onSubmit,
  onGoogleClick,
  isLoading,
  apiError,
}) {
  const [tab, setTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const dialogRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrors({});
      setShowPassword(false);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
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

  return (
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
              ? 'Start building your first page for free.'
              : 'Log in to keep working on your pages.'}
          </p>

          {/* API ERROR */}
          {apiError && (
            <p className="auth-modal__error" style={{ marginBottom: 12 }}>
              {apiError}
            </p>
          )}

          {/* GOOGLE */}

          <button
            type="button"
            className="auth-modal__social-btn"
            onClick={onGoogleClick}
            disabled={isLoading}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9C16.66 14.2 17.64 11.9 17.64 9.2z"
              />

              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z"
              />

              <path
                fill="#FBBC05"
                d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03z"
              />

              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
              />
            </svg>

            Continue with Google
          </button>

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
            <a  
                href="#"
                className="auth-modal__forgot"
                onClick={(e) => e.preventDefault()}
              >
                Forgot password?
              </a>
            )}

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
  );
}
