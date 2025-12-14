/**
 * Validation middleware for Hono routes
 */

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_AMOUNT = 1000000;

/**
 * Validate split ID parameter
 */
export async function validateSplitId(c, next) {
  const id = c.req.param('id');

  if (!id || id.length !== 12) {
    return c.json({ error: 'Invalid split ID' }, 400);
  }

  await next();
}

/**
 * Validate participant creation request
 */
export async function validateParticipant(c, next) {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const errors = [];

  if (!body.name || typeof body.name !== 'string') {
    errors.push('Name is required');
  } else {
    const trimmedName = body.name.trim();
    if (trimmedName.length === 0) {
      errors.push('Name is required');
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      errors.push(`Name must be under ${MAX_NAME_LENGTH} characters`);
    }
  }

  if (errors.length > 0) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  // Store parsed body for later use
  c.set('parsedBody', body);
  await next();
}

/**
 * Validate expense creation request
 */
export async function validateExpense(c, next) {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const errors = [];

  if (!body.participantId || typeof body.participantId !== 'string') {
    errors.push('Participant ID is required');
  }

  if (!body.description || typeof body.description !== 'string') {
    errors.push('Description is required');
  } else {
    const trimmedDesc = body.description.trim();
    if (trimmedDesc.length === 0) {
      errors.push('Description is required');
    } else if (trimmedDesc.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`Description must be under ${MAX_DESCRIPTION_LENGTH} characters`);
    }
  }

  if (body.amount === undefined || body.amount === null) {
    errors.push('Amount is required');
  } else {
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount < 0.01 || amount > MAX_AMOUNT) {
      errors.push(`Amount must be between 0.01 and ${MAX_AMOUNT}`);
    }
  }

  if (errors.length > 0) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  // Store parsed body for later use
  c.set('parsedBody', body);
  await next();
}
