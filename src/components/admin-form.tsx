'use client';
import { useState, type ReactNode, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { fromPhpAmount } from '@/lib/pricing';
export function AdminForm({
  endpoint,
  children,
  numbers = [],
  booleans = [],
  json = [],
  initial = {},
  redirectTo,
  currencies = [],
  cancelTo,
  submitLabel = 'Save changes',
}: {
  endpoint: string;
  children: ReactNode;
  numbers?: string[];
  booleans?: string[];
  json?: string[];
  initial?: Record<string, unknown>;
  redirectTo?: string;
  currencies?: string[];
  cancelTo?: string;
  submitLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const fields = new FormData(e.currentTarget);
      const body: Record<string, unknown> = { ...initial, ...Object.fromEntries(fields) };
      numbers.forEach((k) => {
        body[k] = Number(body[k]);
      });
      currencies.forEach((k) => {
        body[k] = fromPhpAmount(Number(body[k]));
      });
      booleans.forEach((k) => {
        body[k] = fields.get(k) === 'on';
      });
      json.forEach((k) => {
        try {
          body[k] = JSON.parse(String(body[k]));
        } catch {
          throw new Error(k + ': enter valid JSON.');
        }
      });
      if (body.expiresAt) body.expiresAt = new Date(String(body.expiresAt) + 'Z').toISOString();
      await api('admin/' + endpoint, body);
      setMessage('Changes saved successfully.');
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      {children}
      <div className="a-save-bar">
        <p className="a-muted">Save to apply your changes.</p>
        <div className="a-form-actions">
          {cancelTo && (
            <button
              className="a-btn"
              type="button"
              disabled={busy}
              onClick={() => router.push(cancelTo)}
            >
              Cancel
            </button>
          )}
          <button className="a-btn primary" disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
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
  );
}
