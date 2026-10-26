import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './ResetPassword.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!token) return setError('This reset link is missing its token. Request a new link from the login screen.');
    if (password.length < 8 || password.length > 128) return setError('Use a password between 8 and 128 characters.');
    if (password !== confirmPassword) return setError('The passwords do not match.');

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message || 'This reset link could not be used. Request a new one.');
        return;
      }
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reset-password">
      <section className="reset-password__card" aria-labelledby="reset-password-title">
        <Link className="reset-password__brand" to="/" aria-label="Pagecraft home">pagecraft</Link>
        {success ? (
          <>
            <h1 id="reset-password-title">Password updated</h1>
            <p>Your new password is ready. Log in to continue building your page.</p>
            <Link className="reset-password__submit" to="/">Back to log in</Link>
          </>
        ) : (
          <>
            <h1 id="reset-password-title">Choose a new password</h1>
            <p>Use at least 8 characters. Reset links expire after 30 minutes.</p>
            {error && <p className="reset-password__error" role="alert">{error}</p>}
            <form onSubmit={handleSubmit}>
              <label>
                <span>New password</span>
                <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required />
              </label>
              <label>
                <span>Confirm new password</span>
                <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={128} required />
              </label>
              <button className="reset-password__submit" type="submit" disabled={loading || !token}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
            {!token && <Link className="reset-password__back" to="/">Return to Pagecraft</Link>}
          </>
        )}
      </section>
    </main>
  );
}
