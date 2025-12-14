import { nanoid } from 'nanoid';

/**
 * D1-based repository for split data management
 * Implements repository pattern with Cloudflare D1 (SQLite) as storage backend
 */
export class D1SplitRepository {
  constructor(db, config = {}) {
    this.db = db;
    this.config = {
      maxParticipants: parseInt(config.maxParticipants) || 50,
      maxExpenses: parseInt(config.maxExpenses) || 500,
      maxTotalSplits: parseInt(config.maxTotalSplits) || 10000,
      splitExpiryHours: parseInt(config.splitExpiryHours) || 24,
    };
  }

  /**
   * Create a new split
   */
  async create() {
    const id = nanoid(12);
    const createdAt = new Date().toISOString();

    await this.db
      .prepare('INSERT INTO splits (id, created_at) VALUES (?, ?)')
      .bind(id, createdAt)
      .run();

    return { id, createdAt, participants: [], expenses: [] };
  }

  /**
   * Find split by ID with all related data
   */
  async findById(id) {
    const split = await this.db
      .prepare('SELECT id, created_at as createdAt FROM splits WHERE id = ?')
      .bind(id)
      .first();

    if (!split) {
      return null;
    }

    const participants = await this.db
      .prepare(
        'SELECT id, name, is_done as isDone FROM participants WHERE split_id = ?'
      )
      .bind(id)
      .all();

    const expenses = await this.db
      .prepare(
        'SELECT id, participant_id as participantId, description, amount FROM expenses WHERE split_id = ?'
      )
      .bind(id)
      .all();

    return {
      id: split.id,
      createdAt: split.createdAt,
      participants: participants.results.map(p => ({
        ...p,
        isDone: Boolean(p.isDone),
      })),
      expenses: expenses.results,
    };
  }

  /**
   * Add participant to split
   */
  async addParticipant(splitId, name) {
    // Check if split exists
    const split = await this.db
      .prepare('SELECT id FROM splits WHERE id = ?')
      .bind(splitId)
      .first();

    if (!split) {
      throw new Error('Split not found');
    }

    // Check participant limit
    const count = await this.db
      .prepare('SELECT COUNT(*) as count FROM participants WHERE split_id = ?')
      .bind(splitId)
      .first();

    if (count.count >= this.config.maxParticipants) {
      throw new Error(
        `Maximum ${this.config.maxParticipants} participants allowed`
      );
    }

    const id = nanoid(10);
    const participant = { id, name, isDone: false };

    await this.db
      .prepare(
        'INSERT INTO participants (id, split_id, name, is_done) VALUES (?, ?, ?, ?)'
      )
      .bind(id, splitId, name, 0)
      .run();

    return participant;
  }

  /**
   * Add expense to split
   */
  async addExpense(splitId, participantId, description, amount) {
    // Check if split exists
    const split = await this.db
      .prepare('SELECT id FROM splits WHERE id = ?')
      .bind(splitId)
      .first();

    if (!split) {
      throw new Error('Split not found');
    }

    // Check if participant exists
    const participant = await this.db
      .prepare('SELECT id FROM participants WHERE id = ? AND split_id = ?')
      .bind(participantId, splitId)
      .first();

    if (!participant) {
      throw new Error('Participant not found');
    }

    // Check expense limit
    const count = await this.db
      .prepare('SELECT COUNT(*) as count FROM expenses WHERE split_id = ?')
      .bind(splitId)
      .first();

    if (count.count >= this.config.maxExpenses) {
      throw new Error(`Maximum ${this.config.maxExpenses} expenses allowed`);
    }

    const id = nanoid(10);
    const expense = { id, participantId, description, amount };

    await this.db
      .prepare(
        'INSERT INTO expenses (id, split_id, participant_id, description, amount) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(id, splitId, participantId, description, amount)
      .run();

    return expense;
  }

  /**
   * Delete expense from split
   */
  async deleteExpense(splitId, expenseId) {
    // Check if split exists
    const split = await this.db
      .prepare('SELECT id FROM splits WHERE id = ?')
      .bind(splitId)
      .first();

    if (!split) {
      throw new Error('Split not found');
    }

    // Check if expense exists
    const expense = await this.db
      .prepare('SELECT id FROM expenses WHERE id = ? AND split_id = ?')
      .bind(expenseId, splitId)
      .first();

    if (!expense) {
      throw new Error('Expense not found');
    }

    await this.db
      .prepare('DELETE FROM expenses WHERE id = ?')
      .bind(expenseId)
      .run();

    return true;
  }

  /**
   * Update participant status
   */
  async updateParticipantStatus(splitId, participantId, isDone) {
    // Check if split exists
    const split = await this.db
      .prepare('SELECT id FROM splits WHERE id = ?')
      .bind(splitId)
      .first();

    if (!split) {
      throw new Error('Split not found');
    }

    // Check if participant exists and get current data
    const participant = await this.db
      .prepare(
        'SELECT id, name, is_done as isDone FROM participants WHERE id = ? AND split_id = ?'
      )
      .bind(participantId, splitId)
      .first();

    if (!participant) {
      throw new Error('Participant not found');
    }

    await this.db
      .prepare('UPDATE participants SET is_done = ? WHERE id = ?')
      .bind(isDone ? 1 : 0, participantId)
      .run();

    return {
      id: participant.id,
      name: participant.name,
      isDone,
    };
  }

  /**
   * Get count of active splits
   */
  async getActiveSplitsCount() {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM splits')
      .first();

    return result.count;
  }

  /**
   * Delete split
   */
  async delete(id) {
    await this.db.prepare('DELETE FROM splits WHERE id = ?').bind(id).run();
    return true;
  }

  /**
   * Clean up expired splits (older than configured hours)
   */
  async cleanupExpiredSplits() {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() - this.config.splitExpiryHours);

    const result = await this.db
      .prepare('DELETE FROM splits WHERE created_at < ?')
      .bind(expiryDate.toISOString())
      .run();

    return result.changes || 0;
  }
}
