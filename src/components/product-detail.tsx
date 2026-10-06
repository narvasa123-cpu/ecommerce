'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Plus, X } from 'lucide-react';
import { useStore } from './store-provider';
import { money } from '@/lib/pricing';
import type { CatalogProduct } from '@/lib/catalog';
function stockLabel(q: number, mto: boolean) {
  return mto
    ? 'Made to order'
    : q === 0
      ? 'Sold out'
      : q <= 3
        ? 'Low stock — ' + q + ' remaining'
        : 'In stock';
}
export function ProductDetail({ product: p }: { product: CatalogProduct }) {
  const [index, setIndex] = useState(0);
  const [variantId, setVariantId] = useState(p.variants[0]?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const zoom = useRef<HTMLDialogElement>(null);
  const { add } = useStore();
  const v = p.variants.find((v) => v.id === variantId);
  const quantity = v?.inventory?.quantity || 0;
  const photos = p.images;
  const next = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);
  async function addToBag() {
    if (!v) return;
    setBusy(true);
    setError('');
    try {
      await add(v.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="product-layout">
      <div
        className="gallery"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') next(1);
          if (e.key === 'ArrowLeft') next(-1);
        }}
      >
        <div className="gallery-image">
          <button aria-label="Zoom product image" onClick={() => zoom.current?.showModal()}>
            <Image
              src={photos[index].url}
              alt={photos[index].alt}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 760px) 100vw, 50vw"
            />
            <span className="zoom-label">
              <Plus size={18} />
            </span>
          </button>
        </div>
        <div className="gallery-thumbs" aria-label="Product gallery">
          {photos.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setIndex(i)}
              aria-label={'View image ' + (i + 1)}
              aria-pressed={index === i}
              className={index === i ? 'active' : ''}
            >
              <Image src={img.url} alt={img.alt} width={66} height={80} />
            </button>
          ))}
        </div>
        <p className="sample-note align-left">
          AI-generated concept imagery, representative only. Use arrow keys to browse.
        </p>
        <dialog ref={zoom} className="zoom-dialog" aria-label="Enlarged product gallery">
          <div className="row">
            <p className="small">{p.name} · Concept imagery</p>
            <button
              className="icon-button"
              onClick={() => zoom.current?.close()}
              aria-label="Close enlarged gallery"
            >
              <X />
            </button>
          </div>
          <div className="zoom-image">
            <Image src={photos[index].url} alt={photos[index].alt} fill sizes="90vw" />
          </div>
          <div className="zoom-controls">
            <button className="icon-button" onClick={() => next(-1)} aria-label="Previous image">
              <ArrowLeft />
            </button>
            <span className="small">
              {index + 1} / {photos.length}
            </span>
            <button className="icon-button" onClick={() => next(1)} aria-label="Next image">
              <ArrowRight />
            </button>
          </div>
        </dialog>
      </div>
      <div className="product-details">
        <p className="eyebrow">{p.collection.name.toUpperCase()} / CONCEPT PIECE</p>
        <h1>{p.name}</h1>
        <p className="product-price">{money(p.price)}</p>
        <p className="product-description">{p.description}</p>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label">Colour / {v?.color}</legend>
          <div className="variant-options">
            {p.variants.map((option) => (
              <button
                key={option.id}
                aria-pressed={variantId === option.id}
                onClick={() => {
                  setVariantId(option.id);
                  setError('');
                }}
              >
                <span className="color-dot" style={{ backgroundColor: option.colorHex }} />
                {option.color}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          Size
          <select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            {p.variants
              .filter((o) => o.color === v?.color)
              .map((o) => (
                <option value={o.id} key={o.id}>
                  {o.size}
                </option>
              ))}
          </select>
        </label>
        <p className="stock-status" aria-live="polite">
          {stockLabel(quantity, v?.madeToOrder || false)}
          {v?.madeToOrder ? ' · Estimated dispatch in 4–6 weeks' : ''}
        </p>
        <button className="button full" disabled={busy || quantity === 0} onClick={addToBag}>
          {busy
            ? 'Adding to your bag…'
            : quantity === 0
              ? 'Currently unavailable'
              : v?.madeToOrder
                ? 'Order this piece'
                : 'Add to bag'}
          <ArrowRight size={16} />
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="product-service">
          Complimentary standard delivery from $250.
          <br />
          30 days to decide.{' '}
          <Link className="underlink" href="/shipping">
            Delivery details
          </Link>{' '}
          ·{' '}
          <Link className="underlink" href="/returns">
            Returns
          </Link>
        </p>
        {[
          ['Details & materials', p.material + ' · ' + p.dimensions],
          ['A considered process', p.craftsmanship + ' Origin: ' + p.origin],
          ['Care for your piece', p.care],
        ].map(([title, copy]) => (
          <details key={title}>
            <summary>{title}</summary>
            <p>{copy}</p>
          </details>
        ))}
        <p className="sample-note align-left">
          Fictional product. Materials, origin, stock, and craftsmanship are sample data. No actual
          merchandise or shipments.
        </p>
      </div>
    </div>
  );
}
