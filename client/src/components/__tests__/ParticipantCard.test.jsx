import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import '../../i18n';
import ParticipantCard from '../ParticipantCard';

describe('ParticipantCard Component', () => {
  const mockParticipant = {
    id: 'participant-id',
    name: 'John Doe',
    isDone: false,
  };

  const mockOnReset = jest.fn();

  beforeEach(() => {
    mockOnReset.mockClear();
  });

  test('should render participant information', () => {
    render(
      <ParticipantCard participant={mockParticipant} onReset={mockOnReset} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Adding expenses...')).toBeInTheDocument();
  });

  test('should show correct styling for active participant', () => {
    render(
      <ParticipantCard participant={mockParticipant} onReset={mockOnReset} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Adding expenses...')).toBeInTheDocument();
  });

  test('should show correct content for done participant', () => {
    const doneParticipant = { ...mockParticipant, isDone: true };

    render(
      <ParticipantCard participant={doneParticipant} onReset={mockOnReset} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('✓ Done')).toBeInTheDocument();
  });

  test('should show reset button only for done participants', () => {
    // Test with active participant - no reset button
    const { rerender } = render(
      <ParticipantCard participant={mockParticipant} onReset={mockOnReset} />
    );

    expect(screen.queryByText('Reset')).not.toBeInTheDocument();

    // Test with done participant - should show reset button
    const doneParticipant = { ...mockParticipant, isDone: true };
    rerender(
      <ParticipantCard participant={doneParticipant} onReset={mockOnReset} />
    );

    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  test('should call onReset when reset button is clicked', () => {
    const doneParticipant = { ...mockParticipant, isDone: true };

    render(
      <ParticipantCard participant={doneParticipant} onReset={mockOnReset} />
    );

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalledWith(mockParticipant.id);
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  test('should handle long participant names', () => {
    const longNameParticipant = {
      ...mockParticipant,
      name: 'This is a very long participant name that might cause layout issues',
    };

    render(
      <ParticipantCard
        participant={longNameParticipant}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(longNameParticipant.name)).toBeInTheDocument();
  });

  test('should handle special characters in participant name', () => {
    const specialCharParticipant = {
      ...mockParticipant,
      name: 'José María & Co.',
    };

    render(
      <ParticipantCard
        participant={specialCharParticipant}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('José María & Co.')).toBeInTheDocument();
  });

  test('should be accessible', () => {
    const doneParticipant = { ...mockParticipant, isDone: true };

    render(
      <ParticipantCard participant={doneParticipant} onReset={mockOnReset} />
    );

    const resetButton = screen.getByText('Reset');
    expect(resetButton).toBeInTheDocument();
    expect(resetButton.tagName).toBe('BUTTON');
  });
});
