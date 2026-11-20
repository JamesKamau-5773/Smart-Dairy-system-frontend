import { errorsCopy } from '../i18n/errors';
import { getLocale } from '../i18n/locale';
import { getApiErrorCode } from './apiErrors';

// Per-field validation from a failed request, in the shapes the backend sends today:
//   { fields: { amount: 'required' } }                         (auth; reason codes)
//   { field_errors: { amount: 'Must be above 0.' } }          (object of messages)
//   { field_errors: [{ field: 'amount', message: '…' }] }      (inventory; list)
//   { errors: { amount: ['…'] } }                              (first message wins)
// A known reason code becomes translated text. Other text is English from the server, so it is
// shown only to English readers (and only when it isn't a technical leak); otherwise "Check
// this field." Field names can be renamed to the form's own with `fieldMap`.

const TECHNICAL_TEXT = /sql|database|constraint|integrity|traceback|exception|stack trace|foreign key|not null|unique key|relation .* does not exist|column .* does not exist|sqlalchemy|sqlite|psycopg/i;
const MAX_SERVER_TEXT = 240;

function rawFieldEntries(data) {
  const raw = data?.fields ?? data?.field_errors ?? data?.errors;
  if (Array.isArray(raw)) {
    return raw
      .filter((entry) => entry && typeof entry.field === 'string')
      .map((entry) => [entry.field, entry.code ?? entry.reason ?? entry.message]);
  }
  if (raw && typeof raw === 'object') return Object.entries(raw);
  return [];
}

/** Turns one field's server detail (reason code or text) into what the farmer reads. */
export function describeFieldDetail(detail) {
  const value = Array.isArray(detail) ? detail[0] : detail;
  if (typeof value !== 'string' || !value.trim()) return errorsCopy.checkField;
  const reason = errorsCopy.fieldReasons[value.trim()];
  if (reason) return reason;
  const text = value.trim();
  if (getLocale() === 'en' && text.length <= MAX_SERVER_TEXT && !TECHNICAL_TEXT.test(text)) return text;
  return errorsCopy.checkField;
}

/**
 * @param {unknown} error A failed request.
 * @param {object} [options]
 * @param {Record<string, string>} [options.fieldMap] Server field name → the form's field name.
 * @param {Record<string, string>} [options.codeFields] Error `code` → the field it is about
 *   (e.g. `{ INVALID_PHONE: 'phone_number' }`), for codes that concern one input.
 * @param {(code: string) => string|undefined} [options.codeMessage] Text for a `codeFields` code.
 * @returns {Record<string, string>} `{ field: message }`; empty when the server named no fields.
 */
export function getServerFieldErrors(error, { fieldMap = {}, codeFields = {}, codeMessage } = {}) {
  const fieldErrors = {};
  rawFieldEntries(error?.response?.data).forEach(([field, detail]) => {
    fieldErrors[fieldMap[field] ?? field] = describeFieldDetail(detail);
  });

  const code = getApiErrorCode(error);
  const codeField = code ? codeFields[code] : undefined;
  if (codeField && !fieldErrors[codeField]) {
    fieldErrors[codeField] = codeMessage?.(code) ?? errorsCopy.codes[code] ?? errorsCopy.checkField;
  }
  return fieldErrors;
}
