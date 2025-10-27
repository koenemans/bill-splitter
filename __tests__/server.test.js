import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { nanoid } from 'nanoid';
import xss from 'xss';

// Create test app (same setup as server/index.js but without starting the server)
const createTestApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));
  app.use(express.json({ limit: '10kb' }));
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api/', limiter);
  
  const splits = new Map();
  
  const MAX_PARTICIPANTS = 50;
  const MAX_EXPENSES = 500;
  const MAX_NAME_LENGTH = 100;
  const MAX_DESCRIPTION_LENGTH = 200;
  const MAX_AMOUNT = 1000000;
  
  // Create a new split
  app.post('/api/splits', (req, res) => {
    try {
      const id = nanoid(12);
      const split = {
        id,
        createdAt: new Date().toISOString(),
        participants: [],
        expenses: []
      };
      splits.set(id, split);
      res.json({ id });
    } catch (error) {
      console.error('Error creating split:', error);
      res.status(500).json({ error: 'Failed to create split' });
    }
  });
  
  // Get split details
  app.get('/api/splits/:id', (req, res) => {
    try {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }
      res.json(split);
    } catch (error) {
      console.error('Error getting split:', error);
      res.status(500).json({ error: 'Failed to retrieve split' });
    }
  });
  
  // Add participant
  app.post('/api/splits/:id/participants', (req, res) => {
    try {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }
      
      if (split.participants.length >= MAX_PARTICIPANTS) {
        return res.status(400).json({ error: `Maximum ${MAX_PARTICIPANTS} participants allowed` });
      }
      
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      if (name.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: `Name must be under ${MAX_NAME_LENGTH} characters` });
      }
      
      const participantId = nanoid(10);
      const participant = {
        id: participantId,
        name: xss(name.trim()),
        isDone: false
      };
      
      split.participants.push(participant);
      res.json(participant);
    } catch (error) {
      console.error('Error adding participant:', error);
      res.status(500).json({ error: 'Failed to add participant' });
    }
  });
  
  // Add expense
  app.post('/api/splits/:id/expenses', (req, res) => {
    try {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }
      
      if (split.expenses.length >= MAX_EXPENSES) {
        return res.status(400).json({ error: `Maximum ${MAX_EXPENSES} expenses allowed` });
      }
      
      const { participantId, description, amount } = req.body;
      
      if (!participantId || !description || amount === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ error: 'Description is required' });
      }
      
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        return res.status(400).json({ error: `Description must be under ${MAX_DESCRIPTION_LENGTH} characters` });
      }
      
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > MAX_AMOUNT) {
        return res.status(400).json({ error: 'Invalid amount. Must be between 0 and 1,000,000' });
      }
      
      const participant = split.participants.find(p => p.id === participantId);
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }
      
      const expenseId = nanoid(10);
      const expense = {
        id: expenseId,
        participantId,
        description: xss(description.trim()),
        amount: parsedAmount
      };
      
      split.expenses.push(expense);
      res.json(expense);
    } catch (error) {
      console.error('Error adding expense:', error);
      res.status(500).json({ error: 'Failed to add expense' });
    }
  });
  
  // Delete expense
  app.delete('/api/splits/:id/expenses/:expenseId', (req, res) => {
    try {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }
      
      const index = split.expenses.findIndex(e => e.id === req.params.expenseId);
      if (index === -1) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      split.expenses.splice(index, 1);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  });
  
  // Mark participant as done
  app.patch('/api/splits/:id/participants/:participantId/done', (req, res) => {
    try {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }
      
      const participant = split.participants.find(p => p.id === req.params.participantId);
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }
      
      participant.isDone = true;
      res.json(participant);
    } catch (error) {
      console.error('Error marking participant as done:', error);
      res.status(500).json({ error: 'Failed to update participant' });
    }
  });
  
  // Reset participant done status
  app.patch('/api/splits/:id/participants/:participantId/reset', (req, res) => {
    try {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }
      
      const participant = split.participants.find(p => p.id === req.params.participantId);
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }
      
      participant.isDone = false;
      res.json(participant);
    } catch (error) {
      console.error('Error resetting participant:', error);
      res.status(500).json({ error: 'Failed to reset participant' });
    }
  });
  
  // Calculate settlement
  app.get('/api/splits/:id/settlement', (req, res) => {
    try {
      const split = splits.get(req.params.id);
      if (!split) {
        return res.status(404).json({ error: 'Split not found' });
      }
      
      const allDone = split.participants.length > 0 && 
                      split.participants.every(p => p.isDone);
      
      if (!allDone) {
        return res.json({ 
          ready: false, 
          message: 'Not all participants are done yet' 
        });
      }
      
      const total = split.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const numParticipants = split.participants.length;
      const perPersonShare = total / numParticipants;
      
      const balances = {};
      split.participants.forEach(p => {
        balances[p.id] = {
          name: p.name,
          paid: 0,
          owes: perPersonShare
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
        balance: data.paid - data.owes
      }));
      
      // Save original balances before mutation
      const originalBalances = netBalances.map(b => ({
        name: b.name,
        paid: Math.round(b.paid * 100) / 100,
        owes: Math.round(b.owes * 100) / 100,
        balance: Math.round(b.balance * 100) / 100
      }));
      
      const debtors = netBalances.filter(p => p.balance < -0.01).sort((a, b) => a.balance - b.balance);
      const creditors = netBalances.filter(p => p.balance > 0.01).sort((a, b) => b.balance - a.balance);
      
      const transactions = [];
      let i = 0, j = 0;
      
      while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amount = Math.min(-debtor.balance, creditor.balance);
        
        if (amount > 0.01) {
          transactions.push({
            from: debtor.name,
            to: creditor.name,
            amount: Math.round(amount * 100) / 100
          });
        }
        
        debtor.balance += amount;
        creditor.balance -= amount;
        
        if (Math.abs(debtor.balance) < 0.01) i++;
        if (Math.abs(creditor.balance) < 0.01) j++;
      }
      
      res.json({
        ready: true,
        total: Math.round(total * 100) / 100,
        perPerson: Math.round(perPersonShare * 100) / 100,
        balances: originalBalances,
        transactions
      });
    } catch (error) {
      console.error('Error calculating settlement:', error);
      res.status(500).json({ error: 'Failed to calculate settlement' });
    }
  });
  
  return app;
};

