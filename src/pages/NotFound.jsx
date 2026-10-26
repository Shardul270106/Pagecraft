import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <main className="not-found">
      <span className="not-found__eyebrow">PAGECRAFT · 404</span>
      <h1>This page could not be found.</h1>
      <p>The address may be outdated or the page may have moved.</p>
      <Link className="not-found__home" to="/">Back to Pagecraft</Link>
    </main>
  );
}
