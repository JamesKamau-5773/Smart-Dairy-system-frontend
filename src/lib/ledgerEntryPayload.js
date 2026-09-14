export const buildLedgerEntryPayload = (formData, transactionType) => {
  const payload = {
    date: formData.date,
    amount: parseFloat(formData.amount),
    payment_method: formData.paymentMethod,
    reference_code: formData.reference_code,
    description: formData.description,
    type: transactionType,
    category: formData.category,
  };

  if (transactionType === 'income') {
    if (formData.incomePayerType === 'customer') {
      payload.customer_id = Number(formData.customer_id);
    } else {
      payload.income_source = formData.income_source.trim();
    }
  } else {
    payload.paid_to = formData.party.trim();
    if (formData.item_name && String(formData.item_name).trim()) {
      payload.item_name = String(formData.item_name).trim();
    }
    if (formData.quantity) {
      payload.quantity = parseFloat(formData.quantity);
    }
    if (formData.cost_class) {
      payload.cost_class = formData.cost_class;
    }
    if (formData.animal_id && formData.animal_cost_type) {
      payload.animal_id = Number(formData.animal_id);
      payload.animal_cost_type = formData.animal_cost_type;
    }
  }

  return payload;
};
