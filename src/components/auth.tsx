'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/client';
export function AuthForm({
  mode = 'login',
  resetToken,
  next,
}: {
  mode?: 'login' | 'forgot' | 'reset';
  resetToken?: string;
  next?: string;
}) {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'reset'>(mode);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const r = await api<{
        role?: string;
        message?: string;
        confirmationRequired?: boolean;
      }>('auth/' + tab, {
        ...data,
        token: resetToken,
      });
      if (tab === 'forgot') {
        setMessage(
          r.message || 'If your account exists, a password reset link will arrive shortly.',
        );
      } else if (tab === 'reset') {
        setMessage('Your password has been updated. You can sign in again.');
        setTab('login');
      } else if (tab === 'register' && r.confirmationRequired) {
        setMessage(r.message || 'Check your email for a confirmation link before signing in.');
      } else {
        router.push(next === 'checkout' ? '/checkout' : r.role === 'ADMIN' ? '/admin' : '/account');
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-editorial" aria-label="ORVEN account introduction">
        <Image
          className="auth-editorial-image"
          src="/images/editorial/campaign.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, 50vw"
        />
        <div className="auth-editorial-shade" aria-hidden="true" />
        <Link className="auth-editorial-brand" href="/" aria-label="ORVEN home">
          ORVEN
        </Link>
        <div className="auth-editorial-copy">
          <p className="eyebrow">THE ART OF EVERYDAY</p>
          <h2>Considered pieces, held close.</h2>
          <p>Keep the details of your ORVEN account together, from saved pieces to past orders.</p>
          <Link className="auth-editorial-link" href="/collections">
            Explore the collection <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <p className="auth-editorial-caption">AI-generated ORVEN concept campaign</p>
      </aside>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <div className="auth-panel-inner">
          <div className="page-heading">
            <p className="eyebrow">YOUR PERSONAL ATELIER</p>
            <h1 id="auth-heading">
              {tab === 'forgot'
                ? 'A fresh start.'
                : tab === 'reset'
                  ? 'Set a new password.'
                  : tab === 'register'
                    ? 'Your next chapter.'
                    : 'Good to see you again.'}
            </h1>
            <p>
              {tab === 'forgot'
                ? 'Enter your email and we’ll prepare a password reset link.'
                : tab === 'reset'
                  ? 'Choose a new password of at least 12 characters.'
                  : tab === 'register'
                    ? 'Create an account to keep your orders, saved pieces, and details together.'
                    : 'Sign in to see your orders, saved pieces, and account details.'}
            </p>
          </div>
          {mode === 'login' && (
            <div className="auth-tabs" role="group" aria-label="Account access">
              <button
                type="button"
                aria-pressed={tab === 'login'}
                className={tab === 'login' ? 'active' : ''}
                onClick={() => {
                  setTab('login');
                  setError('');
                  setMessage('');
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={tab === 'register'}
                className={tab === 'register' ? 'active' : ''}
                onClick={() => {
                  setTab('register');
                  setError('');
                  setMessage('');
                }}
              >
                Create an account
              </button>
            </div>
          )}
          <form className="form-grid auth-form" onSubmit={submit} aria-busy={busy}>
            {tab === 'register' && (
              <label className="field">
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Your name"
                />
              </label>
            )}
            {tab !== 'reset' && (
              <label className="field">
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </label>
            )}
            {tab !== 'forgot' && (
              <label className="field">
                {tab === 'reset' ? 'New password' : 'Password'}
                <input
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  aria-describedby="auth-password-note"
                  required
                  minLength={tab === 'login' ? 1 : 12}
                  maxLength={128}
                  placeholder={tab === 'login' ? 'Enter your password' : 'At least 12 characters'}
                />
                <span className="auth-password-row">
                  <small id="auth-password-note">
                    {tab !== 'login' ? 'At least 12 characters. A phrase works well.' : ' '}
                  </small>
                  <button
                    className="auth-password-toggle"
                    type="button"
                    aria-pressed={show}
                    onClick={() => setShow(!show)}
                  >
                    {show ? 'Hide' : 'Show'} password
                  </button>
                </span>
              </label>
            )}
            <button className="button auth-submit" disabled={busy} aria-busy={busy}>
              {busy
                ? 'Please wait…'
                : tab === 'register'
                  ? 'Create your account'
                  : tab === 'forgot'
                    ? 'Send reset link'
                    : tab === 'reset'
                      ? 'Update password'
                      : 'Sign in'}
              <span className="auth-submit-arrow">
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="form-success" role="status">
                {message}
              </p>
            )}
          </form>
          <div className="auth-links">
            <Link href={tab === 'login' ? '/account/forgot' : '/account'}>
              {tab === 'login' ? 'Forgot your password?' : 'Return to sign in'}
            </Link>
            <Link href="/collections">Continue exploring</Link>
          </div>
          <p className="sample-note">
            Your ORVEN account keeps your orders, saved pieces, and personal details in one place.
          </p>
        </div>
      </section>
    </div>
  );
}
export function Logout() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <>
      <button
        className="underlink"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api('auth/logout', {});
            router.push('/account');
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
export function RemoveAddress({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="underlink"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await api('account/address', { id, remove: true });
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Removing address…' : 'Remove address'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
