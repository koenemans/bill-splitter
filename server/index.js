import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import xss from 'xss';
import path from 'path';
import { fileURLToPath } from 'url';
import { body, param, validationResult } from 'express-validator';
import {
  correlationMiddleware,
  createContextualLogger,
  errorLoggingMiddleware,
  logSystemMetrics,
  requestLoggingMiddleware,
} from './utils/logger.js';
import { anonymizeParticipantName } from './utils/anonymizer.js';
import { RedisSplitRepository } from './repositories/RedisSplitRepository.js';

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
    requestBodySize: '10kb',
    maxTotalSplits: parseInt(process.env.MAX_TOTAL_SPLITS) || 10000, // Global limit for all active splits
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    read: {
      max: parseInt(process.env.RATE_LIMIT_READ_MAX_PER_IP) || 200, // More generous for GET requests (polling)
    },
    write: {
      max: parseInt(process.env.RATE_LIMIT_WRITE_MAX_PER_IP) || 50, // Stricter for POST/PATCH/DELETE
    },
  },
  globalRateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX) || 2000, // Increased global limit
  },
  splitExpiryMs: parseInt(process.env.SPLIT_EXPIRY_MS) || 24 * 60 * 60 * 1000, // Reduced from 7 days to 24 hours
  memoryMonitoring: {
    alertThresholdMB: parseInt(process.env.MEMORY_ALERT_THRESHOLD_MB) || 1000, // Alert when memory usage exceeds 1GB
    checkIntervalMs: 5 * 60 * 1000, // Check every 5 minutes
  },
};

const isProduction = () => config.nodeEnv === 'production';

const app = express();
const apiRouter = express.Router();

// Middleware setup following proper order: security, body parsers, custom middleware, routes, error handlers

