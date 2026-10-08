'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RotateCcw, Download, Activity, X } from 'lucide-react';
import { api } from '@/lib/client';
export function rememberUndo(id?: string) {
  if (!id) return;
  try { sessionStorage.setItem('orven-undo', JSON.stringify({ id, expires: Date.now() + 5 * 60000 })); window.dispatchEvent(new Event('orven-undo')); } catch { /* The operations page also lists available undo actions. */ }
}
export function UndoButton({ id, onUndone }: { id: string; onUndone?: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false), router = useRouter();
  return <><button className="a-btn small" disabled={busy || done} onClick={async () => { setBusy(true); setError(''); try { await api('admin/undo', { id }); setDone(true); onUndone?.(); router.refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }}><RotateCcw size={14} aria-hidden="true" />{busy ? 'Checking…' : done ? 'Undone' : 'Undo'}</button>{error && <p className="form-error" role="alert">{error}</p>}</>;
}
export function UndoToast() {
  const path = usePathname(); const [action, setAction] = useState<{ id: string; expires: number } | null>(null);
  useEffect(() => {
    function read() { try { const raw = JSON.parse(sessionStorage.getItem('orven-undo') || 'null'); setAction(raw && typeof raw.id === 'string' && raw.expires > Date.now() ? raw : null); } catch { setAction(null); } }
    const initial = setTimeout(read, 0), timer = setInterval(read, 1000); window.addEventListener('orven-undo', read);
    return () => { clearTimeout(initial); clearInterval(timer); window.removeEventListener('orven-undo', read); };
  }, [path]);
  function dismiss() { try { sessionStorage.removeItem('orven-undo'); } catch {} setAction(null); }
  if (!action) return null;
  return <div className="a-undo-toast" role="status"><span>Change saved. Safe undo is available for up to 5 minutes.</span><UndoButton id={action.id} onUndone={dismiss} /><button className="a-icon" onClick={dismiss} aria-label="Dismiss undo notice"><X size={16} /></button></div>;
}
export function ServiceStatus() {
  const [state, setState] = useState('');
  useEffect(() => {
    let alive = true; let controller: AbortController | undefined;
    async function check() {
      controller?.abort(); const activeController = new AbortController(); controller = activeController; const timeout = setTimeout(() => activeController.abort(), 10000);
      try {
        const response = await fetch('/api/admin/status', { cache: 'no-store', signal: activeController.signal });
        if (!response.ok) throw new Error();
        const result = await response.json() as { payments: string };
        if (alive && !activeController.signal.aborted) {
          setState(result.payments === 'not-configured' ? 'Payment processing is not configured.' : '');
        }
      }
      catch {
        if (alive) setState(navigator.onLine ? 'Service status is unavailable. Retrying.' : 'Offline — reconnect to continue.');
      }
      finally { clearTimeout(timeout); }
    }
    void check(); const timer = setInterval(() => { if (!document.hidden) void check(); }, 30000);
    window.addEventListener('online', check); window.addEventListener('offline', check);
    return () => { alive = false; clearInterval(timer); controller?.abort(); window.removeEventListener('online', check); window.removeEventListener('offline', check); };
  }, []);
  if (!state) return null;
  return <p className="a-service-status" role="alert"><Activity size={15} aria-hidden="true" />{state}</p>;
}
export function PrintReport() {
  return <button className="a-btn primary report-print-button" onClick={() => window.print()}><Download size={16} aria-hidden="true" />Print / save PDF</button>;
}
