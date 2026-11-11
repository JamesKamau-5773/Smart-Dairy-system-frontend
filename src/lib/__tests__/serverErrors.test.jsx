// UX audit phase 6: backend errors are worded by their code, and per-field validation shows
// under the right input, in the farmer's language.
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getServerFieldErrors } from '../serverFieldErrors';
import { getApiErrorMessage } from '../backendApi';
import { offlineFailureMessage, queuedOfflineMessage } from '../offlinePolicy';
import { getFieldErrorsFromError } from '../authErrorMessages';
import { setLocale } from '../../i18n/locale';
import { useServerFieldErrors } from '../../hooks/useServerFieldErrors';

const failed = (status, data) => ({ response: { status, data } });

afterEach(() => act(() => setLocale('en')));

describe('getServerFieldErrors', () => {
  it('turns reason codes into words and renames fields to the form’s', () => {
    const error = failed(422, { code: 'VALIDATION_ERROR', fields: { amount: 'must_be_positive', cow_id: 'required' } });
    expect(getServerFieldErrors(error, { fieldMap: { amount: 'volume', cow_id: 'cowId' } })).toEqual({
      volume: 'Enter a number above 0.',
      cowId: 'This is required.',
    });
    setLocale('sw');
    expect(getServerFieldErrors(error).amount).toBe('Weka namba iliyo juu ya 0.');
  });

  it('reads the list shape inventory sends', () => {
    const error = failed(400, { field_errors: [{ field: 'name', message: 'This field is required.' }] });
    expect(getServerFieldErrors(error)).toEqual({ name: 'This field is required.' });
  });

  it('shows the server’s English text only in English, and never technical text', () => {
    const error = failed(400, { fields: { amount: 'Must be under 1000 litres.', note: 'IntegrityError: NOT NULL constraint' } });
    expect(getServerFieldErrors(error)).toEqual({ amount: 'Must be under 1000 litres.', note: 'Check this field.' });
    setLocale('sw');
    expect(getServerFieldErrors(error).amount).toBe('Angalia sehemu hii.');
  });

  it('is empty when the server named no fields', () => {
    expect(getServerFieldErrors(failed(422, { code: 'VALIDATION_ERROR', error: 'amount must be greater than 0.' }))).toEqual({});
    expect(getServerFieldErrors(new Error('offline'))).toEqual({});
  });

  it('still puts auth codes on their field (shared with the sign-in forms)', () => {
    expect(getFieldErrorsFromError(failed(409, { code: 'PHONE_IN_USE' }))).toEqual({
      phone_number: 'Another account already uses this phone number. Log in instead, or use a different number.',
    });
    expect(getFieldErrorsFromError(failed(422, { code: 'VALIDATION_ERROR', fields: { farm_name: 'required' } }))).toEqual({
      farm_name: 'This is required.',
    });
  });
});

describe('useServerFieldErrors', () => {
  const error = failed(422, { fields: { amount: 'required', date: 'in_future' } });

  it('shows a new failure per field, and drops a field once the farmer changes it', () => {
    const { result, rerender } = renderHook(({ err }) => useServerFieldErrors(err), { initialProps: { err: null } });
    expect(result.current.hasFieldErrors).toBe(false);

    rerender({ err: error });
    expect(result.current.errorFor('amount')).toBe('This is required.');
    act(() => result.current.dismiss('amount'));
    expect(result.current.errorFor('amount')).toBeUndefined();
    expect(result.current.errorFor('date')).toBe('This date can’t be in the future.');

    // A new failed save shows every field again.
    rerender({ err: failed(422, { fields: { amount: 'required' } }) });
    expect(result.current.errorFor('amount')).toBe('This is required.');
  });

  it('ignores a failure from before the form opened', () => {
    const { result } = renderHook(() => useServerFieldErrors(error));
    expect(result.current.fieldErrors).toEqual({});
  });
});

describe('getApiErrorMessage by code', () => {
  it('words a known code the same in every page, in the farmer’s language', () => {
    const duplicate = failed(409, { code: 'DUPLICATE_MILK_ENTRY', error: 'Milk entry already exists for this cow, date and session.' });
    expect(getApiErrorMessage(duplicate)).toBe('This cow already has a milk record for that date and session. Edit that record instead.');
    setLocale('sw');
    expect(getApiErrorMessage(duplicate)).toMatch(/^Ng’ombe huyu tayari ana rekodi/);
  });

  it('uses the server’s English detail for a validation error only in English', () => {
    const invalid = failed(400, { code: 'VALIDATION_ERROR', error: 'amount must be greater than 0.' });
    expect(getApiErrorMessage(invalid)).toBe('amount must be greater than 0.');
    setLocale('sw');
    expect(getApiErrorMessage(invalid)).toBe('Baadhi ya taarifa hazipo au zinahitaji kurekebishwa. Angalia sehemu za fomu ujaribu tena.');
  });

  it('words offline outcomes in the farmer’s language', () => {
    setLocale('sw');
    expect(queuedOfflineMessage()).toBe('Imehifadhiwa kwenye simu hii. Itatumwa ukirudi mtandaoni.');
    expect(offlineFailureMessage(new Error('x'), 'Haikufutwa.')).toBe('Hakuna mtandao. Haikufutwa. Jaribu tena ukirudi mtandaoni.');
  });
});
