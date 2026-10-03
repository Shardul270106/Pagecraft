import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../lib/api';
import { PortfolioView } from '../components/PortfolioView';
import './Editor.css';
import '../components/PortfolioTemplates.css';

export default function PublicPortfolio() {
  const { slug } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setPortfolio(null);
    setError('');
    fetch(`${API_URL}/api/portfolios/public/${slug}`)
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Portfolio not found.'); return result; })
      .then((result) => { if (current) setPortfolio(result); })
      .catch((reason) => { if (current) setError(reason.message); });
    return () => { current = false; };
  }, [slug, attempt]);

  if (error) return <main className="editor-state public-portfolio-state" role="alert"><span className="home__eyebrow">PAGE UNAVAILABLE</span><h1>We couldn’t open this portfolio.</h1><p>{error}</p><div><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button><a href="/">Go to Pagecraft</a></div></main>;
  if (!portfolio) return <main className="editor-state public-portfolio-state" aria-busy="true"><span className="home__eyebrow">PAGECRAFT</span><p>Opening portfolio…</p></main>;
  return <main className={`public-portfolio ${portfolio.templateId === 'grunge-portfolio' ? 'public-portfolio--grunge' : ''} ${portfolio.templateId === 'iportfolio-bootstrap' ? 'public-portfolio--iportfolio' : ''}`}><PortfolioView portfolio={portfolio} /></main>;
}
