'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LoaderCircle, MailCheck } from 'lucide-react';
import { api } from '@/lib/client';

export function SupabaseEmailAction({ mode }: { mode: 'confirm' | 'recover' }) {
  const [accessToken, setAccessToken] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Opening your secure link…');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const handled = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('access_token');
    const type = params.get('type');
    const authError = params.get('error_description');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    if (authError) {
      setStatus('error');
      setMessage(authError);
      return;
    }
    if (!token || (mode === 'recover' && type !== 'recovery')) {
      setStatus('error');
      setMessage('This link has expired or is invalid. Request a fresh email and try again.');
      return;
    }
    if (mode === 'recover') {
      setAccessToken(token);
      setStatus('ready');
      setMessage('Choose a new password for your ORVEN account.');
      return;
    }

    void api('auth/confirm', { accessToken: token })
      .then(() => {
        setStatus('success');
        setMessage('Your email is confirmed. Your ORVEN account is ready.');
        router.replace('/account?confirmed=1');
        router.refresh();
      })
      .catch((reason: unknown) => {
        setStatus('error');
        setMessage(reason instanceof Error ? reason.message : 'We could not confirm this email.');
      });
  }, [mode, router]);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirmation = String(form.get('confirmation') || '');
    if (password !== confirmation) {
      setError('Those passwords do not match.');
      setBusy(false);
      return;
    }
    try {
      await api('auth/reset-supabase', { accessToken, password });
      setStatus('success');
      setMessage('Your password has been updated. You can now sign in.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not update your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="page-heading">
        <p className="eyebrow">YOUR ORVEN</p>
        <h1>{mode === 'confirm' ? 'A place of your own.' : 'Make a new beginning.'}</h1>
        <p>
          {mode === 'confirm'
            ? 'We’re confirming your email address and preparing your account.'
            : 'Choose a new password to return to your ORVEN account.'}
        </p>
      </div>
      {mode === 'recover' && status === 'ready' ? (
        <form className="form-grid" onSubmit={resetPassword}>
          <label className="field">
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
            <small>At least 12 characters. A phrase works well.</small>
          </label>
          <label className="field">
            Confirm new password
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
            {busy ? (
              <LoaderCircle className="add-spinner" size={16} aria-hidden="true" />
            ) : (
              <ArrowRight size={16} aria-hidden="true" />
            )}
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div
          className="form-grid"
          role={status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {status === 'loading' && (
            <LoaderCircle className="add-spinner" size={20} aria-hidden="true" />
          )}
          {status === 'success' && <MailCheck size={20} aria-hidden="true" />}
          <p>{message}</p>
        </div>
      )}
      {(status === 'error' || status === 'success') && (
        <div className="auth-links">
          <Link href="/account">Return to your account</Link>
          {mode === 'recover' && status === 'success' && <Link href="/account">Sign in</Link>}
        </div>
      )}
    </div>
  );
}
