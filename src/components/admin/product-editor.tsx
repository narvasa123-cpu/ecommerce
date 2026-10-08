'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { AdminForm } from '@/components/admin-form';
import { Panel } from './ui';
import { phpAmount, PHP_PER_USD } from '@/lib/pricing';
type Variant = {
  id?: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  madeToOrder: boolean;
};
type Photo = { url: string; alt: string };
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  material: string;
  craftsmanship: string;
  dimensions: string;
  origin: string;
  care: string;
  category: string;
  price: number;
  salePercent?: number;
  collectionId: string;
  active: boolean;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  images: Photo[];
  variants: Variant[];
};
export function ProductEditor({
  product,
  collections,
  assets,
}: {
  product: Product | null;
  collections: { id: string; name: string }[];
  assets: string[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(
    product?.images || [{ url: assets[0] || '/images/tote.webp', alt: '' }],
  );
  const [variants, setVariants] = useState<Variant[]>(
    product?.variants || [
      { sku: '', color: 'Cognac', colorHex: '#965c37', size: 'One size', madeToOrder: false },
    ],
  );
  const [slug, setSlug] = useState(product?.slug || '');
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle || product?.name || '');
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription || '');
  function photo(index: number, patch: Partial<Photo>) {
    setPhotos(photos.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }
  function variant(index: number, patch: Partial<Variant>) {
    setVariants(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }
  function move(index: number, direction: number) {
    const next = [...photos];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setPhotos(next);
  }
  return (
    <AdminForm
      endpoint="product"
      currencies={['price']}
      numbers={['salePercent']}
      booleans={['active', 'featured']}
      json={['images', 'variants']}
      initial={product ? { id: product.id } : {}}
      redirectTo="/admin/products"
      cancelTo="/admin/products"
      submitLabel={product ? 'Save product' : 'Create product'}
    >
      <input type="hidden" name="images" value={JSON.stringify(photos)} />
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <div className="a-editor-grid">
        <div className="a-editor-main">
          <Panel title="Product details">
            <div className="a-panel-body">
              <label className="field">
                Product name
                <input
                  name="name"
                  defaultValue={product?.name || ''}
                  placeholder="The Forma Tote"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
              <label className="field">
                Description
                <textarea
                  name="description"
                  defaultValue={product?.description || ''}
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={5}
                />
                <small>Describe the product’s purpose, feel, and everyday use.</small>
              </label>
              <div className="fields-row">
                <label className="field">
                  Price (PHP)
                  <input
                    name="price"
                    type="number"
                    min={Number(phpAmount(100))}
                    max={100000 * PHP_PER_USD}
                    step="0.01"
                    defaultValue={product ? phpAmount(product.price) : ''}
                    required
                    placeholder="24745.57"
                  />
                  <small>
                    PHP at the fixed reference rate. Saved to the nearest base-currency cent.
                  </small>
                </label>
                <label className="field">
                  Automatic discount (%)
                  <input name="salePercent" type="number" min={0} max={90} step={1} defaultValue={product?.salePercent || 0} required />
                  <small>Zero means no sale. Sale prices apply automatically before any eligible coupon.</small>
                </label>
                <label className="field">
                  Category
                  <input
                    name="category"
                    defaultValue={product?.category || 'Totes'}
                    required
                    minLength={2}
                    maxLength={100}
                    list="product-categories"
                  />
                  <datalist id="product-categories">
                    {['Totes', 'Shoulder bags', 'Crossbody bags', 'Small leather goods'].map(
                      (c) => (
                        <option key={c} value={c} />
                      ),
                    )}
                  </datalist>
                </label>
              </div>
            </div>
          </Panel>
          <Panel
            title="Product images"
            aside={<span className="a-muted">{photos.length} / 8 images</span>}
          >
            <div className="a-panel-body">
              <p className="a-muted">
                Choose an image from your local media library. The first image is the cover.
              </p>
              {photos.map((p, i) => (
                <div className="a-image-editor" key={i}>
                  <Image src={p.url} alt="" width={76} height={95} />
                  <div className="a-image-fields">
                    <label className="field">
                      {i === 0 ? 'Cover image' : 'Image ' + (i + 1)}
                      <select value={p.url} onChange={(e) => photo(i, { url: e.target.value })}>
                        {Array.from(new Set([...assets, p.url])).map((a) => (
                          <option key={a} value={a}>
                            {a.split('/').pop()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Image description (alt text)
                      <input
                        value={p.alt}
                        onChange={(e) => photo(i, { alt: e.target.value })}
                        minLength={5}
                        maxLength={200}
                        required
                        placeholder="Cognac tote, front view"
                      />
                    </label>
                    <div className="a-image-controls">
                      <button
                        className="a-btn small"
                        type="button"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={'Move image ' + (i + 1) + ' up'}
                      >
                        <ArrowUp size={14} aria-hidden="true" />
                      </button>
                      <button
                        className="a-btn small"
                        type="button"
                        disabled={i === photos.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={'Move image ' + (i + 1) + ' down'}
                      >
                        <ArrowDown size={14} aria-hidden="true" />
                      </button>
                      <button
                        className="a-btn small"
                        type="button"
                        disabled={photos.length === 1}
                        onClick={() => setPhotos(photos.filter((_, n) => n !== i))}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        Remove image {i + 1}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                className="a-btn"
                type="button"
                disabled={photos.length >= 8}
                onClick={() =>
                  setPhotos([...photos, { url: assets[0] || '/images/tote.webp', alt: '' }])
                }
              >
                <Plus size={15} aria-hidden="true" />
                Add image
              </button>
              <p className="a-muted">
                To expand the library, place image files in public/images. Sample photography is
                AI-generated.
              </p>
            </div>
          </Panel>
          <Panel
            title="Variants"
            aside={<span className="a-muted">{variants.length} / 30 variants</span>}
          >
            <div className="a-panel-body">
              {variants.map((v, i) => (
                <fieldset className="a-variant-editor" key={v.id || 'new-' + i}>
                  <legend className="a-variant-title">
                    Variant {i + 1}
                    {v.id ? ' · Existing' : ' · New'}
                  </legend>
                  <div className="fields-row">
                    <label className="field">
                      SKU
                      <input
                        value={v.sku}
                        onChange={(e) => variant(i, { sku: e.target.value })}
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </label>
                    <label className="field">
                      Size
                      <input
                        value={v.size}
                        onChange={(e) => variant(i, { size: e.target.value })}
                        required
                        maxLength={80}
                      />
                    </label>
                    <label className="field">
                      Colour name
                      <input
                        value={v.color}
                        onChange={(e) => variant(i, { color: e.target.value })}
                        required
                        minLength={2}
                        maxLength={80}
                      />
                    </label>
                    <label className="field">
                      Colour swatch
                      <input
                        type="color"
                        value={v.colorHex}
                        onChange={(e) => variant(i, { colorHex: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="a-checkbox">
                    <input
                      type="checkbox"
                      checked={v.madeToOrder}
                      onChange={(e) => variant(i, { madeToOrder: e.target.checked })}
                    />
                    Made to order
                  </label>
                  {!v.id && variants.length > 1 && (
                    <button
                      className="a-btn small"
                      type="button"
                      onClick={() => setVariants(variants.filter((_, n) => n !== i))}
                    >
                      Remove new variant
                    </button>
                  )}
                </fieldset>
              ))}
              <button
                className="a-btn"
                type="button"
                disabled={variants.length >= 30}
                onClick={() =>
                  setVariants([
                    ...variants,
                    {
                      sku: '',
                      color: '',
                      colorHex: '#965c37',
                      size: 'One size',
                      madeToOrder: false,
                    },
                  ])
                }
              >
                <Plus size={15} aria-hidden="true" />
                Add variant
              </button>
              <p className="a-check-note">
                New variants start at zero stock. Adjust quantities in{' '}
                <Link className="a-text-link" href="/admin/inventory">
                  Inventory
                </Link>{' '}
                after saving. Existing variants are retained to preserve order history.
              </p>
            </div>
          </Panel>
          <Panel title="Materials & care">
            <div className="a-panel-body">
              <div className="fields-row">
                {[
                  ['material', 'Material'],
                  ['dimensions', 'Dimensions'],
                  ['origin', 'Origin'],
                ].map(([key, label]) => (
                  <label className="field" key={key}>
                    {label}
                    <input
                      name={key}
                      defaultValue={product?.[key as 'material' | 'dimensions' | 'origin'] || ''}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </label>
                ))}
              </div>
              {[
                ['craftsmanship', 'Craftsmanship'],
                ['care', 'Care instructions'],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <textarea
                    name={key}
                    defaultValue={product?.[key as 'craftsmanship' | 'care'] || ''}
                    required
                    minLength={5}
                    maxLength={2000}
                  />
                </label>
              ))}
            </div>
          </Panel>
        </div>
        <aside className="a-editor-side">
          <Panel title="Publishing">
            <div className="a-panel-body">
              <label className="a-checkbox">
                <input type="checkbox" name="active" defaultChecked={product?.active ?? false} />
                <span>
                  Published on storefront
                  <small className="a-muted" style={{ display: 'block' }}>
                    Uncheck to archive this product.
                  </small>
                </span>
              </label>
              <label className="a-checkbox">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={product?.featured || false}
                />
                Feature on home page
              </label>
              <p className="a-muted">
                The signature edit displays the first four featured products.
              </p>
              {product && (
                <Link className="a-text-link" href={'/products/' + product.slug}>
                  Preview product
                </Link>
              )}
            </div>
          </Panel>
          <Panel title="Organization">
            <div className="a-panel-body">
              <label className="field">
                Collection
                <select name="collectionId" defaultValue={product?.collectionId} required>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Panel>
          <Panel title="Search listing">
            <div className="a-panel-body">
              <label className="field">
                URL slug
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  pattern="[a-z0-9-]+"
                  required
                  maxLength={100}
                />
                <small>/products/{slug || 'your-product'}</small>
              </label>
              <label className="field">
                Page title
                <input
                  name="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  maxLength={150}
                />
                <small>{seoTitle.length} / 150 characters</small>
              </label>
              <label className="field">
                Meta description
                <textarea
                  name="seoDescription"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  maxLength={300}
                />
                <small>{seoDescription.length} / 300 characters</small>
              </label>
            </div>
          </Panel>
        </aside>
      </div>
    </AdminForm>
  );
}
