import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from '@jest/globals';
import '../../i18n';
import Footer from '../Footer';
import i18n from 'i18next';

describe('Footer Component', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  test('should render copyright with current year', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} Koenraad`)).toBeInTheDocument();
  });

  test('should render license info', () => {
    render(<Footer />);

    expect(screen.getByText('MIT License')).toBeInTheDocument();
  });

  test('should render language toggle buttons', () => {
    render(<Footer />);

    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('NL')).toBeInTheDocument();
  });

  test('should highlight current language', () => {
    render(<Footer />);

    const enButton = screen.getByText('EN');
    expect(enButton).toHaveClass('text-gray-900', 'font-medium');
  });

  test('should change language when clicking language button', () => {
    render(<Footer />);

    const nlButton = screen.getByText('NL');
    fireEvent.click(nlButton);

    expect(i18n.language).toBe('nl');

    // Reset to English
    const enButton = screen.getByText('EN');
    fireEvent.click(enButton);
    expect(i18n.language).toBe('en');
  });

  test('should have correct styling', () => {
    render(<Footer />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('py-4', 'px-4', 'text-center');
  });
});
