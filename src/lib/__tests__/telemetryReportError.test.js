import { describe, expect, it, vi } from 'vitest';
import { getTelemetryLog, reportError } from '../telemetry';

describe('reportError', () => {
  it('records where it happened, the status and the backend code, without the request body', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('Request failed'), {
      response: { status: 409, data: { code: 'DUPLICATE_MILK_ENTRY', error: 'Neema’s milk…' } },
      config: { data: '{"phone_number":"254712345678","amount":12}' },
    });

    const entry = reportError(error, { where: 'FastMilkLog.save' });

    expect(entry).toMatchObject({
      type: 'error',
      message: 'Request failed',
      context: { where: 'FastMilkLog.save', status: 409, code: 'DUPLICATE_MILK_ENTRY' },
    });
    expect(JSON.stringify(entry)).not.toContain('254712345678');
    expect(getTelemetryLog().at(-1)).toEqual(entry);
    console.error.mockRestore();
  });

  it('handles errors without a response and non-Error values', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(reportError('boom').context).toEqual({ where: 'unknown', status: null, code: null });
    expect(reportError(new TypeError('x'), { where: 'A' }).message).toBe('x');
    console.error.mockRestore();
  });
});
