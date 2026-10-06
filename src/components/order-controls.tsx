'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { useStore } from './store-provider';
export function OrderControls({ token, sandbox }: { token: string; sandbox: boolean }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { refresh } = useStore();
  async function act(confirm: boolean) {
    setBusy(true);
    try {
      await api(confirm ? 'checkout/confirm' : 'checkout/cancel', { token });
      await refresh();
      window.location.reload();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="row">
        {sandbox && (
          <button disabled={busy} className="button" onClick={() => act(true)}>
            Confirm simulated payment
          </button>
        )}
        <button disabled={busy} className="underlink" onClick={() => act(false)}>
          Cancel reservation
        </button>
        <button disabled={busy} className="underlink" onClick={() => window.location.reload()}>
          Refresh status
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
