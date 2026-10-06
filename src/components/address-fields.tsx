export function AddressFields() {
  return (
    <>
      <label className="field">
        Full name
        <input name="name" autoComplete="shipping name" required minLength={2} maxLength={100} />
      </label>
      <label className="field">
        Street address
        <input
          name="line1"
          autoComplete="shipping address-line1"
          required
          minLength={3}
          maxLength={200}
        />
      </label>
      <div className="fields-row">
        <label className="field">
          City
          <input
            name="city"
            autoComplete="shipping address-level2"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label className="field">
          State / region
          <input name="region" autoComplete="shipping address-level1" required maxLength={100} />
        </label>
      </div>
      <div className="fields-row">
        <label className="field">
          Postal code
          <input
            name="postalCode"
            autoComplete="shipping postal-code"
            required
            minLength={3}
            maxLength={20}
          />
        </label>
        <label className="field">
          Country
          <select name="country" autoComplete="shipping country">
            <option value="US">United States</option>
            <option value="FR">France</option>
            <option value="DE">Germany</option>
            <option value="NL">Netherlands</option>
            <option value="IE">Ireland</option>
          </select>
        </label>
      </div>
    </>
  );
}
