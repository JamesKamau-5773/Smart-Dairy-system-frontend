/**
 * Validation utilities for forms and inputs
 * Provides validation rules, error formatting, and form submission helpers
 */

export const ValidationRules = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Please enter a valid email address';
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    return value.length < min ? `Minimum ${min} characters required` : null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    return value.length > max ? `Maximum ${max} characters allowed` : null;
  },

  numeric: (value) => {
    if (!value) return null;
    const numRegex = /^-?\d+(\.\d+)?$/;
    return numRegex.test(value) ? null : 'Please enter a valid number';
  },

  positiveNumber: (value) => {
    if (!value) return null;
    const numValue = parseFloat(value);
    return numValue > 0 ? null : 'Must be a positive number';
  },

  date: (value) => {
    if (!value) return null;
    const dateObj = new Date(value);
    return !Number.isNaN(dateObj.getTime()) ? null : 'Please enter a valid date';
  },

  futureDate: (value) => {
    if (!value) return null;
    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) return 'Please enter a valid date';
    return dateObj > new Date() ? null : 'Date must be in the future';
  },

  pastDate: (value) => {
    if (!value) return null;
    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) return 'Please enter a valid date';
    return dateObj <= new Date() ? null : 'Date must be in the past or today';
  },

  phoneNumber: (value) => {
    if (!value) return null;
    // Supports formats: +254, 0, with spaces/dashes
    const phoneRegex = /^[\d\s+\-()]{8,}$/;
    return phoneRegex.test(value) ? null : 'Please enter a valid phone number';
  },
};

/**
 * Validate a single field
 * @param {any} value - The value to validate
 * @param {Function|Function[]} rules - Validation rule(s) to apply
 * @returns {string|null} Error message or null if valid
 */
export function validateField(value, rules) {
  const ruleArray = Array.isArray(rules) ? rules : [rules];

  for (const rule of ruleArray) {
    const error = typeof rule === 'function' ? rule(value) : null;
    if (error) return error;
  }

  return null;
}

/**
 * Validate multiple form fields
 * @param {Object} formData - The form data to validate
 * @param {Object} schema - Validation schema { fieldName: rule(s) }
 * @returns {Object} Errors object { fieldName: errorMessage }
 */
export function validateForm(formData, schema) {
  const errors = {};

  Object.entries(schema).forEach(([fieldName, rules]) => {
    const error = validateField(formData[fieldName], rules);
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
}

/**
 * Check if form has any errors
 * @param {Object} errors - Errors object from validateForm
 * @returns {boolean} True if there are errors
 */
export function hasFormErrors(errors) {
  return Object.keys(errors).length > 0;
}

/**
 * Format validation errors for display
 * @param {Object} errors - Errors object
 * @returns {Array} Array of { field, message } objects
 */
export function formatValidationErrors(errors) {
  return Object.entries(errors).map(([field, message]) => ({
    field,
    message,
  }));
}

/**
 * Get first error message for display in alert
 * @param {Object} errors - Errors object
 * @returns {string} First error message
 */
export function getFirstErrorMessage(errors) {
  const messages = Object.values(errors).filter(Boolean);
  return messages[0] || 'Please check the form for errors';
}

/**
 * Debounced validation (for real-time field validation)
 * @param {Function} validateFn - Validation function
 * @param {number} delay - Debounce delay in ms
 * @returns {Function} Debounced validation function
 */
export function createDebouncedValidator(validateFn, delay = 300) {
  let timeoutId = null;

  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(validateFn(...args));
      }, delay);
    });
  };
}

/**
 * Sanitize input to prevent XSS
 * @param {string} value - The value to sanitize
 * @returns {string} Sanitized value
 */
export function sanitizeInput(value) {
  if (typeof value !== 'string') return value;

  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

/**
 * Parse form data into structured object
 * @param {FormData} formData - Native FormData object
 * @returns {Object} Parsed form data
 */
export function parseFormData(formData) {
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });
  return data;
}