// Security: HTTPS redirect in production (but not for local development)
if (isProduction()) {
  app.use((req, res, next) => {
    // Skip HTTPS redirect for localhost development
    if (req.headers.host?.includes('localhost')) {
      return next();
    }
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security: Helmet for security headers
app.use(helmet());

// Security: CORS with restricted origins
app.use(
  cors({
    origin: config.allowedOrigin,
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: config.limits.requestBodySize }));

// Logging middleware
app.use(correlationMiddleware);
app.use(requestLoggingMiddleware);

// Repository pattern with Redis backend
const splitRepository = new RedisSplitRepository();

// Global request counter for rate limiting
let globalRequestCount = 0;
let globalWindowStart = Date.now();

// Security: Tiered Rate limiting - separate limits for read vs write operations
const readLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.read.max,
  message: 'Too many read requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.write.max,
  message: 'Too many write requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply read limiter to GET requests
app.use('/api/', (req, res, next) => {
  if (req.method === 'GET') {
    return readLimiter(req, res, next);
  }
  next();
});

// Apply write limiter to POST/PATCH/DELETE requests
app.use('/api/', (req, res, next) => {
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

// Security: Global rate limiting across all IPs
const globalRateLimiter = (req, res, next) => {
  const now = Date.now();

  // Reset window if expired
  if (now - globalWindowStart > config.globalRateLimit.windowMs) {
    globalRequestCount = 0;
    globalWindowStart = now;
  }

  // Check global limit
  if (globalRequestCount >= config.globalRateLimit.max) {
    return res.status(429).json({
      error: 'Global rate limit exceeded. Server is temporarily overloaded.',
    });
  }

  globalRequestCount++;
  next();
};
app.use('/api/', globalRateLimiter);

// Memory monitoring
let lastMemoryCheck = Date.now();
const systemLogger = createContextualLogger({ component: 'system' });

const checkMemoryUsage = async () => {
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const activeSplitsCount = await splitRepository.getActiveSplitsCount();

  if (memUsageMB > config.memoryMonitoring.alertThresholdMB) {
    systemLogger.memoryAlert(
      memUsageMB,
      config.memoryMonitoring.alertThresholdMB,
      activeSplitsCount
    );
  }

  if (Date.now() - lastMemoryCheck > 60000) {
    // Log every minute
    systemLogger.info('System metrics', {
      memoryUsageMB: memUsageMB,
      activeSplits: activeSplitsCount,
      event: 'periodic_metrics',
    });
    lastMemoryCheck = Date.now();
  }
};

// Start memory monitoring
setInterval(checkMemoryUsage, config.memoryMonitoring.checkIntervalMs);

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

// Note: Redis handles automatic cleanup via TTL, so manual cleanup interval is no longer needed
// Redis automatically removes expired keys based on the TTL set during creation
// This reduces memory usage and eliminates the need for manual cleanup intervals

// API Routes using Express Router

// Create a new split
apiRouter.post(
  '/splits',
  asyncHandler(async (req, res) => {
    // Security: Check global split limit to prevent memory exhaustion
    const currentSplitsCount = await splitRepository.getActiveSplitsCount();
    if (currentSplitsCount >= config.limits.maxTotalSplits) {
      req.logger.warn('Split creation rejected - limit reached', {
        currentSplits: currentSplitsCount,
        maxSplits: config.limits.maxTotalSplits,
        event: 'split_limit_reached',
      });
      return res.status(429).json({
        error: `Maximum number of active splits reached (${config.limits.maxTotalSplits}). Please try again later.`,
      });
    }

    // Security: Use longer nanoid for better security
    const id = nanoid(12);
    const split = {
      id,
      createdAt: new Date().toISOString(),
      participants: [],
      expenses: [],
    };
    await splitRepository.create(split);

    // Log split creation
    req.logger.splitCreated(id, {
      totalActiveSplits: await splitRepository.getActiveSplitsCount(),
    });

    // Check memory usage after creating split
    checkMemoryUsage();

    res.status(201).json({ id });
  })
);

// Get split details
apiRouter.get(
  '/splits/:id',
  param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const split = await splitRepository.findById(req.params.id);
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
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    const participantId = nanoid(10);
    const participant = {
      id: participantId,
      // Security: Sanitize name to prevent XSS
      name: xss(name),
      isDone: false,
    };

    try {
      const addedParticipant = await splitRepository.addParticipant(
        req.params.id,
        participant
      );

      // Log participant addition
      req.logger.participantAdded(req.params.id, name, {
        participantId,
        totalParticipants: (await splitRepository.findById(req.params.id))
          .participants.length,
      });

      res.status(201).json(addedParticipant);
    } catch (error) {
      if (error.message === 'Split not found') {
        return res.status(404).json({ error: 'Split not found' });
      }
      if (error.message.includes('Maximum')) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }
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
    .withMessage(`Amount must be between 0.01 and ${config.limits.maxAmount}`),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { participantId, description, amount } = req.body;

    // First check if split exists and participant is valid
    const split = await splitRepository.findById(req.params.id);
    if (!split) {
      return res.status(404).json({ error: 'Split not found' });
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
      description: xss(description),
      amount: parseFloat(amount),
    };

    try {
      const addedExpense = await splitRepository.addExpense(
        req.params.id,
        expense
      );

      // Log expense addition
      req.logger.expenseAdded(req.params.id, amount, description, {
        expenseId,
        participantId,
        participantName: anonymizeParticipantName(participant.name),
        totalExpenses: (await splitRepository.findById(req.params.id)).expenses
          .length,
      });

      res.status(201).json(addedExpense);
    } catch (error) {
      if (error.message === 'Split not found') {
        return res.status(404).json({ error: 'Split not found' });
      }
      if (error.message.includes('Maximum')) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }
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
  asyncHandler(async (req, res) => {
    try {
      await splitRepository.deleteExpense(req.params.id, req.params.expenseId);
      res.status(204).send();
    } catch (error) {
      if (error.message === 'Split not found') {
        return res.status(404).json({ error: 'Split not found' });
      }
      if (error.message === 'Expense not found') {
        return res.status(404).json({ error: 'Expense not found' });
      }
      throw error;
    }
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
  asyncHandler(async (req, res) => {
    try {
      const updatedParticipant = await splitRepository.updateParticipantStatus(
        req.params.id,
        req.params.participantId,
        true
      );
      res.json(updatedParticipant);
    } catch (error) {
      if (error.message === 'Split not found') {
        return res.status(404).json({ error: 'Split not found' });
      }
      if (error.message === 'Participant not found') {
        return res.status(404).json({ error: 'Participant not found' });
      }
      throw error;
    }
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
  asyncHandler(async (req, res) => {
    try {
      const updatedParticipant = await splitRepository.updateParticipantStatus(
        req.params.id,
        req.params.participantId,
        false
      );
      res.json(updatedParticipant);
    } catch (error) {
      if (error.message === 'Split not found') {
        return res.status(404).json({ error: 'Split not found' });
      }
      if (error.message === 'Participant not found') {
        return res.status(404).json({ error: 'Participant not found' });
      }
      throw error;
    }
  })
);

// Calculate settlement
apiRouter.get(
  '/splits/:id/settlement',
  param('id').isLength({ min: 12, max: 12 }).withMessage('Invalid split ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const split = await splitRepository.findById(req.params.id);
    if (!split) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Check if all participants are done
    const allDone =
      split.participants.length > 0 && split.participants.every(p => p.isDone);

    if (!allDone) {
      return res.json({
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
apiRouter.get('/health', async (req, res) => {
  try {
    const redisHealthy = await splitRepository.healthCheck();
    const status = redisHealthy ? 'healthy' : 'degraded';

    res.status(redisHealthy ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealthy ? 'healthy' : 'unhealthy',
      },
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Mount API router
app.use('/api', apiRouter);

// Centralized error handler middleware (must be last)
app.use(errorLoggingMiddleware);
app.use((error, req, res, _next) => {
  // Don't expose internal error details in production
  const message = isProduction() ? 'Internal server error' : error.message;

  res.status(error.status || 500).json({
    error: message,
    ...(isProduction() ? {} : { stack: error.stack }),
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

app.listen(config.port, async () => {
  const startupLogger = createContextualLogger({ component: 'startup' });

  try {
    // Initialize Redis connection
    await splitRepository.connect();

    startupLogger.info('Server started successfully', {
      port: config.port,
      environment: config.nodeEnv,
      url: `http://localhost:${config.port}`,
      redis: 'connected',
      event: 'server_start',
    });

    // Log system metrics on startup
    logSystemMetrics();
  } catch (error) {
    startupLogger.error('Failed to start server', {
      error: error.message,
      event: 'server_start_failed',
    });
    throw new Error('Failed to start server');
  }
});
