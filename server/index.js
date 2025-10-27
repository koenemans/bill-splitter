import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import xss from 'xss';

const app = express();
const PORT = 3001;

// Security: HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}

// Security: Helmet for security headers
app.use(helmet());

// Security: CORS with restricted origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Security: Request body size limit
app.use(express.json({ limit: '10kb' }));

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// In-memory storage
const splits = new Map();

// Constants for limits
const MAX_PARTICIPANTS = 50;
const MAX_EXPENSES = 500;
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_AMOUNT = 1000000;
const SPLIT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Security: Clean up old splits every hour
setInterval(() => {
  const now = new Date();
  for (const [id, split] of splits.entries()) {
    const age = now - new Date(split.createdAt);
    if (age > SPLIT_EXPIRY_MS) {
      splits.delete(id);
      console.log(`Deleted expired split: ${id}`);
    }
  }
}, 60 * 60 * 1000);

// Create a new split
app.post('/api/splits', (req, res) => {
  try {
    // Security: Use longer nanoid for better security
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
    
    // Security: Check participant limit
    if (split.participants.length >= MAX_PARTICIPANTS) {
      return res.status(400).json({ error: `Maximum ${MAX_PARTICIPANTS} participants allowed` });
    }
    
    const { name } = req.body;
    
    // Security: Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `Name must be under ${MAX_NAME_LENGTH} characters` });
    }

    const participantId = nanoid(10);
    const participant = {
      id: participantId,
      // Security: Sanitize name to prevent XSS
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
    
    // Security: Check expense limit
    if (split.expenses.length >= MAX_EXPENSES) {
      return res.status(400).json({ error: `Maximum ${MAX_EXPENSES} expenses allowed` });
    }
    
    const { participantId, description, amount } = req.body;
    
    // Security: Validate required fields
    if (!participantId || !description || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Security: Validate description
    if (typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ error: `Description must be under ${MAX_DESCRIPTION_LENGTH} characters` });
    }
    
    // Security: Validate amount
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
      // Security: Sanitize description to prevent XSS
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

  // Save original balances before mutation
  const originalBalances = netBalances.map(b => ({
    name: b.name,
    paid: Math.round(b.paid * 100) / 100,
    owes: Math.round(b.owes * 100) / 100,
    balance: Math.round(b.balance * 100) / 100
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
      balances: originalBalances,
      transactions
    });
  } catch (error) {
    console.error('Error calculating settlement:', error);
    res.status(500).json({ error: 'Failed to calculate settlement' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
