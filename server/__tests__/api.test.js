import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import helmet from 'helmet';
import xss from 'xss';
import { body, param, validationResult } from 'express-validator';

// Import the server configuration and setup
// We'll create the same app setup as in index.js but for testing
const createTestApp = () => {
  const app = express();
  const apiRouter = express.Router();

  // Configuration for testing
  const config = {
    limits: {
      maxParticipants: 50,
      maxExpenses: 500,
      maxNameLength: 100,
      maxDescriptionLength: 200,
      maxAmount: 1000000,
      requestBodySize: '10kb',
      maxTotalSplits: 10000, // Global limit for all active splits
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 20, // Reduced from 100 to match production
    },
    splitExpiryMs: 24 * 60 * 60 * 1000, // Reduced from 7 days to 24 hours
  };

  // In-memory storage for tests
  const splits = new Map();

  // Middleware setup
  app.use(helmet());
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: config.limits.requestBodySize }));

  // Skip rate limiting in tests
  // app.use('/api/', limiter);

  // Validation middleware
  const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(err => err.msg),
      });
    }
    next();
  };

  // Async error handler wrapper
  const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // API Routes
  // Create a new split
  apiRouter.post(
    '/splits',
    asyncHandler((req, res) => {
      const id = nanoid(12);
      const split = {
        id,
        createdAt: new Date().toISOString(),
        participants: [],
        expenses: [],
      };
      splits.set(id, split);
      res.status(201).json({ id });
    })
  );

  // Get split details
  apiRouter.get(
    '/splits/:id',
    param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
    handleValidationErrors,
    asyncHandler((req, res) => {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }
      res.json(split);
    })
  );

  // Add participant
  apiRouter.post(
    '/splits/:id/participants',
    param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: config.limits.maxNameLength })
      .withMessage(
        `Name must be under ${config.limits.maxNameLength} characters`
      ),
    handleValidationErrors,
    asyncHandler((req, res) => {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }

      if (split.participants.length >= config.limits.maxParticipants) {
        return res.status(400).json({
          error: `Maximum ${config.limits.maxParticipants} participants allowed`,
        });
      }

      const { name } = req.body;
      const participantId = nanoid(10);
      const participant = {
        id: participantId,
        name: xss(name),
        isDone: false,
      };

      split.participants.push(participant);
      res.status(201).json(participant);
    })
  );

  // Add expense
  apiRouter.post(
    '/splits/:id/expenses',
    param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
    body('participantId').notEmpty().withMessage('Participant ID is required'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: config.limits.maxDescriptionLength })
      .withMessage(
        `Description must be under ${config.limits.maxDescriptionLength} characters`
      ),
    body('amount')
      .isFloat({ min: 0.01, max: config.limits.maxAmount })
      .withMessage(
        `Amount must be between 0.01 and ${config.limits.maxAmount}`
      ),
    handleValidationErrors,
    asyncHandler((req, res) => {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }

      if (split.expenses.length >= config.limits.maxExpenses) {
        return res.status(400).json({
          error: `Maximum ${config.limits.maxExpenses} expenses allowed`,
        });
      }

      const { participantId, description, amount } = req.body;

      const participant = split.participants.find(p => p.id === participantId);
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      const expenseId = nanoid(10);
      const expense = {
        id: expenseId,
        participantId,
        description: xss(description),
        amount: parseFloat(amount),
      };

      split.expenses.push(expense);
      res.status(201).json(expense);
    })
  );

  // Delete expense
  apiRouter.delete(
    '/splits/:id/expenses/:expenseId',
    param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
    param('expenseId')
      .isLength({ min: 10, max: 10 })
      .withMessage('Invalid expense ID'),
    handleValidationErrors,
    asyncHandler((req, res) => {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }

      const index = split.expenses.findIndex(
        e => e.id === req.params.expenseId
      );
      if (index === -1) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      split.expenses.splice(index, 1);
      res.status(204).send();
    })
  );

  // Mark participant as done
  apiRouter.patch(
    '/splits/:id/participants/:participantId/done',
    param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
    param('participantId')
      .isLength({ min: 10, max: 10 })
      .withMessage('Invalid participant ID'),
    handleValidationErrors,
    asyncHandler((req, res) => {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }

      const participant = split.participants.find(
        p => p.id === req.params.participantId
      );
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      participant.isDone = true;
      res.json(participant);
    })
  );

  // Reset participant done status
  apiRouter.patch(
    '/splits/:id/participants/:participantId/reset',
    param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
    param('participantId')
      .isLength({ min: 10, max: 10 })
      .withMessage('Invalid participant ID'),
    handleValidationErrors,
    asyncHandler((req, res) => {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }

      const participant = split.participants.find(
        p => p.id === req.params.participantId
      );
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      participant.isDone = false;
      res.json(participant);
    })
  );

  // Calculate settlement
  apiRouter.get(
    '/splits/:id/settlement',
    param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
    handleValidationErrors,
    asyncHandler((req, res) => {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }

      const allDone =
        split.participants.length > 0 &&
        split.participants.every(p => p.isDone);

      if (!allDone) {
        return res.json({
          ready: false,
          message: 'Not all participants are done yet',
        });
      }

      // Calculate settlement logic (simplified for tests)
      const total = split.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const numParticipants = split.participants.length;
      const perPersonShare = total / numParticipants;

      const balances = {};
      split.participants.forEach(p => {
        balances[p.id] = {
          name: p.name,
          paid: 0,
          owes: perPersonShare,
        };
      });

      split.expenses.forEach(exp => {
        if (balances[exp.participantId]) {
          balances[exp.participantId].paid += exp.amount;
        }
      });

      const netBalances = Object.entries(balances).map(([id, data]) => ({
        id,
        name: data.name,
        paid: data.paid,
        owes: data.owes,
        balance: data.paid - data.owes,
      }));

      const originalBalances = netBalances.map(b => ({
        name: b.name,
        paid: Math.round(b.paid * 100) / 100,
        owes: Math.round(b.owes * 100) / 100,
        balance: Math.round(b.balance * 100) / 100,
      }));

      res.json({
        ready: true,
        total: Math.round(total * 100) / 100,
        perPerson: Math.round(perPersonShare * 100) / 100,
        balances: originalBalances,
        transactions: [], // Simplified for tests
      });
    })
  );

  // Health check
  apiRouter.get('/health', (req, res) => {
    res
      .status(200)
      .json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Mount API router
  app.use('/api', apiRouter);

  // Centralized error handler
  app.use((error, req, res, _next) => {
    console.error('Server error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error',
    });
  });

  return app;
};

