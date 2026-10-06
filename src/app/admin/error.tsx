'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="a-panel a-empty" role="alert">
      <h2>We couldn?t load this page.</h2>
      <p>Your saved records are safe. Try loading the workspace again.</p>
      <button className="a-btn primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
