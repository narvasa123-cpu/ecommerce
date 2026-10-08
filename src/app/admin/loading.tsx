export default function Loading() {
  return (
    <div className="a-dashboard-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="a-sr-only">Loading the latest store analytics.</span>
      <div className="a-skeleton a-skeleton-hero" />
      <div className="a-metrics">
        {[0, 1, 2, 3].map((i) => (
          <div className="a-skeleton a-skeleton-metric" key={i} />
        ))}
      </div>
      <div className="a-dashboard-grid">
        <div className="a-skeleton a-skeleton-chart" />
        <div className="a-skeleton a-skeleton-chart" />
      </div>
    </div>
  );
}
