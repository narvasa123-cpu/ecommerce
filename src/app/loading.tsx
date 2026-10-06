export default function Loading() {
  return (
    <div className="page-container" role="status" aria-label="Loading the collection">
      <div className="loading-skeleton title" />
      <div className="product-grid">
        {[0, 1, 2, 3].map((i) => (
          <div className="loading-skeleton" key={i} />
        ))}
      </div>
      <span className="sr-only">Preparing your next page.</span>
    </div>
  );
}
