/**
 * Centralized error handler for Hono
 */
export function errorHandler(err, c) {
  // eslint-disable-next-line no-console -- console.error is the standard logging method in Cloudflare Workers
  console.error('Unhandled error:', err);

  const isProduction = c.env?.ENVIRONMENT === 'production';

  // Don't expose internal error details in production
  const message = isProduction ? 'Internal server error' : err.message;

  return c.json(
    {
      error: message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
    err.status || 500
  );
}
