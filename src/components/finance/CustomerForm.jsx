import { useState, useEffect } from 'react';

export default function CustomerForm({ customer, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    contact_person: '',
    phone_number: '',
    email: '',
    address: '',
    account_balance: '',
    customer_type: 'individual',
    custom_customer_type: '',
    // Backend field names below (source of truth) — not the older
    // agreed_rate/existing_balance names this form used to send.
    agreed_rate_per_liter: '',
    daily_contract_liters: ''
  });

  const isEditMode = !!customer;

  useEffect(() => {
    if (customer) {
      // Check if the incoming customer type is one of our default options
      const presetTypes = ['individual', 'company', 'cooperative'];
      const incomingType = customer.customer_type ? customer.customer_type.toLowerCase() : 'individual';
      const isPreset = presetTypes.includes(incomingType);

      setFormData({
        id: customer.id ?? customer.customer_id ?? null,
        name: customer.name || '',
        contact_person: customer.contact_person || '',
        phone_number: customer.phone_number || '',
        email: customer.email || '',
        address: customer.address || '',
        account_balance: customer.account_balance ?? customer.existing_balance ?? customer.balance ?? '',
        agreed_rate_per_liter: customer.agreed_rate_per_liter ?? customer.agreed_rate ?? '',
        daily_contract_liters: customer.daily_contract_liters ?? '',
        // If it's a preset, use it. Otherwise, set dropdown to 'other' and populate the custom field
        customer_type: isPreset ? incomingType : 'other',
        custom_customer_type: !isPreset ? customer.customer_type : ''
      });
    } else {
      // Reset form for a new customer
      setFormData({
        id: null,
        name: '',
        contact_person: '',
        phone_number: '',
        email: '',
        address: '',
        account_balance: '',
        customer_type: 'individual',
        custom_customer_type: '',
        agreed_rate_per_liter: '',
        daily_contract_liters: ''
      });
    }
  }, [customer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Determine the final customer type string to send to the backend
    const finalCustomerType = formData.customer_type === 'other' 
      ? formData.custom_customer_type 
      : formData.customer_type;

    const payload = {
      ...formData,
      customer_type: finalCustomerType,
      account_balance: formData.account_balance ? parseFloat(formData.account_balance) : 0,
      agreed_rate_per_liter: formData.agreed_rate_per_liter ? parseFloat(formData.agreed_rate_per_liter) : 0,
      // Only for customers billed periodically (weekly/monthly) rather than per delivery;
      // leave unset (null) so the backend can distinguish "no contract" from "0 litres".
      daily_contract_liters: formData.daily_contract_liters !== '' ? parseFloat(formData.daily_contract_liters) : null
    };

    // Remove the temporary UI state field before sending to the backend
    delete payload.custom_customer_type;

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* --- Row 1: Name & Type --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">Full Name / Company</span>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input-machined mt-1"
            required
            disabled={isSaving}
          />
        </label>
        
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">Customer Type</span>
          <select
            name="customer_type"
            value={formData.customer_type}
            onChange={handleChange}
            className="input-machined mt-1"
            disabled={isSaving}
          >
            <option value="individual">Individual</option>
            <option value="cooperative">Cooperative</option>
            <option value="company">Company</option>
            <option value="other">Other (Specify)</option>
          </select>
        </label>
      </div>

      {/* --- Conditional Field: Custom Type --- */}
      {formData.customer_type === 'other' && (
        <label className="block animate-reveal">
          <span className="text-sm font-medium text-ink-muted">Specify Customer Type</span>
          <input
            type="text"
            name="custom_customer_type"
            value={formData.custom_customer_type}
            onChange={handleChange}
            placeholder="e.g., Government, NGO, etc."
            className="input-machined mt-1"
            required={formData.customer_type === 'other'}
            disabled={isSaving}
          />
        </label>
      )}

      {/* --- Row 2: Contact & Phone --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">Contact Person (Optional)</span>
          <input
            type="text"
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            className="input-machined mt-1"
            disabled={isSaving}
          />
        </label>
        
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">Phone Number</span>
          <input
            type="tel"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            className="input-machined mt-1"
            required
            disabled={isSaving}
          />
        </label>
      </div>

      {/* --- Row 3: Financials --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">Agreed Rate (per litre)</span>
          <input
            type="number"
            step="0.01"
            name="agreed_rate_per_liter"
            value={formData.agreed_rate_per_liter}
            onChange={handleChange}
            className="input-machined mt-1"
            placeholder="0.00"
            required
            disabled={isSaving}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink-muted">Existing Balance (Optional)</span>
          <input
            type="number"
            step="0.01"
            name="account_balance"
            value={formData.account_balance}
            onChange={handleChange}
            className="input-machined mt-1"
            placeholder="0.00"
            disabled={isSaving || isEditMode} 
          />
          {isEditMode && (
            <span className="text-xs text-ink-muted mt-1 block">Balance adjustments should be managed through ledgers.</span>
          )}
        </label>
      </div>

      {/* --- Row: Periodic billing contract (weekly/monthly customers) --- */}
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">Daily Contract Litres (Optional)</span>
        <input
          type="number"
          step="0.01"
          name="daily_contract_liters"
          value={formData.daily_contract_liters}
          onChange={handleChange}
          className="input-machined mt-1"
          placeholder="0.00"
          disabled={isSaving}
        />
        <span className="text-xs text-ink-muted mt-1 block">
          For customers invoiced periodically (e.g. weekly or monthly) rather than per delivery. Leave blank if this customer pays per delivery.
        </span>
      </label>

      {/* --- Row 4: Contact Details --- */}
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">Email Address (Optional)</span>
        <input 
          type="email" 
          name="email" 
          value={formData.email} 
          onChange={handleChange} 
          className="input-machined mt-1" 
          disabled={isSaving} 
        />
      </label>
      
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">Address (Optional)</span>
        <textarea 
          name="address" 
          value={formData.address} 
          onChange={handleChange} 
          className="input-machined mt-1" 
          rows="2" 
          disabled={isSaving}
        ></textarea>
      </label>

      <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSaving}>Cancel</button>
        <button type="submit" className="btn-command" disabled={isSaving}>
          {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Customer')}
        </button>
      </div>
    </form>
  );
}