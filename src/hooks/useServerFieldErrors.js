import { useCallback, useMemo, useState } from 'react';
import { getServerFieldErrors } from '../lib/serverFieldErrors';

const NO_FIELDS = new Set();

/**
 * Backend validation for each input of a form, from the form's last failed save.
 *
 * Pass the save's error (or null). Show `errorFor(name)` under each input and call
 * `dismiss(name)` when the farmer changes that input, so a fixed field stops showing the old
 * error. An error that was already there when the form opened (a previous attempt in the same
 * page) is ignored. When the server named no fields, `hasFieldErrors` is false and the form shows
 * its general message instead. Pass `options` as a module-level constant so it stays memoised.
 *
 * @param {unknown} error
 * @param {Parameters<typeof getServerFieldErrors>[1]} [options]
 * @returns {{
 *   fieldErrors: Record<string, string>,
 *   hasFieldErrors: boolean,
 *   errorFor: (name: string) => string|undefined,
 *   dismiss: (name: string) => void,
 * }}
 *
 * @example
 * const { errorFor, dismiss } = useServerFieldErrors(mutation.error, SERVER_FIELDS);
 * <input id="amount" onChange={(e) => { dismiss('amount'); setAmount(e.target.value); }}
 *   {...fieldErrorProps('amount', errorFor('amount'))} />
 * <FieldError id="amount" message={errorFor('amount')} />
 */
export function useServerFieldErrors(error, options) {
  const [errorWhenOpened] = useState(error);
  const liveError = error && error !== errorWhenOpened ? error : null;
  const [dismissed, setDismissed] = useState({ error: null, fields: NO_FIELDS });

  const allFieldErrors = useMemo(
    () => (liveError ? getServerFieldErrors(liveError, options) : {}),
    [liveError, options],
  );
  const dismissedFields = dismissed.error === liveError ? dismissed.fields : NO_FIELDS;

  const fieldErrors = useMemo(() => Object.fromEntries(
    Object.entries(allFieldErrors).filter(([name]) => !dismissedFields.has(name)),
  ), [allFieldErrors, dismissedFields]);

  const dismiss = useCallback((name) => {
    setDismissed((previous) => {
      const fields = previous.error === liveError ? previous.fields : NO_FIELDS;
      if (fields.has(name)) return previous;
      return { error: liveError, fields: new Set([...fields, name]) };
    });
  }, [liveError]);

  return {
    fieldErrors,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
    errorFor: (name) => fieldErrors[name],
    dismiss,
  };
}
