import { memo, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSplit } from '../hooks/useSplit';
import { useSplitApi } from '../hooks/useApi';
import { logger } from '../utils/logger';
import {
  anonymizeExpenseDescription,
  anonymizeParticipantName,
} from '../utils/anonymizer';
import { useParticipant } from '../hooks/useParticipant';
import SettlementDisplay from '../components/SettlementDisplay';
import ParticipantCard from '../components/ParticipantCard';
import ExpenseItem from '../components/ExpenseItem';

const Split = memo(() => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { split, settlement, loading, refreshSplit } = useSplit(id);
  const {
    addParticipant,
    addExpense,
    deleteExpense,
    markParticipantDone,
    resetParticipant,
  } = useSplitApi();
  const {
    currentParticipant,
    saveParticipant,
    clearParticipant,
    restoreParticipant,
  } = useParticipant(id);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const shareUrl = `${window.location.origin}/split/${id}`;

  // Restore participant when split data is loaded
  useEffect(() => {
    if (split) {
      restoreParticipant(split);
    }
  }, [split, restoreParticipant]);

  // Event handlers using custom hooks
  const handleAddParticipant = useCallback(
    async e => {
      e.preventDefault();
      if (!name.trim()) {
        return;
      }

      try {
        logger.userAction('add_participant', 'form_submit', {
          splitId: id,
          participantName: anonymizeParticipantName(name),
        });
        const participant = await addParticipant(id, name);
        logger.participantAdded(id, name, { participantId: participant.id });
        saveParticipant(participant);
        setName('');
        refreshSplit();
      } catch (err) {
        logger.apiError('add_participant', err, {
          splitId: id,
          participantName: anonymizeParticipantName(name),
        });
        alert(err.message || t('errors.addParticipant'));
      }
    },
    [id, name, addParticipant, saveParticipant, refreshSplit, t]
  );

  const handleAddExpense = useCallback(
    async e => {
      e.preventDefault();
      if (!description.trim() || !amount || !currentParticipant) {
        return;
      }

      try {
        logger.userAction('add_expense', 'form_submit', {
          splitId: id,
          participantId: currentParticipant.id,
          amount: parseFloat(amount),
          description: anonymizeExpenseDescription(description),
        });
        await addExpense(id, currentParticipant.id, description, amount);
        logger.expenseAdded(id, amount, description, {
          participantId: currentParticipant.id,
          participantName: anonymizeParticipantName(currentParticipant.name),
        });
        setDescription('');
        setAmount('');
        refreshSplit();
      } catch (err) {
        logger.apiError('add_expense', err, {
          splitId: id,
          participantId: currentParticipant.id,
          amount,
          description: anonymizeExpenseDescription(description),
        });
        alert(err.message || t('errors.addExpense'));
      }
    },
    [id, currentParticipant, description, amount, addExpense, refreshSplit, t]
  );

  const handleDeleteExpense = useCallback(
    async expenseId => {
      try {
        logger.userAction('delete_expense', 'button_click', {
          splitId: id,
          expenseId,
        });
        await deleteExpense(id, expenseId);
        logger.info('Expense deleted', {
          splitId: id,
          expenseId,
          event: 'expense_deleted',
        });
        refreshSplit();
      } catch (err) {
        logger.apiError('delete_expense', err, { splitId: id, expenseId });
        alert(t('errors.deleteExpense'));
      }
    },
    [id, deleteExpense, refreshSplit, t]
  );

  const handleMarkDone = useCallback(async () => {
    if (!currentParticipant) {
      return;
    }

    try {
      logger.userAction('mark_done', 'button_click', {
        splitId: id,
        participantId: currentParticipant.id,
        participantName: anonymizeParticipantName(currentParticipant.name),
      });
      await markParticipantDone(id, currentParticipant.id);
      logger.info('Participant marked as done', {
        splitId: id,
        participantId: currentParticipant.id,
        participantName: anonymizeParticipantName(currentParticipant.name),
        event: 'participant_done',
      });
      clearParticipant();
      refreshSplit();
    } catch (err) {
      logger.apiError('mark_participant_done', err, {
        splitId: id,
        participantId: currentParticipant.id,
      });
      alert(t('errors.markDone'));
    }
  }, [
    id,
    currentParticipant,
    markParticipantDone,
    clearParticipant,
    refreshSplit,
    t,
  ]);

  const handleResetParticipant = useCallback(
    async participantId => {
      try {
        logger.userAction('reset_participant', 'button_click', {
          splitId: id,
          participantId,
        });
        const participant = await resetParticipant(id, participantId);
        logger.info('Participant reset', {
          splitId: id,
          participantId,
          participantName: anonymizeParticipantName(participant.name),
          event: 'participant_reset',
        });
        saveParticipant(participant);
        refreshSplit();
      } catch (err) {
        logger.apiError('reset_participant', err, {
          splitId: id,
          participantId,
        });
        alert(t('errors.resetParticipant'));
      }
    },
    [id, resetParticipant, saveParticipant, refreshSplit, t]
  );

  // Utility functions
  const copyLink = useCallback(() => {
    logger.userAction('copy_link', 'button_click', { splitId: id });
    navigator.clipboard.writeText(shareUrl);
    alert(t('split.linkCopied'));
  }, [shareUrl, id, t]);

  const myExpenses =
    split?.expenses.filter(e => e.participantId === currentParticipant?.id) ||
    [];
  const myTotal = myExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-xl text-gray-600'>{t('split.loading')}</div>
      </div>
    );
  }

  if (!split) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-xl text-red-600'>{t('split.notFound')}</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen p-3 sm:p-4 py-6 sm:py-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6'>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4'>
            {t('split.title')}
          </h1>

          <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
            <input
              type='text'
              value={shareUrl}
              readOnly
              className='flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 text-xs sm:text-sm'
            />
            <button
              onClick={copyLink}
              className='px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium touch-manipulation whitespace-nowrap'
            >
              {t('split.copyLink')}
            </button>
          </div>
        </div>

        {/* Settlement Results */}
        <SettlementDisplay settlement={settlement} />

        {/* Participants */}
        <div className='bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6'>
          <h2 className='text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4'>
            {t('split.participants')}
          </h2>

          {split.participants.length === 0 ? (
            <p className='text-gray-500 text-center py-4 text-sm sm:text-base'>
              {t('split.noParticipants')}
            </p>
          ) : (
            <div className='grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3'>
              {split.participants.map(p => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  onReset={handleResetParticipant}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add Participant or Expenses */}
        {!currentParticipant ? (
          <div className='bg-white rounded-2xl shadow-xl p-4 sm:p-6'>
            <h2 className='text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4'>
              {t('split.joinSplit')}
            </h2>
            <form
              onSubmit={handleAddParticipant}
              className='flex flex-col sm:flex-row gap-3'
            >
              <input
                type='text'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('split.enterName')}
                className='flex-1 px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base'
                required
              />
              <button
                type='submit'
                className='px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all text-sm sm:text-base touch-manipulation whitespace-nowrap'
              >
                {t('split.join')}
              </button>
            </form>
          </div>
        ) : (
          <div className='bg-white rounded-2xl shadow-xl p-4 sm:p-6'>
            <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2'>
              <h2 className='text-lg sm:text-xl font-bold text-gray-900'>
                {t('split.expenses', { name: currentParticipant.name })}
              </h2>
              <div className='text-base sm:text-lg font-semibold text-indigo-600'>
                {t('split.total', { amount: myTotal.toFixed(2) })}
              </div>
            </div>

            {/* Expense List */}
            {myExpenses.length > 0 && (
              <div className='mb-4 sm:mb-6 space-y-2'>
                {myExpenses.map(expense => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    onDelete={handleDeleteExpense}
                  />
                ))}
              </div>
            )}

            {/* Add Expense Form */}
            <form onSubmit={handleAddExpense} className='mb-4'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <input
                  type='text'
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('split.description')}
                  className='sm:col-span-2 px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base'
                  required
                />
                <div className='relative'>
                  <span className='absolute left-3 top-3 text-gray-500 text-sm sm:text-base'>
                    €
                  </span>
                  <input
                    type='number'
                    step='0.01'
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder='0.00'
                    className='w-full pl-7 sm:pl-8 pr-3 sm:pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base'
                    required
                  />
                </div>
              </div>
              <button
                type='submit'
                className='w-full mt-3 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base touch-manipulation'
              >
                {t('split.addExpense')}
              </button>
            </form>

            {/* Done Button */}
            <button
              onClick={handleMarkDone}
              className='w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg text-sm sm:text-base touch-manipulation'
            >
              {t('split.doneButton')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

Split.displayName = 'Split';

export default Split;
