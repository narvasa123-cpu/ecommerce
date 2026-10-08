'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';

export function CopyReference({
  value,
  label = 'Copy reference',
  successMessage = 'Copied',
}: {
  value: string;
  label?: string;
  successMessage?: string;
}) {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  return (
    <span className="copy-reference">
      <button
        className="tool-button"
        type="button"
        onClick={async () => {
          if (timeout.current) clearTimeout(timeout.current);
          setMessage('');
          setCopied(false);
          try {
            await navigator.clipboard.writeText(value);
            setMessage(successMessage);
            setCopied(true);
            timeout.current = setTimeout(() => {
              setMessage('');
              setCopied(false);
              timeout.current = null;
            }, 2200);
          } catch {
            setMessage('Copy unavailable. Select the reference number to copy it.');
          }
        }}
      >
        <Copy size={15} aria-hidden="true" />
        {label}
      </button>
      {message && (
        <span
          role="status"
          aria-live="polite"
          className={'copy-toast' + (copied ? ' success' : '')}
        >
          {message}
        </span>
      )}
    </span>
  );
}
