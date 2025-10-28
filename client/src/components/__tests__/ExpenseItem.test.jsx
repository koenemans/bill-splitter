import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import ExpenseItem from '../ExpenseItem';

describe('ExpenseItem Component', () => {
  const mockExpense = {
    id: 'expense-id',
    description: 'Dinner at restaurant',
    amount: 25.50
  };

  const mockOnDelete = jest.fn();

  beforeEach(() => {
    mockOnDelete.mockClear();
  });

  test('should render expense information', () => {
    render(
      <ExpenseItem
        expense={mockExpense}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Dinner at restaurant')).toBeInTheDocument();
    expect(screen.getByText('€25.50')).toBeInTheDocument();
  });

  test('should format amount correctly', () => {
    const expenseWithDifferentAmount = {
      ...mockExpense,
      amount: 100
    };

    render(
      <ExpenseItem
        expense={expenseWithDifferentAmount}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('€100.00')).toBeInTheDocument();
  });

  test('should handle decimal amounts correctly', () => {
    const expenseWithDecimal = {
      ...mockExpense,
      amount: 15.99
    };

    render(
      <ExpenseItem
        expense={expenseWithDecimal}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('€15.99')).toBeInTheDocument();
  });

  test('should handle small amounts correctly', () => {
    const expenseWithSmallAmount = {
      ...mockExpense,
      amount: 0.50
    };

    render(
      <ExpenseItem
        expense={expenseWithSmallAmount}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('€0.50')).toBeInTheDocument();
  });

  test('should render delete button', () => {
    render(
      <ExpenseItem
        expense={mockExpense}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByLabelText('Delete expense');
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton.tagName).toBe('BUTTON');
  });

  test('should call onDelete when delete button is clicked', () => {
    render(
      <ExpenseItem
        expense={mockExpense}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByLabelText('Delete expense');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockExpense.id);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  test('should handle long descriptions', () => {
    const expenseWithLongDescription = {
      ...mockExpense,
      description: 'This is a very long expense description that might cause layout issues in the component'
    };

    render(
      <ExpenseItem
        expense={expenseWithLongDescription}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(expenseWithLongDescription.description)).toBeInTheDocument();
  });

  test('should handle special characters in description', () => {
    const expenseWithSpecialChars = {
      ...mockExpense,
      description: 'Café & Bakery - 50% discount!'
    };

    render(
      <ExpenseItem
        expense={expenseWithSpecialChars}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Café & Bakery - 50% discount!')).toBeInTheDocument();
  });

  test('should have correct styling classes', () => {
    render(
      <ExpenseItem
        expense={mockExpense}
        onDelete={mockOnDelete}
      />
    );

    // Check main container styling
    const container = screen.getByText('Dinner at restaurant').closest('div');
    expect(container).toHaveClass('flex', 'justify-between', 'items-center', 'p-3', 'bg-gray-50', 'rounded-lg');

    // Check description styling
    const description = screen.getByText('Dinner at restaurant');
    expect(description).toHaveClass('font-medium', 'text-gray-900');

    // Check amount styling
    const amount = screen.getByText('€25.50');
    expect(amount).toHaveClass('font-semibold', 'text-gray-900');

    // Check delete button styling
    const deleteButton = screen.getByLabelText('Delete expense');
    expect(deleteButton).toHaveClass('text-red-500', 'hover:text-red-700');
  });

  test('should render delete icon SVG', () => {
    render(
      <ExpenseItem
        expense={mockExpense}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByLabelText('Delete expense');
    const svg = deleteButton.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-5', 'h-5');
  });

  test('should be accessible', () => {
    render(
      <ExpenseItem
        expense={mockExpense}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByLabelText('Delete expense');
    expect(deleteButton).toHaveAttribute('aria-label', 'Delete expense');
  });

  test('should maintain layout structure', () => {
    render(
      <ExpenseItem
        expense={mockExpense}
        onDelete={mockOnDelete}
      />
    );

    // Check that the amount and delete button are in the same container
    const rightSection = screen.getByText('€25.50').closest('div');
    const deleteButton = screen.getByLabelText('Delete expense');

    expect(rightSection).toContainElement(deleteButton);
    expect(rightSection).toHaveClass('flex', 'items-center', 'gap-3');
  });

  test('should handle zero amount', () => {
    const expenseWithZeroAmount = {
      ...mockExpense,
      amount: 0
    };

    render(
      <ExpenseItem
        expense={expenseWithZeroAmount}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('€0.00')).toBeInTheDocument();
  });

  test('should handle large amounts', () => {
    const expenseWithLargeAmount = {
      ...mockExpense,
      amount: 999999.99
    };

    render(
      <ExpenseItem
        expense={expenseWithLargeAmount}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('€999999.99')).toBeInTheDocument();
  });
});
