import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from '@jest/globals';
import '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import i18n from 'i18next';

describe('LanguageSwitcher', () => {
  test('should render language selector with current language', () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('en');
  });

  test('should display language options', () => {
    render(<LanguageSwitcher />);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveValue('en');
    expect(options[1]).toHaveValue('nl');
  });

  test('should change language when selecting a different option', async () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'nl' } });

    expect(i18n.language).toBe('nl');

    // Reset to English for other tests
    fireEvent.change(select, { target: { value: 'en' } });
  });

  test('should display translated labels', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByText('Language:')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Nederlands')).toBeInTheDocument();
  });
});
