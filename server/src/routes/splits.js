import { Hono } from 'hono';
import { D1SplitRepository } from '../repositories/D1SplitRepository.js';
import { validateExpense, validateParticipant, validateSplitId } from '../middleware/validation.js';
import { sanitizeInput } from '../utils/sanitize.js';

export function createSplitRoutes() {
  const router = new Hono();

  // Helper to get repository from context
  const getRepository = (c) => {
    return new D1SplitRepository(c.env.DB, {
      maxParticipants: c.env.MAX_PARTICIPANTS,
      maxExpenses: c.env.MAX_EXPENSES,
      maxTotalSplits: c.env.MAX_TOTAL_SPLITS,
      splitExpiryHours: c.env.SPLIT_EXPIRY_HOURS,
    });
  };

  // Create a new split
  router.post('/', async (c) => {
    const repository = getRepository(c);

    // Check global split limit
    const currentCount = await repository.getActiveSplitsCount();
    const maxSplits = parseInt(c.env.MAX_TOTAL_SPLITS) || 10000;

    if (currentCount >= maxSplits) {
      return c.json(
        {
          error: `Maximum number of active splits reached (${maxSplits}). Please try again later.`,
        },
        429
      );
    }

    const split = await repository.create();
    return c.json({ id: split.id }, 201);
  });

  // Get split details
  router.get('/:id', validateSplitId, async (c) => {
    const repository = getRepository(c);
    const split = await repository.findById(c.req.param('id'));

    if (!split) {
      return c.json({ error: 'Split not found' }, 404);
    }

    return c.json(split);
  });

  // Add participant
  router.post('/:id/participants', validateSplitId, validateParticipant, async (c) => {
    const repository = getRepository(c);
    const { name } = await c.req.json();

    try {
      const sanitizedName = sanitizeInput(name);
      const participant = await repository.addParticipant(
        c.req.param('id'),
        sanitizedName
      );
      return c.json(participant, 201);
    } catch (error) {
      if (error.message === 'Split not found') {
        return c.json({ error: 'Split not found' }, 404);
      }
      if (error.message.includes('Maximum')) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  });

  // Add expense
  router.post('/:id/expenses', validateSplitId, validateExpense, async (c) => {
    const repository = getRepository(c);
    const { participantId, description, amount } = await c.req.json();

    try {
      const sanitizedDescription = sanitizeInput(description);
      const expense = await repository.addExpense(
        c.req.param('id'),
        participantId,
        sanitizedDescription,
        parseFloat(amount)
      );
      return c.json(expense, 201);
    } catch (error) {
      if (error.message === 'Split not found') {
        return c.json({ error: 'Split not found' }, 404);
      }
      if (error.message === 'Participant not found') {
        return c.json({ error: 'Participant not found' }, 404);
      }
      if (error.message.includes('Maximum')) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  });

  // Delete expense
  router.delete('/:id/expenses/:expenseId', validateSplitId, async (c) => {
    const repository = getRepository(c);
    const expenseId = c.req.param('expenseId');

    if (!expenseId || expenseId.length !== 10) {
      return c.json({ error: 'Invalid expense ID' }, 400);
    }

    try {
      await repository.deleteExpense(c.req.param('id'), expenseId);
      return c.body(null, 204);
    } catch (error) {
      if (error.message === 'Split not found') {
        return c.json({ error: 'Split not found' }, 404);
      }
      if (error.message === 'Expense not found') {
        return c.json({ error: 'Expense not found' }, 404);
      }
      throw error;
    }
  });

  // Mark participant as done
  router.patch('/:id/participants/:participantId/done', validateSplitId, async (c) => {
    const repository = getRepository(c);
    const participantId = c.req.param('participantId');

    if (!participantId || participantId.length !== 10) {
      return c.json({ error: 'Invalid participant ID' }, 400);
    }

    try {
      const participant = await repository.updateParticipantStatus(
        c.req.param('id'),
        participantId,
        true
      );
      return c.json(participant);
    } catch (error) {
      if (error.message === 'Split not found') {
        return c.json({ error: 'Split not found' }, 404);
      }
      if (error.message === 'Participant not found') {
        return c.json({ error: 'Participant not found' }, 404);
      }
      throw error;
    }
  });

  // Reset participant done status
  router.patch('/:id/participants/:participantId/reset', validateSplitId, async (c) => {
    const repository = getRepository(c);
    const participantId = c.req.param('participantId');

    if (!participantId || participantId.length !== 10) {
      return c.json({ error: 'Invalid participant ID' }, 400);
    }

    try {
      const participant = await repository.updateParticipantStatus(
        c.req.param('id'),
        participantId,
        false
      );
      return c.json(participant);
    } catch (error) {
      if (error.message === 'Split not found') {
        return c.json({ error: 'Split not found' }, 404);
      }
      if (error.message === 'Participant not found') {
        return c.json({ error: 'Participant not found' }, 404);
      }
      throw error;
    }
  });

  // Calculate settlement
  router.get('/:id/settlement', validateSplitId, async (c) => {
    const repository = getRepository(c);
    const split = await repository.findById(c.req.param('id'));

    if (!split) {
      return c.json({ error: 'Split not found' }, 404);
    }

    // Check if all participants are done
    const allDone =
      split.participants.length > 0 &&
      split.participants.every((p) => p.isDone);

    if (!allDone) {
      return c.json({
        ready: false,
        message: 'Not all participants are done yet',
      });
    }

    // Calculate total and per-person share
    const total = split.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const numParticipants = split.participants.length;
    const perPersonShare = total / numParticipants;

    // Calculate what each person paid
    const balances = {};
    split.participants.forEach((p) => {
      balances[p.id] = {
        name: p.name,
        paid: 0,
        owes: perPersonShare,
      };
    });

    split.expenses.forEach((exp) => {
      if (balances[exp.participantId]) {
        balances[exp.participantId].paid += exp.amount;
      }
    });

    // Calculate net balance (positive = should receive, negative = should pay)
    const netBalances = Object.entries(balances).map(([id, data]) => ({
      id,
      name: data.name,
      paid: data.paid,
      owes: data.owes,
      balance: data.paid - data.owes,
    }));

    // Save original balances before mutation
    const originalBalances = netBalances.map((b) => ({
      name: b.name,
      paid: Math.round(b.paid * 100) / 100,
      owes: Math.round(b.owes * 100) / 100,
      balance: Math.round(b.balance * 100) / 100,
    }));

    // Calculate settlements (who pays whom)
    const debtors = netBalances
      .filter((p) => p.balance < -0.01)
      .sort((a, b) => a.balance - b.balance);
    const creditors = netBalances
      .filter((p) => p.balance > 0.01)
      .sort((a, b) => b.balance - a.balance);

    const transactions = [];
    let i = 0,
      j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(-debtor.balance, creditor.balance);

      if (amount > 0.01) {
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(amount * 100) / 100,
        });
      }

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) {
        i++;
      }
      if (Math.abs(creditor.balance) < 0.01) {
        j++;
      }
    }

    return c.json({
      ready: true,
      total: Math.round(total * 100) / 100,
      perPerson: Math.round(perPersonShare * 100) / 100,
      balances: originalBalances,
      transactions,
    });
  });

  return router;
}
