'use client';
import { useState } from 'react';
import { AdminForm } from '@/components/admin-form';
import { Panel } from './ui';
import { phpAmount, PHP_PER_USD } from '@/lib/pricing';
const transitions: Record<string, string[]> = {
  PAID: ['PAID', 'PROCESSING', 'SHIPPED'],
  PROCESSING: ['PROCESSING', 'SHIPPED'],
  SHIPPED: ['SHIPPED', 'DELIVERED'],
  DELIVERED: ['DELIVERED'],
};
export function FulfillmentForm({
  id,
  status,
  notes,
  carrier,
  trackingNumber,
}: {
  id: string;
  status: string;
  notes: string;
  carrier: string;
  trackingNumber: string;
}) {
  const [nextStatus, setNextStatus] = useState(status);
  const shipping = ['SHIPPED', 'DELIVERED'].includes(nextStatus);
  return (
    <AdminForm endpoint="order" initial={{ id }} submitLabel="Update order">
      <label className="field">
        Fulfillment status
        <select name="status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
          {(transitions[status] || [status]).map((s) => (
            <option key={s} value={s}>
              {s === 'PAID' ? 'Confirmed / unfulfilled' : s === 'PROCESSING' ? 'Packed' : s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <div className="fields-row">
        <label className="field">
          Carrier
          <input
            name="carrier"
            defaultValue={carrier}
            maxLength={100}
            required={shipping}
            placeholder="e.g. DHL"
          />
        </label>
        <label className="field">
          Tracking number
          <input
            name="trackingNumber"
            defaultValue={trackingNumber}
            maxLength={100}
            required={shipping}
          />
        </label>
      </div>
      <label className="field">
        Internal notes
        <textarea
          name="notes"
          defaultValue={notes}
          maxLength={2000}
          placeholder="Packing instructions or internal order notes"
        />
        <small>Visible to administrators only.</small>
      </label>
    </AdminForm>
  );
}
type Promotion = {
  id: string;
  code: string;
  kind: string;
  value: number;
  minimum: number;
  expiresAt: string;
  usageLimit: number;
  uses: number;
  active: boolean;
};
export function PromotionEditor({ promotion: p }: { promotion: Promotion | null }) {
  const [kind, setKind] = useState(p?.kind || 'PERCENT');
  const [value, setValue] = useState(
    String(p ? (p.kind === 'FIXED' ? phpAmount(p.value) : p.value) : 10),
  );
  return (
    <Panel title="Promotion details">
      <div className="a-panel-body">
        <AdminForm
          endpoint="promotion"
          initial={p ? { id: p.id } : {}}
          numbers={kind === 'PERCENT' ? ['value', 'usageLimit'] : ['usageLimit']}
          currencies={kind === 'FIXED' ? ['minimum', 'value'] : ['minimum']}
          booleans={['active']}
          redirectTo="/admin/promotions"
          cancelTo="/admin/promotions"
          submitLabel={p ? 'Save promotion' : 'Create promotion'}
        >
          <label className="field">
            Discount code
            <input
              name="code"
              defaultValue={p?.code || ''}
              required
              pattern="[A-Z0-9-]+"
              maxLength={30}
              placeholder="WELCOME10"
            />
            <small>Uppercase letters, numbers, and hyphens.</small>
          </label>
          <div className="fields-row">
            <label className="field">
              Discount type
              <select
                name="kind"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setValue('10');
                }}
              >
                <option value="PERCENT">Percentage</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </label>
            <label className="field">
              {kind === 'PERCENT' ? 'Percentage off' : 'Amount off (PHP)'}
              <input
                type="number"
                name="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                min={kind === 'PERCENT' ? 1 : Number(phpAmount(1))}
                max={kind === 'PERCENT' ? 100 : 1000 * PHP_PER_USD}
                step={kind === 'PERCENT' ? 1 : 0.01}
              />
            </label>
          </div>
          <div className="fields-row">
            <label className="field">
              Minimum spend (PHP)
              <input
                type="number"
                name="minimum"
                defaultValue={p ? phpAmount(p.minimum) : '0.00'}
                min={0}
                step="0.01"
                required
              />
            </label>
            <label className="field">
              Usage limit
              <input
                type="number"
                name="usageLimit"
                defaultValue={p?.usageLimit || 100}
                min={1}
                max={100000}
                required
              />
            </label>
          </div>
          <label className="field">
            Expires at (UTC)
            <input
              type="datetime-local"
              name="expiresAt"
              defaultValue={p ? p.expiresAt.slice(0, 16) : '2030-12-31T23:59'}
              required
            />
            <small>
              Enter coordinated universal time (UTC), independent of your device timezone.
            </small>
          </label>
          <label className="a-checkbox">
            <input type="checkbox" name="active" defaultChecked={p?.active ?? true} />
            Enable this promotion
          </label>
          {p && (
            <p className="a-check-note">
              {p.uses} redemptions, including current checkout reservations.
            </p>
          )}
        </AdminForm>
      </div>
    </Panel>
  );
}
