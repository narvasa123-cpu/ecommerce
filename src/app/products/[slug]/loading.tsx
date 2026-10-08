export default function ProductLoading() {
  return (
    <div className="page-container product-loading" aria-busy="true">
      <p className="sr-only" role="status">
        Loading product details.
      </p>
      <div className="loading-skeleton product-loading-breadcrumb" aria-hidden="true" />
      <div className="product-layout">
        <div className="product-loading-gallery" aria-hidden="true">
          <div className="loading-skeleton product-loading-image" />
          <div className="product-loading-thumbs">
            {[0, 1, 2].map((item) => (
              <div className="loading-skeleton" key={item} />
            ))}
          </div>
        </div>
        <div className="product-loading-copy" aria-hidden="true">
          <div className="loading-skeleton product-loading-kicker" />
          <div className="loading-skeleton product-loading-heading" />
          <div className="loading-skeleton product-loading-price" />
          <div className="loading-skeleton product-loading-description" />
          <div className="loading-skeleton product-loading-description short" />
          <div className="product-loading-options">
            {[0, 1, 2].map((item) => (
              <div className="loading-skeleton" key={item} />
            ))}
          </div>
          <div className="loading-skeleton product-loading-button" />
        </div>
      </div>
    </div>
  );
}
