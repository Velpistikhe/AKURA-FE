export default function QuotationSkeleton({ variant = 'form' }) {
  return <div className={`quotation-skeleton quotation-skeleton--${variant}`} role="status" aria-label="Loading quotation data" aria-busy="true">
    <div className="quotation-skeleton-grid" aria-hidden="true">
      {Array.from({ length: variant === 'form' ? 12 : 8 }, (_, index) => <div className="quotation-skeleton-field" key={index}>
        {variant === 'form' && <span className="quotation-skeleton-label" />}
        <span className="quotation-skeleton-bar" />
      </div>)}
    </div>
  </div>
}
