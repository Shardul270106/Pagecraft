import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../lib/api';
import { PortfolioView } from '../components/PortfolioView';
import './Editor.css';
import '../components/PortfolioTemplates.css';

function getAnonymousVisitorId() {
  const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  try {
    let visitorId = localStorage.getItem('pagecraft:visitor-id');
    if (!visitorId || !/^[a-z\d-]{16,80}$/i.test(visitorId)) {
      visitorId = makeId();
      localStorage.setItem('pagecraft:visitor-id', visitorId);
    }
    return visitorId;
  } catch {
    return makeId();
  }
}

export default function PublicPortfolio() {
  const { slug } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [loadedSlug, setLoadedSlug] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const requestCacheRef = useRef({ key: '', promise: null });
  const viewRecordedRef = useRef('');

  useEffect(() => {
    const requestKey = `${slug}:${attempt}`;
    let current = true;
    setPortfolio(null);
    setLoadedSlug('');
    setError('');
    if (requestCacheRef.current.key !== requestKey) {
      requestCacheRef.current = {
        key: requestKey,
        promise: fetch(`${API_URL}/api/portfolios/public/${slug}`)
          .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Portfolio not found.'); return result; }),
      };
    }
    requestCacheRef.current.promise
      .then((result) => { if (current) { setPortfolio(result); setLoadedSlug(slug); } })
      .catch((reason) => { if (current) setError(reason.message); });
    return () => { current = false; };
  }, [slug, attempt]);

  useEffect(() => {
    if (!portfolio || loadedSlug !== slug || viewRecordedRef.current === slug) return undefined;
    let timer;
    const scheduleVisibleView = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible' || viewRecordedRef.current === slug) return;
      timer = window.setTimeout(async () => {
        if (document.visibilityState !== 'visible' || viewRecordedRef.current === slug) return;
        viewRecordedRef.current = slug;
        const headers = { 'X-Pagecraft-Visitor': getAnonymousVisitorId() };
        try {
          const token = localStorage.getItem('token');
          if (token) headers.Authorization = `Bearer ${token}`;
        } catch {
          // Private browsing modes may block storage; anonymous counting still works.
        }
        try {
          const response = await fetch(`${API_URL}/api/portfolios/public/${slug}/view`, { method: 'POST', headers });
          if (!response.ok) viewRecordedRef.current = '';
        } catch {
          viewRecordedRef.current = '';
        }
      }, 2000);
    };
    scheduleVisibleView();
    document.addEventListener('visibilitychange', scheduleVisibleView);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', scheduleVisibleView);
    };
  }, [loadedSlug, portfolio, slug]);

  if (error) return <main className="editor-state public-portfolio-state" role="alert"><span className="home__eyebrow">PAGE UNAVAILABLE</span><h1>We couldn’t open this portfolio.</h1><p>{error}</p><div><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button><a href="/">Go to Pagecraft</a></div></main>;
  if (!portfolio) return <main className="editor-state public-portfolio-state" aria-busy="true"><span className="home__eyebrow">PAGECRAFT</span><p>Opening portfolio…</p></main>;
  return <main className={`public-portfolio ${portfolio.templateId === 'grunge-portfolio' ? 'public-portfolio--grunge' : ''} ${portfolio.templateId === 'iportfolio-bootstrap' ? 'public-portfolio--iportfolio' : ''}`}><PortfolioView portfolio={portfolio} /></main>;
}
