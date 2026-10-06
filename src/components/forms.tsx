'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/client';
export function Newsletter() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = e.currentTarget;
    try {
      const r = await api<{ message: string }>('newsletter', {
        email: new FormData(f).get('email'),
      });
      setMessage(r.message);
      setError(false);
      f.reset();
    } catch (e) {
      setMessage((e as Error).message);
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="newsletter-form">
      <label className="sr-only" htmlFor="newsletter-email">
        Email address
      </label>
      <div className="newsletter-input">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Your email address"
          required
        />
        <button
          type="submit"
          className="icon-button"
          aria-label="Subscribe to the newsletter"
          disabled={busy}
        >
          <ArrowRight size={21} />
        </button>
      </div>
      <p className={error ? 'form-error small' : 'small muted'} role="status">
        {message || 'Collection notes, atelier stories, and little else.'}
      </p>
    </form>
  );
}
export function SimpleForm({
  endpoint,
  children,
  button = 'Send your note',
  success = 'Your changes have been saved.',
  refresh = false,
}: {
  endpoint: string;
  children: ReactNode;
  button?: string;
  success?: string;
  refresh?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const f = e.currentTarget;
    try {
      const r = await api<{ message?: string }>(endpoint, Object.fromEntries(new FormData(f)));
      setMessage(r.message || success);
      setError(false);
      if (refresh) window.location.reload();
      else f.reset();
    } catch (e) {
      setMessage((e as Error).message);
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-grid">
      {children}
      <button className="button" disabled={busy}>
        {busy ? 'Please wait…' : button}
        <ArrowRight size={16} />
      </button>
      {message && (
        <p role={error ? 'alert' : 'status'} className={error ? 'form-error' : 'form-success'}>
          {message}
        </p>
      )}
    </form>
  );
}