describe('Bill Splitter API', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  describe('POST /api/splits', () => {
    test('should create a new split', async () => {
      const response = await request(app)
        .post('/api/splits')
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('string');
      expect(response.body.id.length).toBe(12);
    });
  });
  
  describe('GET /api/splits/:id', () => {
    test('should get split details', async () => {
      // Create a split first
      const createResponse = await request(app)
        .post('/api/splits')
        .expect(200);
      
      const splitId = createResponse.body.id;
      
      // Get the split
      const response = await request(app)
        .get(`/api/splits/${splitId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('id', splitId);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('participants');
      expect(response.body).toHaveProperty('expenses');
      expect(Array.isArray(response.body.participants)).toBe(true);
      expect(Array.isArray(response.body.expenses)).toBe(true);
    });
    
    test('should return 404 for non-existent split', async () => {
      const response = await request(app)
        .get('/api/splits/nonexistent')
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Split not found');
    });
  });
  
  describe('POST /api/splits/:id/participants', () => {
    let splitId;
    
    beforeAll(async () => {
      const response = await request(app).post('/api/splits');
      splitId = response.body.id;
    });
    
    test('should add a participant', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Alice' })
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Alice');
      expect(response.body).toHaveProperty('isDone', false);
    });
    
    test('should reject empty name', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Name is required');
    });
    
    test('should reject name that is too long', async () => {
      const longName = 'a'.repeat(101);
      const response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: longName })
        .expect(400);
      
      expect(response.body.error).toContain('Name must be under');
    });
    
    test('should sanitize XSS in name', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: '<script>alert("xss")</script>Bob' })
        .expect(200);
      
      expect(response.body.name).not.toContain('<script>');
    });
    
    test('should return 404 for non-existent split', async () => {
      const response = await request(app)
        .post('/api/splits/nonexistent/participants')
        .send({ name: 'Alice' })
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Split not found');
    });
  });
  
  describe('POST /api/splits/:id/expenses', () => {
    let splitId, participantId;
    
    beforeAll(async () => {
      const splitResponse = await request(app).post('/api/splits');
      splitId = splitResponse.body.id;
      
      const participantResponse = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Alice' });
      participantId = participantResponse.body.id;
    });
    
    test('should add an expense', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId,
          description: 'Dinner',
          amount: 50.00
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('participantId', participantId);
      expect(response.body).toHaveProperty('description', 'Dinner');
      expect(response.body).toHaveProperty('amount', 50.00);
    });
    
    test('should reject missing fields', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({ participantId })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });
    
    test('should reject invalid amount', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId,
          description: 'Test',
          amount: -10
        })
        .expect(400);
      
      expect(response.body.error).toContain('Invalid amount');
    });
    
    test('should reject amount that is too large', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId,
          description: 'Test',
          amount: 2000000
        })
        .expect(400);
      
      expect(response.body.error).toContain('Invalid amount');
    });
    
    test('should reject non-existent participant', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId: 'nonexistent',
          description: 'Test',
          amount: 10
        })
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Participant not found');
    });
    
    test('should sanitize XSS in description', async () => {
      const response = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId,
          description: '<script>alert("xss")</script>Lunch',
          amount: 25
        })
        .expect(200);
      
      expect(response.body.description).not.toContain('<script>');
    });
  });
  
  describe('DELETE /api/splits/:id/expenses/:expenseId', () => {
    let splitId, participantId, expenseId;
    
    beforeAll(async () => {
      const splitResponse = await request(app).post('/api/splits');
      splitId = splitResponse.body.id;
      
      const participantResponse = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Alice' });
      participantId = participantResponse.body.id;
      
      const expenseResponse = await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({
          participantId,
          description: 'Dinner',
          amount: 50
        });
      expenseId = expenseResponse.body.id;
    });
    
    test('should delete an expense', async () => {
      const response = await request(app)
        .delete(`/api/splits/${splitId}/expenses/${expenseId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      
      // Verify expense is deleted
      const splitResponse = await request(app).get(`/api/splits/${splitId}`);
      expect(splitResponse.body.expenses.length).toBe(0);
    });
    
    test('should return 404 for non-existent expense', async () => {
      const response = await request(app)
        .delete(`/api/splits/${splitId}/expenses/nonexistent`)
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Expense not found');
    });
  });
  
  describe('PATCH /api/splits/:id/participants/:participantId/done', () => {
    let splitId, participantId;
    
    beforeAll(async () => {
      const splitResponse = await request(app).post('/api/splits');
      splitId = splitResponse.body.id;
      
      const participantResponse = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Alice' });
      participantId = participantResponse.body.id;
    });
    
    test('should mark participant as done', async () => {
      const response = await request(app)
        .patch(`/api/splits/${splitId}/participants/${participantId}/done`)
        .expect(200);
      
      expect(response.body).toHaveProperty('isDone', true);
    });
    
    test('should return 404 for non-existent participant', async () => {
      const response = await request(app)
        .patch(`/api/splits/${splitId}/participants/nonexistent/done`)
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Participant not found');
    });
  });
  
  describe('PATCH /api/splits/:id/participants/:participantId/reset', () => {
    let splitId, participantId;
    
    beforeAll(async () => {
      const splitResponse = await request(app).post('/api/splits');
      splitId = splitResponse.body.id;
      
      const participantResponse = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Alice' });
      participantId = participantResponse.body.id;
      
      // Mark as done first
      await request(app)
        .patch(`/api/splits/${splitId}/participants/${participantId}/done`);
    });
    
    test('should reset participant done status', async () => {
      const response = await request(app)
        .patch(`/api/splits/${splitId}/participants/${participantId}/reset`)
        .expect(200);
      
      expect(response.body).toHaveProperty('isDone', false);
    });
  });
  
  describe('GET /api/splits/:id/settlement', () => {
    test('should return not ready when not all participants are done', async () => {
      const splitResponse = await request(app).post('/api/splits');
      const splitId = splitResponse.body.id;
      
      const p1Response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Alice' });
      
      const response = await request(app)
        .get(`/api/splits/${splitId}/settlement`)
        .expect(200);
      
      expect(response.body).toHaveProperty('ready', false);
      expect(response.body).toHaveProperty('message');
    });
    
    test('should calculate settlement correctly', async () => {
      // Create split
      const splitResponse = await request(app).post('/api/splits');
      const splitId = splitResponse.body.id;
      
      // Add participants
      const p1Response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Alice' });
      const p1Id = p1Response.body.id;
      
      const p2Response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Bob' });
      const p2Id = p2Response.body.id;
      
      const p3Response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Charlie' });
      const p3Id = p3Response.body.id;
      
      // Add expenses
      await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({ participantId: p1Id, description: 'Dinner', amount: 60 });
      
      await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({ participantId: p2Id, description: 'Drinks', amount: 30 });
      
      await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({ participantId: p3Id, description: 'Taxi', amount: 15 });
      
      // Mark all as done
      await request(app)
        .patch(`/api/splits/${splitId}/participants/${p1Id}/done`);
      await request(app)
        .patch(`/api/splits/${splitId}/participants/${p2Id}/done`);
      await request(app)
        .patch(`/api/splits/${splitId}/participants/${p3Id}/done`);
      
      // Get settlement
      const response = await request(app)
        .get(`/api/splits/${splitId}/settlement`)
        .expect(200);
      
      expect(response.body).toHaveProperty('ready', true);
      expect(response.body).toHaveProperty('total', 105);
      expect(response.body).toHaveProperty('perPerson', 35);
      expect(response.body).toHaveProperty('balances');
      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.balances)).toBe(true);
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.balances.length).toBe(3);
      
      // Check balances (values are rounded to 2 decimal places)
      const aliceBalance = response.body.balances.find(b => b.name === 'Alice');
      expect(aliceBalance).toBeDefined();
      expect(aliceBalance.paid).toBeCloseTo(60, 2);
      expect(aliceBalance.owes).toBeCloseTo(35, 2);
      expect(aliceBalance.balance).toBeCloseTo(25, 2);
      
      const bobBalance = response.body.balances.find(b => b.name === 'Bob');
      expect(bobBalance.paid).toBeCloseTo(30, 2);
      expect(bobBalance.owes).toBeCloseTo(35, 2);
      expect(bobBalance.balance).toBeCloseTo(-5, 2);
      
      const charlieBalance = response.body.balances.find(b => b.name === 'Charlie');
      expect(charlieBalance.paid).toBeCloseTo(15, 2);
      expect(charlieBalance.owes).toBeCloseTo(35, 2);
      expect(charlieBalance.balance).toBeCloseTo(-20, 2);
    });
    
    test('should handle equal split correctly', async () => {
      // Create split
      const splitResponse = await request(app).post('/api/splits');
      const splitId = splitResponse.body.id;
      
      // Add participants
      const p1Response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Alice' });
      const p1Id = p1Response.body.id;
      
      const p2Response = await request(app)
        .post(`/api/splits/${splitId}/participants`)
        .send({ name: 'Bob' });
      const p2Id = p2Response.body.id;
      
      // Add equal expenses
      await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({ participantId: p1Id, description: 'Lunch', amount: 50 });
      
      await request(app)
        .post(`/api/splits/${splitId}/expenses`)
        .send({ participantId: p2Id, description: 'Dinner', amount: 50 });
      
      // Mark all as done
      await request(app)
        .patch(`/api/splits/${splitId}/participants/${p1Id}/done`);
      await request(app)
        .patch(`/api/splits/${splitId}/participants/${p2Id}/done`);
      
      // Get settlement
      const response = await request(app)
        .get(`/api/splits/${splitId}/settlement`)
        .expect(200);
      
      expect(response.body).toHaveProperty('ready', true);
      expect(response.body).toHaveProperty('total', 100);
      expect(response.body).toHaveProperty('perPerson', 50);
      expect(response.body.transactions.length).toBe(0); // No transactions needed
    });
  });
});
