'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="page-heading">
        <p className="eyebrow">YOUR ORVEN</p>
        <h1>
          {tab === 'forgot'
            ? 'A fresh start.'
            : tab === 'reset'
              ? 'Make a new beginning.'
              : 'A place of your own.'}
        </h1>
        <p>
          {tab === 'forgot'
            ? 'Enter your email and we’ll prepare a password reset link.'
            : tab === 'reset'
              ? 'Choose a new password of at least 12 characters.'
              : 'Keep your details close, and follow your pieces from our atelier to you.'}
        </p>
      </div>
      {mode === 'login' && (
        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button
            role="tab"
            aria-selected={tab === 'login'}
            className={tab === 'login' ? 'active' : ''}
            onClick={() => {
              setTab('login');
              setError('');
            }}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={tab === 'register'}
            className={tab === 'register' ? 'active' : ''}
            onClick={() => {
              setTab('register');
              setError('');
            }}
          >
            Create an account
          </button>
        </div>
      )}
      <form className="form-grid" onSubmit={submit}>
        {tab === 'register' && (
          <label className="field">
            Full name
            <input name="name" autoComplete="name" required minLength={2} maxLength={100} />
          </label>
        )}
        {tab !== 'reset' && (
          <label className="field">
            Email address
            <input name="email" type="email" autoComplete="email" required maxLength={254} />
          </label>
        )}
        {tab !== 'forgot' && (
          <label className="field">
            {tab === 'reset' ? 'New password' : 'Password'}
            <input
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={tab === 'login' ? 1 : 12}
              maxLength={128}
            />
            <span className="row">
              <small>{tab !== 'login' ? 'At least 12 characters. A phrase works well.' : ''}</small>
              <button
                className="text-button small"
                type="button"
                aria-pressed={show}
                onClick={() => setShow(!show)}
              >
                {show ? 'Hide' : 'Show'} password
              </button>
            </span>
          </label>
        )}
        <button className="button" disabled={busy}>
          {busy
            ? 'Please wait…'
            : tab === 'register'
              ? 'Create your account'
              : tab === 'forgot'
                ? 'Send reset link'
                : tab === 'reset'
                  ? 'Update password'
                  : 'Sign in'}
          <ArrowRight size={16} />
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
        New accounts confirm their email through Supabase. Existing ORVEN accounts can continue
        signing in as usual.
      </p>
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
