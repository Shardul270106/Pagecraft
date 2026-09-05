import { useState, useEffect } from 'react';
import './Navbar.css';
import AuthModal from './AuthModal';
import { useNavigate } from 'react-router-dom';

const NAV_LINKS = ['Templates', 'Live preview', 'Pricing'];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;


export default function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  // Load Google Identity Services script once
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  function openAuth(tab) {
    setAuthTab(tab);
    setApiError('');
    setAuthOpen(true);
  }

  // Called when Google returns an ID token
  async function handleGoogleResponse(response) {
    setIsLoading(true);
    setApiError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const result = await res.json();

      if (!res.ok) {
        setApiError(result.message || 'Google sign-in failed.');
        return;
      }

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setAuthOpen(false);
      navigate('/home');
    } catch (err) {
      console.error('Google auth error:', err);
      setApiError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Triggered by the "Continue with Google" button in AuthModal
  function handleGoogleClick() {
    if (!window.google) {
      setApiError('Google sign-in is still loading. Try again in a moment.');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });

    window.google.accounts.id.prompt();
  }

  // Handles local email+password signup/login
  async function handleAuthSubmit(mode, data) {
    setIsLoading(true);
    setApiError('');

    const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.code === 'ACCOUNT_EXISTS') {
          setAuthTab('login');
        } else if (result.code === 'ACCOUNT_NOT_FOUND') {
          setAuthTab('signup');
        }

        setApiError(result.message || 'Something went wrong.');
        return;
      }

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setAuthOpen(false);
      navigate('/home');
    } catch (err) {
      console.error('Auth error:', err);
      setApiError('Could not reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <header className="navbar-wrap">
      <div className="container">
        <nav className="navbar">
          <a href="#top" className="navbar__brand" aria-label="Pagecraft home">
            <span className="navbar__mark" aria-hidden="true">
              <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                <path
                  d="M4 15 L10 5 L16 15"
                  stroke="#000"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="navbar__wordmark">pagecraft</span>
          </a>

          <ul className="navbar__links">
            {NAV_LINKS.map((link) => (
              <li key={link}>
                <a href={`#${link.toLowerCase().replace(' ', '-')}`}>{link}</a>
              </li>
            ))}
          </ul>

          <div className="navbar__actions">
            <button
              type="button"
              className="pill-btn pill-btn--ghost"
              onClick={() => openAuth('login')}
            >
              Log in
            </button>
            <button
              type="button"
              className="pill-btn pill-btn--black pill-btn--sm"
              onClick={() => openAuth('signup')}
            >
              Sign up
            </button>
          </div>
        </nav>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialTab={authTab}
        onSubmit={handleAuthSubmit}
        onGoogleClick={handleGoogleClick}
        isLoading={isLoading}
        apiError={apiError}
      />
    </header>
  );
}