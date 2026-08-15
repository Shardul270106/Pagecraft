import { useState } from 'react';
import './Navbar.css';
import AuthModal from './AuthModal';

const NAV_LINKS = ['Templates', 'Live preview', 'Pricing'];

export default function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');

  function openAuth(tab) {
    setAuthTab(tab);
    setAuthOpen(true);
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
        onSubmit={(mode, data) => {
          console.log(mode, data);
          setAuthOpen(false);
        }}
      />
    </header>
  );
}