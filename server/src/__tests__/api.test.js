import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Hono } from 'hono';
import { createSplitRoutes } from '../routes/splits.js';

function createTestApp() {
  const app = new Hono();

  app.get('/health', async c => {
    try {
      const db = c.env.DB;
      await db.prepare('SELECT 1').first();
      return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: { d1: 'healthy' },
      });
    } catch {
      return c.json({ status: 'unhealthy', error: 'Health check failed' }, 503);
    }
  });

  app.route('/splits', createSplitRoutes());

  app.notFound(c => c.json({ error: 'Not found' }, 404));

  return app;
}

function createMockD1() {
  const data = {
    splits: new Map(),
    participants: new Map(),
    expenses: new Map(),
  };

  const createStatement = sql => ({
    first: () => {
      if (sql.includes('SELECT 1')) {
        return Promise.resolve({ 1: 1 });
      }
      if (sql.includes('COUNT(*)') && sql.includes('splits')) {
        return Promise.resolve({ count: data.splits.size });
      }
      return Promise.resolve(null);
    },
    bind: (...params) => ({
      run: () => {
        if (sql.includes('INSERT INTO splits')) {
          data.splits.set(params[0], {
            id: params[0],
            created_at: params[1],
          });
          return Promise.resolve({ success: true });
        }
        if (sql.includes('INSERT INTO participants')) {
          const key = `${params[1]}-${params[0]}`;
          data.participants.set(key, {
            id: params[0],
            split_id: params[1],
            name: params[2],
            is_done: params[3],
          });
          return Promise.resolve({ success: true });
        }
        if (sql.includes('INSERT INTO expenses')) {
          const key = `${params[1]}-${params[0]}`;
          data.expenses.set(key, {
            id: params[0],
            split_id: params[1],
            participant_id: params[2],
            description: params[3],
            amount: params[4],
          });
          return Promise.resolve({ success: true });
        }
        if (sql.includes('DELETE FROM expenses')) {
          for (const [expKey, exp] of data.expenses.entries()) {
            if (exp.id === params[0]) {
              data.expenses.delete(expKey);
              break;
            }
          }
          return Promise.resolve({ success: true });
        }
        if (sql.includes('UPDATE participants')) {
          for (const p of data.participants.values()) {
            if (p.id === params[1]) {
              p.is_done = params[0];
              break;
            }
          }
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      },
      first: () => {
        if (sql.includes('SELECT 1')) {
          return Promise.resolve({ 1: 1 });
        }
        if (sql.includes('SELECT id, created_at') && sql.includes('splits')) {
          const split = data.splits.get(params[0]);
          return Promise.resolve(
            split ? { id: split.id, createdAt: split.created_at } : null
          );
        }
        if (sql.includes('SELECT id FROM splits')) {
          return Promise.resolve(data.splits.get(params[0]) || null);
        }
        if (sql.includes('SELECT id FROM participants')) {
          for (const p of data.participants.values()) {
            if (p.id === params[0] && p.split_id === params[1]) {
              return Promise.resolve({ id: p.id });
            }
          }
          return Promise.resolve(null);
        }
        if (
          sql.includes('SELECT id, name, is_done') &&
          sql.includes('participants')
        ) {
          for (const p of data.participants.values()) {
            if (p.id === params[0] && p.split_id === params[1]) {
              return Promise.resolve({
                id: p.id,
                name: p.name,
                isDone: p.is_done,
              });
            }
          }
          return Promise.resolve(null);
        }
        if (sql.includes('SELECT id FROM expenses')) {
          for (const e of data.expenses.values()) {
            if (e.id === params[0] && e.split_id === params[1]) {
              return Promise.resolve({ id: e.id });
            }
          }
          return Promise.resolve(null);
        }
        if (sql.includes('COUNT(*)') && sql.includes('participants')) {
          let count = 0;
          for (const p of data.participants.values()) {
            if (p.split_id === params[0]) {
              count++;
            }
          }
          return Promise.resolve({ count });
        }
        if (sql.includes('COUNT(*)') && sql.includes('expenses')) {
          let count = 0;
          for (const e of data.expenses.values()) {
            if (e.split_id === params[0]) {
              count++;
            }
          }
          return Promise.resolve({ count });
        }
        if (sql.includes('COUNT(*)') && sql.includes('splits')) {
          return Promise.resolve({ count: data.splits.size });
        }
        return Promise.resolve(null);
      },
      all: () => {
        if (
          sql.includes('SELECT id, name, is_done') &&
          sql.includes('participants')
        ) {
          const results = [];
          for (const p of data.participants.values()) {
            if (p.split_id === params[0]) {
              results.push({ id: p.id, name: p.name, isDone: p.is_done });
            }
          }
          return Promise.resolve({ results });
        }
        if (
          sql.includes('SELECT id, participant_id') &&
          sql.includes('expenses')
        ) {
          const results = [];
          for (const e of data.expenses.values()) {
            if (e.split_id === params[0]) {
              results.push({
                id: e.id,
                participantId: e.participant_id,
                description: e.description,
                amount: e.amount,
              });
            }
          }
          return Promise.resolve({ results });
        }
        return Promise.resolve({ results: [] });
      },
    }),
  });

  return {
    prepare: sql => createStatement(sql),
    _data: data,
  };
}

function createMockEnv() {
  return {
    DB: createMockD1(),
    MAX_PARTICIPANTS: 50,
    MAX_EXPENSES: 500,
    MAX_TOTAL_SPLITS: 10000,
    SPLIT_EXPIRY_HOURS: 24,
  };
}

describe('Hono API Tests', () => {
  let mockEnv;
  let app;

  beforeEach(() => {
    app = createTestApp();
    mockEnv = createMockEnv();
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    test('should return healthy status', async () => {
      const res = await app.request('/health', {}, mockEnv);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('healthy');
      expect(body).toHaveProperty('timestamp');
      expect(body.services.d1).toBe('healthy');
    });
  });

  describe('POST /splits', () => {
    test('should create a new split', async () => {
      const res = await app.request('/splits', { method: 'POST' }, mockEnv);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body).toHaveProperty('id');
      expect(body.id).toHaveLength(12);
    });
  });

  describe('GET /splits/:id', () => {
    test('should return 400 for invalid split ID', async () => {
      const res = await app.request('/splits/invalid', {}, mockEnv);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('Invalid split ID');
    });

    test('should return 404 for non-existent split', async () => {
      const res = await app.request('/splits/abcd12345678', {}, mockEnv);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Split not found');
    });

    test('should return split details', async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const { id } = await createRes.json();

      const res = await app.request(`/splits/${id}`, {}, mockEnv);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.id).toBe(id);
      expect(body.participants).toEqual([]);
      expect(body.expenses).toEqual([]);
    });
  });

  describe('POST /splits/:id/participants', () => {
    let splitId;

    beforeEach(async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const body = await createRes.json();
      splitId = body.id;
    });

    test('should add a participant', async () => {
      const res = await app.request(
        `/splits/${splitId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John Doe' }),
        },
        mockEnv
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.name).toContain('John Doe');
      expect(body.isDone).toBe(false);
      expect(body.id).toHaveLength(10);
    });

    test('should validate required name', async () => {
      const res = await app.request(
        `/splits/${splitId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '' }),
        },
        mockEnv
      );
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    test('should return 404 for non-existent split', async () => {
      const res = await app.request(
        '/splits/abcd12345678/participants',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John Doe' }),
        },
        mockEnv
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /splits/:id/expenses', () => {
    let splitId;
    let participantId;

    beforeEach(async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const createBody = await createRes.json();
      splitId = createBody.id;

      const participantRes = await app.request(
        `/splits/${splitId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John Doe' }),
        },
        mockEnv
      );
      const participantBody = await participantRes.json();
      participantId = participantBody.id;
    });

    test('should add an expense', async () => {
      const res = await app.request(
        `/splits/${splitId}/expenses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            description: 'Dinner',
            amount: 25.5,
          }),
        },
        mockEnv
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.participantId).toBe(participantId);
      expect(body.amount).toBe(25.5);
      expect(body.id).toHaveLength(10);
    });

    test('should validate required fields', async () => {
      const res = await app.request(
        `/splits/${splitId}/expenses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Dinner' }),
        },
        mockEnv
      );
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    test('should return 404 for non-existent participant', async () => {
      const res = await app.request(
        `/splits/${splitId}/expenses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: 'nonexist01',
            description: 'Dinner',
            amount: 25.5,
          }),
        },
        mockEnv
      );
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /splits/:id/expenses/:expenseId', () => {
    let splitId;
    let participantId;
    let expenseId;

    beforeEach(async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const createBody = await createRes.json();
      splitId = createBody.id;

      const participantRes = await app.request(
        `/splits/${splitId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John Doe' }),
        },
        mockEnv
      );
      const participantBody = await participantRes.json();
      participantId = participantBody.id;

      const expenseRes = await app.request(
        `/splits/${splitId}/expenses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            description: 'Dinner',
            amount: 25.5,
          }),
        },
        mockEnv
      );
      const expenseBody = await expenseRes.json();
      expenseId = expenseBody.id;
    });

    test('should delete an expense', async () => {
      const res = await app.request(
        `/splits/${splitId}/expenses/${expenseId}`,
        { method: 'DELETE' },
        mockEnv
      );
      expect(res.status).toBe(204);
    });

    test('should return 400 for invalid expense ID', async () => {
      const res = await app.request(
        `/splits/${splitId}/expenses/short`,
        { method: 'DELETE' },
        mockEnv
      );
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /splits/:id/participants/:participantId/done', () => {
    let splitId;
    let participantId;

    beforeEach(async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const createBody = await createRes.json();
      splitId = createBody.id;

      const participantRes = await app.request(
        `/splits/${splitId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John Doe' }),
        },
        mockEnv
      );
      const participantBody = await participantRes.json();
      participantId = participantBody.id;
    });

    test('should mark participant as done', async () => {
      const res = await app.request(
        `/splits/${splitId}/participants/${participantId}/done`,
        { method: 'PATCH' },
        mockEnv
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.isDone).toBe(true);
    });

    test('should return 400 for invalid participant ID', async () => {
      const res = await app.request(
        `/splits/${splitId}/participants/short/done`,
        { method: 'PATCH' },
        mockEnv
      );
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /splits/:id/participants/:participantId/reset', () => {
    let splitId;
    let participantId;

    beforeEach(async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const createBody = await createRes.json();
      splitId = createBody.id;

      const participantRes = await app.request(
        `/splits/${splitId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John Doe' }),
        },
        mockEnv
      );
      const participantBody = await participantRes.json();
      participantId = participantBody.id;

      await app.request(
        `/splits/${splitId}/participants/${participantId}/done`,
        { method: 'PATCH' },
        mockEnv
      );
    });

    test('should reset participant status', async () => {
      const res = await app.request(
        `/splits/${splitId}/participants/${participantId}/reset`,
        { method: 'PATCH' },
        mockEnv
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.isDone).toBe(false);
    });
  });

  describe('GET /splits/:id/settlement', () => {
    let splitId;
    let participantId;

    beforeEach(async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const createBody = await createRes.json();
      splitId = createBody.id;

      const participantRes = await app.request(
        `/splits/${splitId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John Doe' }),
        },
        mockEnv
      );
      const participantBody = await participantRes.json();
      participantId = participantBody.id;
    });

    test('should return not ready when participants not done', async () => {
      const res = await app.request(
        `/splits/${splitId}/settlement`,
        {},
        mockEnv
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ready).toBe(false);
      expect(body.message).toBe('Not all participants are done yet');
    });

    test('should calculate settlement when all done', async () => {
      await app.request(
        `/splits/${splitId}/expenses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            description: 'Dinner',
            amount: 30.0,
          }),
        },
        mockEnv
      );

      await app.request(
        `/splits/${splitId}/participants/${participantId}/done`,
        { method: 'PATCH' },
        mockEnv
      );

      const res = await app.request(
        `/splits/${splitId}/settlement`,
        {},
        mockEnv
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ready).toBe(true);
      expect(body.total).toBe(30.0);
      expect(body.perPerson).toBe(30.0);
      expect(body).toHaveProperty('balances');
    });
  });

  describe('404 handler', () => {
    test('should return 404 for unknown routes', async () => {
      const res = await app.request('/unknown/route', {}, mockEnv);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Not found');
    });
  });

  describe('Rate limiting - max splits', () => {
    test('should return 429 when max splits reached', async () => {
      const limitedEnv = createMockEnv();
      limitedEnv.MAX_TOTAL_SPLITS = 1;

      await app.request('/splits', { method: 'POST' }, limitedEnv);

      const res = await app.request('/splits', { method: 'POST' }, limitedEnv);
      expect(res.status).toBe(429);

      const body = await res.json();
      expect(body.error).toContain('Maximum number of active splits');
    });
  });

  describe('Max participants limit', () => {
    test('should return 400 when max participants reached', async () => {
      const limitedEnv = {
        ...createMockEnv(),
        MAX_PARTICIPANTS: 1,
      };

      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        limitedEnv
      );
      const { id } = await createRes.json();

      await app.request(
        `/splits/${id}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'First Person' }),
        },
        limitedEnv
      );

      const res = await app.request(
        `/splits/${id}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Second Person' }),
        },
        limitedEnv
      );
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('Maximum');
    });
  });

  describe('Max expenses limit', () => {
    test('should return 400 when max expenses reached', async () => {
      const limitedEnv = {
        ...createMockEnv(),
        MAX_EXPENSES: 1,
      };

      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        limitedEnv
      );
      const { id } = await createRes.json();

      const participantRes = await app.request(
        `/splits/${id}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John' }),
        },
        limitedEnv
      );
      const { id: participantId } = await participantRes.json();

      await app.request(
        `/splits/${id}/expenses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            description: 'First',
            amount: 10,
          }),
        },
        limitedEnv
      );

      const res = await app.request(
        `/splits/${id}/expenses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            description: 'Second',
            amount: 20,
          }),
        },
        limitedEnv
      );
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('Maximum');
    });
  });

  describe('Delete expense edge cases', () => {
    test('should return 404 for non-existent expense', async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const { id } = await createRes.json();

      const res = await app.request(
        `/splits/${id}/expenses/nonexist01`,
        { method: 'DELETE' },
        mockEnv
      );
      expect(res.status).toBe(404);
    });
  });

  describe('Participant status edge cases', () => {
    test('should return 404 for non-existent participant on done', async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const { id } = await createRes.json();

      const res = await app.request(
        `/splits/${id}/participants/nonexist01/done`,
        { method: 'PATCH' },
        mockEnv
      );
      expect(res.status).toBe(404);
    });

    test('should return 404 for non-existent participant on reset', async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const { id } = await createRes.json();

      const res = await app.request(
        `/splits/${id}/participants/nonexist01/reset`,
        { method: 'PATCH' },
        mockEnv
      );
      expect(res.status).toBe(404);
    });

    test('should return 400 for invalid participant ID on reset', async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const { id } = await createRes.json();

      const res = await app.request(
        `/splits/${id}/participants/short/reset`,
        { method: 'PATCH' },
        mockEnv
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Settlement with multiple participants', () => {
    test('should calculate transactions between participants', async () => {
      const createRes = await app.request(
        '/splits',
        { method: 'POST' },
        mockEnv
      );
      const { id } = await createRes.json();

      const p1Res = await app.request(
        `/splits/${id}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Alice' }),
        },
        mockEnv
      );
      const p1 = await p1Res.json();

      const p2Res = await app.request(
        `/splits/${id}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Bob' }),
        },
        mockEnv
      );
      const p2 = await p2Res.json();

      await app.request(
        `/splits/${id}/expenses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: p1.id,
            description: 'Dinner',
            amount: 100,
          }),
        },
        mockEnv
      );

      await app.request(
        `/splits/${id}/participants/${p1.id}/done`,
        { method: 'PATCH' },
        mockEnv
      );
      await app.request(
        `/splits/${id}/participants/${p2.id}/done`,
        { method: 'PATCH' },
        mockEnv
      );

      const res = await app.request(`/splits/${id}/settlement`, {}, mockEnv);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ready).toBe(true);
      expect(body.total).toBe(100);
      expect(body.perPerson).toBe(50);
      expect(body.transactions).toBeDefined();
    });
  });
});
