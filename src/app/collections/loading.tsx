export default function CollectionsLoading() {
  return (
    <div className="page-container collection-loading" aria-busy="true">
      <p className="sr-only" role="status">
        Loading the collection.
      </p>
      <div className="collection-loading-hero" aria-hidden="true">
        <div className="collection-loading-copy">
          <div className="loading-skeleton loading-kicker" />
          <div className="loading-skeleton loading-heading" />
          <div className="loading-skeleton loading-description" />
        </div>
        <div className="loading-skeleton collection-loading-image" />
      </div>
      <div className="collection-loading-tabs" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div className="loading-skeleton" key={item} />
        ))}
      </div>
      <div className="loading-skeleton collection-loading-filters" aria-hidden="true" />
      <div className="product-grid collection-loading-grid" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
          <div className="collection-loading-card" key={item}>
            <div className="loading-skeleton collection-loading-card-image" />
            <div className="loading-skeleton collection-loading-line" />
            <div className="loading-skeleton collection-loading-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
