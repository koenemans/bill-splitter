import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { createSplitRoutes } from './routes/splits.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = new Hono();

// Request logging - logs to Cloudflare dashboard
app.use('*', requestLogger);

// Security headers
app.use('*', secureHeaders());

// CORS configuration
app.use(
  '*',
  cors({
    origin: origin => {
      // Allow requests from any origin in development, or specific origins in production
      // You can customize this based on your ALLOWED_ORIGIN env var
      return origin;
    },
    credentials: true,
  })
);

// Rate limiting middleware
app.use('/splits/*', rateLimiter);

// Error handling
app.onError(errorHandler);

// Health check endpoint
app.get('/health', async c => {
  try {
    const db = c.env.DB;
    await db.prepare('SELECT 1').first();
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        d1: 'healthy',
      },
    });
  } catch {
    return c.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      503
    );
  }
});

// Mount split routes
app.route('/splits', createSplitRoutes());

// 404 handler
app.notFound(c => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
