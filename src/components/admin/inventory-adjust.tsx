'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { api } from '@/lib/client';
export function InventoryAdjust({
  id,
  name,
  sku,
  quantity,
}: {
  id: string;
  name: string;
  sku: string;
  quantity: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [delta, setDelta] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('admin/inventory', {
        variantId: id,
        delta: Number(delta),
        reason: new FormData(e.currentTarget).get('reason'),
      });
      setSaved(true);
      dialog.current?.close();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="a-btn small"
        onClick={() => {
          setDelta('');
          setError('');
          setSaved(false);
          dialog.current?.showModal();
        }}
      >
        Adjust
      </button>
      {saved && (
        <span className="a-saved" role="status">
          Saved
        </span>
      )}
      <dialog
        ref={dialog}
        className="a-modal"
        aria-labelledby={'adjust-' + id}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <div className="a-dialog-title">
          <h2 id={'adjust-' + id}>Adjust inventory</h2>
          <button
            disabled={busy}
            className="a-icon"
            aria-label="Close inventory adjustment"
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        <p>
          <strong>{name}</strong>
          <br />
          <span className="a-muted">{sku}</span>
        </p>
        <form onSubmit={submit} className="form-grid">
          <div className="a-stock-preview">
            <span>
              Available <strong>{quantity}</strong>
            </span>
            <span>
              After adjustment <strong>{quantity + (Number(delta) || 0)}</strong>
            </span>
          </div>
          <label className="field">
            Quantity change
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              required
              min={Math.max(-quantity, -1000)}
              max={1000}
              placeholder="e.g. 10 or -2"
            />
            <small>Positive adds stock; negative removes stock.</small>
          </label>
          <label className="field">
            Reason
            <textarea
              name="reason"
              required
              minLength={5}
              maxLength={300}
              placeholder="Stock received, damage, or count correction"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="a-form-actions">
            <button
              className="a-btn"
              type="button"
              disabled={busy}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button className="a-btn primary" disabled={busy || !Number(delta)}>
              {busy ? 'Saving…' : 'Save adjustment'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
