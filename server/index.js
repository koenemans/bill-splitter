import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import xss from 'xss';
import path from 'path';
import { fileURLToPath } from 'url';
import { body, param, validationResult } from 'express-validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  limits: {
    maxParticipants: 50,
    maxExpenses: 500,
    maxNameLength: 100,
    maxDescriptionLength: 200,
    maxAmount: 1000000,
    requestBodySize: '10kb'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },
  splitExpiryMs: 7 * 24 * 60 * 60 * 1000 // 7 days
};

const isProduction = () => config.nodeEnv === 'production';

const app = express();
const apiRouter = express.Router();

// Middleware setup following proper order: security, body parsers, custom middleware, routes, error handlers

// Security: HTTPS redirect in production
if (isProduction()) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security: Helmet for security headers
app.use(helmet());

// Security: CORS with restricted origins
app.use(cors({
  origin: config.allowedOrigin,
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: config.limits.requestBodySize }));

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// In-memory storage
const splits = new Map();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => err.msg)
    });
  }
  next();
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Security: Clean up old splits every hour
setInterval(() => {
  const now = new Date();
  for (const [id, split] of splits.entries()) {
    const age = now - new Date(split.createdAt);
    if (age > config.splitExpiryMs) {
      splits.delete(id);
      console.log(`Deleted expired split: ${id}`);
    }
  }
}, 60 * 60 * 1000);

// API Routes using Express Router

// Create a new split
apiRouter.post('/splits', asyncHandler((req, res) => {
  // Security: Use longer nanoid for better security
  const id = nanoid(12);
  const split = {
    id,
    createdAt: new Date().toISOString(),
    participants: [],
    expenses: []
  };
  splits.set(id, split);
  res.status(201).json({ id });
}));

// Get split details
apiRouter.get('/splits/:id',
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
apiRouter.post('/splits/:id/participants',
  param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: config.limits.maxNameLength }).withMessage(`Name must be under ${config.limits.maxNameLength} characters`),
  handleValidationErrors,
  asyncHandler((req, res) => {
    const split = splits.get(req.params.id);
    if (!split) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Security: Check participant limit
    if (split.participants.length >= config.limits.maxParticipants) {
      return res.status(400).json({ error: `Maximum ${config.limits.maxParticipants} participants allowed` });
    }

    const { name } = req.body;
    const participantId = nanoid(10);
    const participant = {
      id: participantId,
      // Security: Sanitize name to prevent XSS
      name: xss(name),
      isDone: false
    };

    split.participants.push(participant);
    res.status(201).json(participant);
  })
);

// Add expense
apiRouter.post('/splits/:id/expenses',
  param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
  body('participantId').notEmpty().withMessage('Participant ID is required'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: config.limits.maxDescriptionLength }).withMessage(`Description must be under ${config.limits.maxDescriptionLength} characters`),
  body('amount')
    .isFloat({ min: 0.01, max: config.limits.maxAmount }).withMessage(`Amount must be between 0.01 and ${config.limits.maxAmount}`),
  handleValidationErrors,
  asyncHandler((req, res) => {
    const split = splits.get(req.params.id);
    if (!split) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Security: Check expense limit
    if (split.expenses.length >= config.limits.maxExpenses) {
      return res.status(400).json({ error: `Maximum ${config.limits.maxExpenses} expenses allowed` });
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
      // Security: Sanitize description to prevent XSS
      description: xss(description),
      amount: parseFloat(amount)
    };

    split.expenses.push(expense);
    res.status(201).json(expense);
  })
);

// Delete expense
apiRouter.delete('/splits/:id/expenses/:expenseId',
  param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
  param('expenseId').isLength({ min: 10, max: 10 }).withMessage('Invalid expense ID'),
  handleValidationErrors,
  asyncHandler((req, res) => {
    const split = splits.get(req.params.id);
    if (!split) {
      return res.status(404).json({ error: 'Split not found' });
    }

    const index = split.expenses.findIndex(e => e.id === req.params.expenseId);
    if (index === -1) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    split.expenses.splice(index, 1);
    res.status(204).send();
  })
);

// Mark participant as done
apiRouter.patch('/splits/:id/participants/:participantId/done',
  param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
  param('participantId').isLength({ min: 10, max: 10 }).withMessage('Invalid participant ID'),
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
apiRouter.patch('/splits/:id/participants/:participantId/reset',
  param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
  param('participantId').isLength({ min: 10, max: 10 }).withMessage('Invalid participant ID'),
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
apiRouter.get('/splits/:id/settlement',
  param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
  handleValidationErrors,
  asyncHandler((req, res) => {
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
        owes: perPersonShare,
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
      balance: data.paid - data.owes,
    }));

    // Save original balances before mutation
    const originalBalances = netBalances.map(b => ({
      name: b.name,
      paid: Math.round(b.paid * 100) / 100,
      owes: Math.round(b.owes * 100) / 100,
      balance: Math.round(b.balance * 100) / 100,
    }));

    // Calculate settlements (who pays whom)
    const debtors = netBalances
      .filter(p => p.balance < -0.01)
      .sort((a, b) => a.balance - b.balance);
    const creditors = netBalances
      .filter(p => p.balance > 0.01)
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

    res.json({
      ready: true,
      total: Math.round(total * 100) / 100,
      perPerson: Math.round(perPersonShare * 100) / 100,
      balances: originalBalances,
      transactions,
    });
  })
);

// Health check endpoint for Docker and deployment platforms
apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mount API router
app.use('/api', apiRouter);

// Centralized error handler middleware (must be last)
app.use((error, req, res, _next) => {
  console.error('Server error:', error);

  // Don't expose internal error details in production
  const message = isProduction() ? 'Internal server error' : error.message;

  res.status(error.status || 500).json({
    error: message,
    ...(isProduction() ? {} : { stack: error.stack })
  });
});

// Serve static files in production
if (isProduction()) {
  app.use(express.static(path.join(__dirname, 'public')));

  // Catch all handler: send back React's index.html file for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
