import { describe, expect, it } from 'vitest';
import { readBlobErrorBody } from '../apiClient';
import { isDemoRefusal } from '../apiErrors';

const blobError = (body, type) => ({ response: { status: 403, data: new Blob([body], { type }) } });

describe('readBlobErrorBody', () => {
  it('reads a JSON error back from a file request, so a demo refusal is recognised', async () => {
    const error = blobError(JSON.stringify({ code: 'DEMO_FEATURE_UNAVAILABLE', error: 'Not in the demo.' }), 'application/json');
    expect(isDemoRefusal(error)).toBe(false);
    await readBlobErrorBody(error);
    expect(error.response.data).toEqual({ code: 'DEMO_FEATURE_UNAVAILABLE', error: 'Not in the demo.' });
    expect(isDemoRefusal(error)).toBe(true);
  });

  it('leaves other bodies as they came', async () => {
    const pdf = blobError('%PDF-1.7', 'application/pdf');
    const original = pdf.response.data;
    await readBlobErrorBody(pdf);
    expect(pdf.response.data).toBe(original);

    const broken = blobError('{not json', 'application/json');
    const brokenBody = broken.response.data;
    await readBlobErrorBody(broken);
    expect(broken.response.data).toBe(brokenBody);

    const plain = { response: { status: 500, data: { error: 'x' } } };
    await readBlobErrorBody(plain);
    expect(plain.response.data).toEqual({ error: 'x' });
  });
});
