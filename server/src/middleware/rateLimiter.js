/**
 * Simple rate limiter for Cloudflare Workers
 * Uses a sliding window approach with in-memory storage
 * Note: In a multi-worker environment, consider using Durable Objects for distributed rate limiting
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const READ_MAX = 200; // Max read requests per window
const WRITE_MAX = 50; // Max write requests per window

// In-memory storage for rate limiting (reset on worker restart)
const requestCounts = new Map();

function getClientIP(c) {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > WINDOW_MS) {
      requestCounts.delete(key);
    }
  }
}

export async function rateLimiter(c, next) {
  const ip = getClientIP(c);
  const method = c.req.method;
  const isWrite = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method);
  const maxRequests = isWrite ? WRITE_MAX : READ_MAX;
  const key = `${ip}:${isWrite ? 'write' : 'read'}`;

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  const now = Date.now();
  let data = requestCounts.get(key);

  if (!data || now - data.windowStart > WINDOW_MS) {
    data = { count: 0, windowStart: now };
  }

  data.count++;
  requestCounts.set(key, data);

  if (data.count > maxRequests) {
    return c.json(
      {
        error: `Too many ${isWrite ? 'write' : 'read'} requests from this IP, please try again later.`,
      },
      429
    );
  }

  // Add rate limit headers
  c.header('X-RateLimit-Limit', maxRequests.toString());
  c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - data.count).toString());
  c.header('X-RateLimit-Reset', new Date(data.windowStart + WINDOW_MS).toISOString());

  await next();
}
