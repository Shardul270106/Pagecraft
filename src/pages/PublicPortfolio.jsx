import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../lib/api';
import { PortfolioView } from '../components/PortfolioView';
import './Editor.css';

export default function PublicPortfolio() {
  const { slug } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/portfolios/public/${slug}`)
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Portfolio not found.'); return result; })
      .then(setPortfolio).catch((reason) => setError(reason.message));
  }, [slug]);

  if (error) return <main className="editor-state">{error}</main>;
  if (!portfolio) return <main className="editor-state">Loading portfolio…</main>;
  return <main className={`public-portfolio ${portfolio.templateId === 'grunge-portfolio' ? 'public-portfolio--grunge' : ''} ${portfolio.templateId === 'iportfolio-bootstrap' ? 'public-portfolio--iportfolio' : ''}`}><PortfolioView portfolio={portfolio} /></main>;
}