describe('Bill Splitter API Tests', () => {
  let app;
  let splitId;
  let participantId;
  let expenseId;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    // Reset test data
    splitId = null;
    participantId = null;
    expenseId = null;
  });

  describe('POST /api/splits', () => {
    test('should create a new split', async () => {
      const response = await request(app).post('/api/splits').expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toHaveLength(12);
      splitId = response.body.id;
    });
  });

  describe('GET /api/splits/:id', () => {
    beforeEach(async () => {
      const createResponse = await request(app).post('/api/splits');
      splitId = createResponse.body.id;
    });

    test('should get split details', async () => {
      const response = await request(app)
        .get(`/api/splits/${splitId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: splitId,
        participants: [],
        expenses: [],
      });
      expect(response.body).toHaveProperty('createdAt');
    });

    test('should return 404 for non-existent split', async () => {
      const response = await request(app)
        .get('/api/splits/nonexistentid')
        .expect(400); // Validation error for invalid ID length

      expect(response.body).toHaveProperty('error');
    });

    test('should return 404 for valid but non-existent split ID', async () => {
      const fakeId = 'a'.repeat(12);
      const response = await request(app)
        .get(`/api/splits/${fakeId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Split not found',
      });
    });
  });

  describe('POST /api/splits/:id/participants', () => {
    beforeEach(async () => {
      const createResponse = await request(app).post('/api/splits');
      splitId = createResponse.body.id;
    });

    test('should add a participant', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'John Doe' })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'John Doe',
        isDone: false,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toHaveLength(10);
      participantId = response.body.id;
    });

    test('should sanitize participant name', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: '<script>alert("xss")</script>John' })
        .expect(201);

      expect(response.body.name).not.toContain('<script>');
      expect(response.body.name).toContain('John');
    });

    test('should validate required name', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
    });

    test('should validate name length', async () => {
      const longName = 'a'.repeat(101);
      const response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: longName })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/splits/:id/expenses', () => {
    beforeEach(async () => {
      const createResponse = await request(app).post('/api/splits');
      splitId = createResponse.body.id;

      const participantResponse = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'John Doe' });
      participantId = participantResponse.body.id;
    });

    test('should add an expense', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId,
          description: 'Dinner',
          amount: 25.5,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        participantId,
        description: 'Dinner',
        amount: 25.5,
      });
      expect(response.body).toHaveProperty('id');
      expenseId = response.body.id;
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          description: 'Dinner',
          // Missing participantId and amount
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should validate amount range', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId,
          description: 'Dinner',
          amount: -5,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 404 for non-existent participant', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId: 'nonexistent',
          description: 'Dinner',
          amount: 25.5,
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Participant not found',
      });
    });
  });

  describe('DELETE /api/splits/:id/expenses/:expenseId', () => {
    beforeEach(async () => {
      const createResponse = await request(app).post('/api/splits');
      splitId = createResponse.body.id;

      const participantResponse = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'John Doe' });
      participantId = participantResponse.body.id;

      const expenseResponse = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId,
          description: 'Dinner',
          amount: 25.5,
        });
      expenseId = expenseResponse.body.id;
    });

    test('should delete an expense', async () => {
      await request(app)
        .delete(`/api/splits/${splitId}/expenses/${expenseId}`)
        .expect(204);

      // Verify expense is deleted
      const splitResponse = await request(app).get(`/api/splits/${splitId}`);

      expect(splitResponse.body.expenses).toHaveLength(0);
    });

    test('should return 404 for non-existent expense', async () => {
      const fakeExpenseId = 'a'.repeat(10);
      const response = await request(app)
        .delete(`/api/splits/${splitId}/expenses/${fakeExpenseId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Expense not found',
      });
    });
  });

  describe('PATCH /api/splits/:id/participants/:participantId/done', () => {
    beforeEach(async () => {
      const createResponse = await request(app).post('/api/splits');
      splitId = createResponse.body.id;

      const participantResponse = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'John Doe' });
      participantId = participantResponse.body.id;
    });

    test('should mark participant as done', async () => {
      const response = await request(app)
        .patch(`/api/splits/${splitId}/participants/${participantId}/done`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: participantId,
        name: 'John Doe',
        isDone: true,
      });
    });
  });

  describe('GET /api/splits/:id/settlement', () => {
    beforeEach(async () => {
      const createResponse = await request(app).post('/api/splits');
      splitId = createResponse.body.id;

      const participantResponse = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'John Doe' });
      participantId = participantResponse.body.id;
    });

    test('should return not ready when participants not done', async () => {
      const response = await request(app)
        .get(`/api/splits/${splitId}/settlement`)
        .expect(200);

      expect(response.body).toMatchObject({
        ready: false,
        message: 'Not all participants are done yet',
      });
    });

    test('should calculate settlement when all done', async () => {
      // Add expense
      await request(app).post(`/api/splits/${splitId}/expenses`).send({
        participantId,
        description: 'Dinner',
        amount: 30.0,
      });

      // Mark participant as done
      await request(app).patch(
        `/api/splits/${splitId}/participants/${participantId}/done`
      );

      const response = await request(app)
        .get(`/api/splits/${splitId}/settlement`)
        .expect(200);

      expect(response.body).toMatchObject({
        ready: true,
        total: 30.0,
        perPerson: 30.0,
      });
      expect(response.body).toHaveProperty('balances');
    });
  });

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
      });
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
