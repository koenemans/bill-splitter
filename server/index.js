import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// In-memory storage
const splits = new Map();

// Create a new split
app.post('/api/splits', (req, res) => {
  const id = nanoid(10);
  const split = {
    id,
    createdAt: new Date().toISOString(),
    participants: [],
    expenses: []
  };
  splits.set(id, split);
  res.json({ id });
});

// Get split details
app.get('/api/splits/:id', (req, res) => {
  const split = splits.get(req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }
  res.json(split);
});

// Add participant
app.post('/api/splits/:id/participants', (req, res) => {
  const split = splits.get(req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }
  
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const participantId = nanoid(8);
  const participant = {
    id: participantId,
    name: name.trim(),
    isDone: false
  };
  
  split.participants.push(participant);
  res.json(participant);
});

// Add expense
app.post('/api/splits/:id/expenses', (req, res) => {
  const split = splits.get(req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }
  
  const { participantId, description, amount } = req.body;
  
  if (!participantId || !description || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const participant = split.participants.find(p => p.id === participantId);
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  const expenseId = nanoid(8);
  const expense = {
    id: expenseId,
    participantId,
    description: description.trim(),
    amount: parseFloat(amount)
  };
  
  split.expenses.push(expense);
  res.json(expense);
});

// Delete expense
app.delete('/api/splits/:id/expenses/:expenseId', (req, res) => {
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
});

// Mark participant as done
app.patch('/api/splits/:id/participants/:participantId/done', (req, res) => {
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
});

// Calculate settlement
app.get('/api/splits/:id/settlement', (req, res) => {
  const split = splits.get(req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }

  // Check if all participants are done
  const allDone = split.participants.length > 0 && 
                  split.participants.every(p => p.isDone);

  if (!allDone) {
    return res.json({ 
      ready: false, 
      message: 'Not all participants are done yet' 
    });
  }

  // Calculate total and per-person share
  const total = split.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const numParticipants = split.participants.length;
  const perPersonShare = total / numParticipants;

  // Calculate what each person paid
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

  // Calculate net balance (positive = should receive, negative = should pay)
  const netBalances = Object.entries(balances).map(([id, data]) => ({
    id,
    name: data.name,
    paid: data.paid,
    owes: data.owes,
    balance: data.paid - data.owes
  }));

  // Calculate settlements (who pays whom)
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
    balances: netBalances.map(b => ({
      name: b.name,
      paid: Math.round(b.paid * 100) / 100,
      owes: Math.round(b.owes * 100) / 100,
      balance: Math.round(b.balance * 100) / 100
    })),
    transactions
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
