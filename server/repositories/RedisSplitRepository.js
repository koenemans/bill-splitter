import Redis from 'ioredis';
import { createContextualLogger } from '../utils/logger.js';
import { SplitRepository } from './SplitRepository.js';

const logger = createContextualLogger({ component: 'RedisSplitRepository' });

/**
 * Redis-based repository for split data management
 * Implements repository pattern with Redis as storage backend
 */
export class RedisSplitRepository extends SplitRepository {
  constructor(redisOptions = {}) {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...redisOptions,
    });

    this.ttl = parseInt(process.env.SPLIT_EXPIRY_MS) || 24 * 60 * 60 * 1000; // 24 hours default
    this.ttlSeconds = Math.floor(this.ttl / 1000);

    // Redis key patterns
    this.keys = {
      split: id => `split:${id}`,
      participants: id => `split:${id}:participants`,
      expenses: id => `split:${id}:expenses`,
      activeSplits: 'active_splits',
    };

    // Handle Redis connection events
    this.redis.on('connect', () => {
      logger.info('Connected to Redis', { event: 'redis_connected' });
    });

    this.redis.on('error', error => {
      logger.error('Redis connection error', {
        error: error.message,
        event: 'redis_error',
      });
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed', { event: 'redis_disconnected' });
    });
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      await this.redis.connect();
      logger.info('Redis repository initialized', { event: 'repository_init' });
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error.message,
        event: 'redis_init_failed',
      });
      throw error;
    }
  }

  /**
   * Create a new split
   */
  async create(split) {
    const splitKey = this.keys.split(split.id);
    const pipeline = this.redis.pipeline();

    // Store split metadata
    pipeline.hset(splitKey, {
      id: split.id,
      createdAt: split.createdAt,
    });

    // Set expiration
    pipeline.expire(splitKey, this.ttlSeconds);

    // Add to active splits set
    pipeline.sadd(this.keys.activeSplits, split.id);
    pipeline.expire(this.keys.activeSplits, this.ttlSeconds);

    const results = await pipeline.exec();
    this.validatePipelineResults(results);

    logger.info('Split created in Redis', {
      splitId: split.id,
      event: 'split_created',
    });

    return split;
  }

  /**
   * Find split by ID
   */
  async findById(id) {
    const splitKey = this.keys.split(id);
    const participantsKey = this.keys.participants(id);
    const expensesKey = this.keys.expenses(id);

    const pipeline = this.redis.pipeline();
    pipeline.exists(splitKey);
    pipeline.hgetall(splitKey);
    pipeline.smembers(participantsKey);
    pipeline.smembers(expensesKey);

    const results = await pipeline.exec();
    this.validatePipelineResults(results);

    const [existsResult, splitResult, participantsResult, expensesResult] =
      results;

    if (!existsResult[1]) {
      // Split expired, clean up from active_splits set
      await this.redis.srem(this.keys.activeSplits, id);
      return null;
    }

    const split = {
      ...splitResult[1],
      participants: participantsResult[1].map(p => JSON.parse(p)),
      expenses: expensesResult[1].map(e => JSON.parse(e)),
    };

    logger.debug('Split retrieved from Redis', {
      splitId: id,
      participantCount: split.participants.length,
      expenseCount: split.expenses.length,
      event: 'split_retrieved',
    });

    return split;
  }

  /**
   * Add participant to split
   */
  async addParticipant(splitId, participant) {
    const splitKey = this.keys.split(splitId);
    const participantsKey = this.keys.participants(splitId);

    // First check if split exists and get current count
    const pipeline = this.redis.pipeline();
    pipeline.exists(splitKey);
    pipeline.scard(participantsKey);

    const checkResults = await pipeline.exec();
    this.validatePipelineResults(checkResults);

    const [existsResult, countResult] = checkResults;

    if (!existsResult[1]) {
      throw new Error('Split not found');
    }

    // Check participant limit BEFORE adding
    const maxParticipants = parseInt(process.env.MAX_PARTICIPANTS) || 50;
    if (countResult[1] >= maxParticipants) {
      throw new Error(`Maximum ${maxParticipants} participants allowed`);
    }

    // Only add participant if within limits
    const addPipeline = this.redis.pipeline();
    addPipeline.sadd(participantsKey, JSON.stringify(participant));
    addPipeline.expire(participantsKey, this.ttlSeconds);

    const addResults = await addPipeline.exec();
    this.validatePipelineResults(addResults);

    logger.info('Participant added to Redis', {
      splitId,
      participantId: participant.id,
      participantName: participant.name,
      event: 'participant_added',
    });

    return participant;
  }

  /**
   * Add expense to split
   */
  async addExpense(splitId, expense) {
    const splitKey = this.keys.split(splitId);
    const expensesKey = this.keys.expenses(splitId);

    // First check if split exists and get current count
    const pipeline = this.redis.pipeline();
    pipeline.exists(splitKey);
    pipeline.scard(expensesKey);

    const checkResults = await pipeline.exec();
    this.validatePipelineResults(checkResults);

    const [existsResult, countResult] = checkResults;

    if (!existsResult[1]) {
      throw new Error('Split not found');
    }

    // Check expense limit BEFORE adding
    const maxExpenses = parseInt(process.env.MAX_EXPENSES) || 500;
    if (countResult[1] >= maxExpenses) {
      throw new Error(`Maximum ${maxExpenses} expenses allowed`);
    }

    // Only add expense if within limits
    const addPipeline = this.redis.pipeline();
    addPipeline.sadd(expensesKey, JSON.stringify(expense));
    addPipeline.expire(expensesKey, this.ttlSeconds);

    const addResults = await addPipeline.exec();
    this.validatePipelineResults(addResults);

    logger.info('Expense added to Redis', {
      splitId,
      expenseId: expense.id,
      amount: expense.amount,
      participantId: expense.participantId,
      event: 'expense_added',
    });

    return expense;
  }

  /**
   * Delete expense from split
   */
  async deleteExpense(splitId, expenseId) {
    const splitKey = this.keys.split(splitId);
    const expensesKey = this.keys.expenses(splitId);

    // Check if split exists
    const exists = await this.redis.exists(splitKey);
    if (!exists) {
      throw new Error('Split not found');
    }

    // Get all expenses and find the one to delete
    const expenses = await this.redis.smembers(expensesKey);
    const expenseToDelete = expenses.find(e => JSON.parse(e).id === expenseId);

    if (!expenseToDelete) {
      throw new Error('Expense not found');
    }

    await this.redis.srem(expensesKey, expenseToDelete);

    logger.info('Expense deleted from Redis', {
      splitId,
      expenseId,
      event: 'expense_deleted',
    });

    return true;
  }

  /**
   * Update participant status
   */
  async updateParticipantStatus(splitId, participantId, isDone) {
    const splitKey = this.keys.split(splitId);
    const participantsKey = this.keys.participants(splitId);

    // Check if split exists
    const exists = await this.redis.exists(splitKey);
    if (!exists) {
      throw new Error('Split not found');
    }

    // Get all participants
    const participants = await this.redis.smembers(participantsKey);
    const participantIndex = participants.findIndex(
      p => JSON.parse(p).id === participantId
    );

    if (participantIndex === -1) {
      throw new Error('Participant not found');
    }

    // Update participant status
    const participant = JSON.parse(participants[participantIndex]);
    participant.isDone = isDone;

    // Replace in set
    const pipeline = this.redis.pipeline();
    pipeline.srem(participantsKey, participants[participantIndex]);
    pipeline.sadd(participantsKey, JSON.stringify(participant));
    pipeline.expire(participantsKey, this.ttlSeconds);

    const results = await pipeline.exec();
    this.validatePipelineResults(results);

    logger.info('Participant status updated in Redis', {
      splitId,
      participantId,
      isDone,
      event: 'participant_status_updated',
    });

    return participant;
  }

  /**
   * Get count of active splits with cleanup of expired splits
   */
  async getActiveSplitsCount() {
    // Get all active split IDs
    const activeSplitIds = await this.redis.smembers(this.keys.activeSplits);

    if (activeSplitIds.length === 0) {
      return 0;
    }

    // Check which splits still exist
    const checkPipeline = this.redis.pipeline();
    for (const splitId of activeSplitIds) {
      checkPipeline.exists(this.keys.split(splitId));
    }

    const checkResults = await checkPipeline.exec();
    this.validatePipelineResults(checkResults);

    // Identify expired splits
    const expiredSplitIds = [];
    const existingSplitIds = [];

    for (let i = 0; i < activeSplitIds.length; i++) {
      const splitId = activeSplitIds[i];
      const exists = checkResults[i][1];

      if (exists) {
        existingSplitIds.push(splitId);
      } else {
        expiredSplitIds.push(splitId);
      }
    }

    // Clean up expired split IDs from active_splits set
    if (expiredSplitIds.length > 0) {
      await this.redis.srem(this.keys.activeSplits, ...expiredSplitIds);

      logger.info('Cleaned up expired split IDs from active splits', {
        expiredCount: expiredSplitIds.length,
        remainingCount: existingSplitIds.length,
        event: 'active_splits_cleanup',
      });
    }

    return existingSplitIds.length;
  }

  /**
   * Delete split (for cleanup)
   */
  async delete(id) {
    const splitKey = this.keys.split(id);
    const participantsKey = this.keys.participants(id);
    const expensesKey = this.keys.expenses(id);

    const pipeline = this.redis.pipeline();
    pipeline.del(splitKey);
    pipeline.del(participantsKey);
    pipeline.del(expensesKey);
    pipeline.srem(this.keys.activeSplits, id);

    const results = await pipeline.exec();
    this.validatePipelineResults(results);

    logger.info('Split deleted from Redis', {
      splitId: id,
      event: 'split_deleted',
    });

    return true;
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    try {
      await this.redis.disconnect();
      logger.info('Redis connection closed', { event: 'redis_disconnected' });
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error.message,
        event: 'redis_disconnect_error',
      });
    }
  }

  /**
   * Validate Redis pipeline results
   */
  validatePipelineResults(results) {
    for (const [err] of results) {
      if (err) {
        logger.error('Redis pipeline operation failed', {
          error: err.message,
          event: 'redis_pipeline_error',
        });
        throw new Error(`Redis operation failed: ${err.message}`);
      }
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck() {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', {
        error: error.message,
        event: 'redis_health_check_failed',
      });
      return false;
    }
  }
}
