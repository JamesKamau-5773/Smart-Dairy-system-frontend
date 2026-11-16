import { useState, useEffect } from 'react';
import { normalizeKenyanPhone } from '../../lib/phone';
import { useServerFieldErrors } from '../../hooks/useServerFieldErrors';
import FieldError from '../ui/FieldError';
import { fieldErrorProps } from '../ui/fieldErrorProps';
import { financeCopy } from '../../i18n/finance';


/**
 * Add or edit a customer. `serverError` is the failed save, if any: the backend's per-field
 * validation shows under each input (useServerFieldErrors).
 */
export default function CustomerForm({ customer, onSave, onCancel, isSaving, serverError = null }) {
  const copy = financeCopy.customerForm;
  const server = useServerFieldErrors(serverError);
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

  const [phoneError, setPhoneError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    server.dismiss(name === 'custom_customer_type' ? 'customer_type' : name);
    if (name === 'phone_number' && phoneError && normalizeKenyanPhone(value)) setPhoneError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!normalizeKenyanPhone(formData.phone_number)) {
      setPhoneError(copy.phoneError);
      return;
    }
    
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
          <span className="text-sm font-medium text-ink-muted">{copy.name}</span>
          <input
            type="text"
            id="customer-name"
            {...fieldErrorProps('customer-name', server.errorFor('name'))}
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input-machined mt-1"
            required
            disabled={isSaving}
          />
          <FieldError id="customer-name" message={server.errorFor('name')} />
        </label>
        
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">{copy.type}</span>
          <select
            id="customer-customer_type"
            {...fieldErrorProps('customer-customer_type', server.errorFor('customer_type'))}
            name="customer_type"
            value={formData.customer_type}
            onChange={handleChange}
            className="input-machined mt-1"
            disabled={isSaving}
          >
            <option value="individual">{financeCopy.customerTypes.individual}</option>
            <option value="cooperative">{financeCopy.customerTypes.cooperative}</option>
            <option value="company">{financeCopy.customerTypes.company}</option>
            <option value="other">{copy.other}</option>
          </select>
          <FieldError id="customer-customer_type" message={server.errorFor('customer_type')} />
        </label>
      </div>

      {/* --- Conditional Field: Custom Type --- */}
      {formData.customer_type === 'other' && (
        <label className="block animate-reveal">
          <span className="text-sm font-medium text-ink-muted">{copy.specifyType}</span>
          <input
            type="text"
            name="custom_customer_type"
            value={formData.custom_customer_type}
            onChange={handleChange}
            placeholder={copy.specifyPlaceholder}
            className="input-machined mt-1"
            required={formData.customer_type === 'other'}
            disabled={isSaving}
          />
        </label>
      )}

      {/* --- Row 2: Contact & Phone --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">{copy.contactPerson}</span>
          <input
            type="text"
            id="customer-contact_person"
            {...fieldErrorProps('customer-contact_person', server.errorFor('contact_person'))}
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            className="input-machined mt-1"
            disabled={isSaving}
          />
          <FieldError id="customer-contact_person" message={server.errorFor('contact_person')} />
        </label>
        
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">{copy.phone}</span>
          <input
            type="tel"
            name="phone_number"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712 345 678"
            value={formData.phone_number}
            onChange={handleChange}
            onBlur={() => setPhoneError(formData.phone_number && !normalizeKenyanPhone(formData.phone_number) ? copy.phoneError : '')}
            className="input-machined mt-1"
            required
            disabled={isSaving}
            {...fieldErrorProps('customer-phone', phoneError || server.errorFor('phone_number'))}
          />
          <FieldError id="customer-phone" message={phoneError || server.errorFor('phone_number')} />
        </label>
      </div>

      {/* --- Row 3: Financials --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">{copy.rate}</span>
          <input
            type="number"
            step="0.01"
            id="customer-agreed_rate_per_liter"
            {...fieldErrorProps('customer-agreed_rate_per_liter', server.errorFor('agreed_rate_per_liter'))}
            name="agreed_rate_per_liter"
            value={formData.agreed_rate_per_liter}
            onChange={handleChange}
            className="input-machined mt-1"
            placeholder="0.00"
            required
            disabled={isSaving}
          />
          <FieldError id="customer-agreed_rate_per_liter" message={server.errorFor('agreed_rate_per_liter')} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink-muted">{copy.balance}</span>
          <input
            type="number"
            step="0.01"
            id="customer-account_balance"
            {...fieldErrorProps('customer-account_balance', server.errorFor('account_balance'))}
            name="account_balance"
            value={formData.account_balance}
            onChange={handleChange}
            className="input-machined mt-1"
            placeholder="0.00"
            disabled={isSaving || isEditMode} 
          />
          <FieldError id="customer-account_balance" message={server.errorFor('account_balance')} />
          {isEditMode && (
            <span className="text-xs text-ink-muted mt-1 block">{copy.balanceHint}</span>
          )}
        </label>
      </div>

      {/* --- Row: Periodic billing contract (weekly/monthly customers) --- */}
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">{copy.contractLitres}</span>
        <input
          type="number"
          step="0.01"
          id="customer-daily_contract_liters"
          {...fieldErrorProps('customer-daily_contract_liters', server.errorFor('daily_contract_liters'))}
          name="daily_contract_liters"
          value={formData.daily_contract_liters}
          onChange={handleChange}
          className="input-machined mt-1"
          placeholder="0.00"
          disabled={isSaving}
        />
        <FieldError id="customer-daily_contract_liters" message={server.errorFor('daily_contract_liters')} />
        <span className="text-xs text-ink-muted mt-1 block">
          {copy.contractHint}
        </span>
      </label>

      {/* --- Row 4: Contact Details --- */}
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">{copy.email}</span>
        <input 
          type="email" 
          id="customer-email"
          {...fieldErrorProps('customer-email', server.errorFor('email'))}
          name="email" 
          value={formData.email} 
          onChange={handleChange} 
          className="input-machined mt-1" 
          disabled={isSaving} 
        />
        <FieldError id="customer-email" message={server.errorFor('email')} />
      </label>
      
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">{copy.address}</span>
        <textarea 
          id="customer-address"
          {...fieldErrorProps('customer-address', server.errorFor('address'))}
          name="address" 
          value={formData.address} 
          onChange={handleChange} 
          className="input-machined mt-1" 
          rows="2" 
          disabled={isSaving}
        ></textarea>
        <FieldError id="customer-address" message={server.errorFor('address')} />
      </label>

      <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSaving}>{copy.cancel}</button>
        <button type="submit" className="btn-command" disabled={isSaving}>
          {isSaving ? copy.saving : (isEditMode ? copy.saveChanges : copy.create)}
        </button>
      </div>
    </form>
  );
}