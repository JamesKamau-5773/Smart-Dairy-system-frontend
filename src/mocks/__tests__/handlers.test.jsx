import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('production yield MSW handler', () => {
  it('replays the same cow/date/session payload as an idempotent success', async () => {
    const payload = {
      cowId: 'C-777',
      volume: 12.4,
      session: 'morning',
      date: '2026-06-09',
    };

    const firstResponse = await fetch('http://localhost:5173/api/production/yield', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'fastlog:C-777:2026-06-09:morning',
      },
      body: JSON.stringify(payload),
    });

    expect(firstResponse.status).toBe(200);
    const firstBody = await firstResponse.json();
    expect(firstBody.success).toBe(true);
    expect(firstBody.received.cowId).toBe('C-777');
    expect(firstBody.received.date).toBe('2026-06-09');

    const secondResponse = await fetch('http://localhost:5173/api/production/yield', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    expect(secondResponse.status).toBe(200);
    const secondBody = await secondResponse.json();
    expect(secondBody.success).toBe(true);
    expect(secondBody.replayed).toBe(true);
    expect(secondBody.received.cowId).toBe('C-777');
    expect(secondBody.received.date).toBe('2026-06-09');
  });

  it('supports updating and deleting a milk record', async () => {
    const createResponse = await fetch('http://localhost:5173/api/production/yield', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cowId: 'C-778', volume: 10.1, session: 'morning', date: '2026-06-09' }),
    });

    const createBody = await createResponse.json();
    const recordId = createBody.received.id;

    const updateResponse = await fetch(`http://localhost:5173/api/production/yield/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cowId: 'C-778', volume: 12.6, session: 'morning', milkingDate: '2026-06-09' }),
    });

    expect(updateResponse.status).toBe(200);
    const updateBody = await updateResponse.json();
    expect(updateBody.received.volume).toBe(12.6);

    const deleteResponse = await fetch(`http://localhost:5173/api/production/yield/${recordId}`, {
      method: 'DELETE',
    });

    expect(deleteResponse.status).toBe(200);
    const deleteBody = await deleteResponse.json();
    expect(deleteBody.deleted.id).toBe(recordId);
  });
});