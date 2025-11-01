/**
 * Repository interface for split data management
 * Defines contract for any split storage implementation
 * Following dependency inversion principle for clean architecture
 */
export class SplitRepository {
  /**
   * Initialize repository connection
   */
  connect() {
    throw new Error('connect() must be implemented');
  }

  /**
   * Create a new split
   * @param {Object} _split - Split object to create
   * @returns {Promise<Object>} Created split
   */
  create(_split) {
    throw new Error('create() must be implemented');
  }

  /**
   * Find split by ID
   * @param {string} _id - Split ID
   * @returns {Promise<Object|null>} Split object or null if not found
   */
  findById(_id) {
    throw new Error('findById() must be implemented');
  }

  /**
   * Add participant to split
   * @param {string} _splitId - Split ID
   * @param {Object} _participant - Participant object
   * @returns {Promise<Object>} Added participant
   */
  addParticipant(_splitId, _participant) {
    throw new Error('addParticipant() must be implemented');
  }

  /**
   * Add expense to split
   * @param {string} _splitId - Split ID
   * @param {Object} _expense - Expense object
   * @returns {Promise<Object>} Added expense
   */
  addExpense(_splitId, _expense) {
    throw new Error('addExpense() must be implemented');
  }

  /**
   * Delete expense from split
   * @param {string} _splitId - Split ID
   * @param {string} _expenseId - Expense ID
   * @returns {Promise<boolean>} True if deleted
   */
  deleteExpense(_splitId, _expenseId) {
    throw new Error('deleteExpense() must be implemented');
  }

  /**
   * Update participant status
   * @param {string} _splitId - Split ID
   * @param {string} _participantId - Participant ID
   * @param {boolean} _isDone - New done status
   * @returns {Promise<Object>} Updated participant
   */
  updateParticipantStatus(_splitId, _participantId, _isDone) {
    throw new Error('updateParticipantStatus() must be implemented');
  }

  /**
   * Get count of active splits
   * @returns {Promise<number>} Number of active splits
   */
  getActiveSplitsCount() {
    throw new Error('getActiveSplitsCount() must be implemented');
  }

  /**
   * Delete split
   * @param {string} _id - Split ID
   * @returns {Promise<boolean>} True if deleted
   */
  delete(_id) {
    throw new Error('delete() must be implemented');
  }

  /**
   * Close repository connection
   */
  disconnect() {
    throw new Error('disconnect() must be implemented');
  }

  /**
   * Health check for repository
   * @returns {Promise<boolean>} True if healthy
   */
  healthCheck() {
    throw new Error('healthCheck() must be implemented');
  }
}
