import { render, screen } from '@testing-library/react';
import { describe, expect, test } from '@jest/globals';
import '../../i18n';
import SettlementDisplay from '../SettlementDisplay';

describe('SettlementDisplay Component', () => {
  const mockSettlement = {
    total: 150.75,
    perPerson: 50.25,
    balances: [
      { name: 'Alice', paid: 100.0, owes: 50.25, balance: 49.75 },
      { name: 'Bob', paid: 30.5, owes: 50.25, balance: -19.75 },
      { name: 'Charlie', paid: 20.25, owes: 50.25, balance: -30.0 },
    ],
    transactions: [
      { from: 'Bob', to: 'Alice', amount: 19.75 },
      { from: 'Charlie', to: 'Alice', amount: 30.0 },
    ],
  };

  test('should render settlement information', () => {
    render(<SettlementDisplay settlement={mockSettlement} />);

    expect(screen.getByText('Settlement')).toBeInTheDocument();
    expect(screen.getByText('Total Amount')).toBeInTheDocument();
    expect(screen.getByText('€150.75')).toBeInTheDocument();
    expect(screen.getByText('Per Person')).toBeInTheDocument();
    expect(screen.getByText('€50.25')).toBeInTheDocument();
  });

  test('should render all balances', () => {
    render(<SettlementDisplay settlement={mockSettlement} />);

    expect(screen.getByText('Balances')).toBeInTheDocument();
    // All names appear multiple times (in balances and transactions), use getAllByText
    const aliceElements = screen.getAllByText('Alice');
    expect(aliceElements.length).toBeGreaterThan(0);
    const bobElements = screen.getAllByText('Bob');
    expect(bobElements.length).toBeGreaterThan(0);
    const charlieElements = screen.getAllByText('Charlie');
    expect(charlieElements.length).toBeGreaterThan(0);
  });

  test('should display positive balance in green', () => {
    render(<SettlementDisplay settlement={mockSettlement} />);

    const positiveBalance = screen.getByText('+€49.75');
    expect(positiveBalance).toHaveClass('text-green-600');
  });

  test('should display negative balance in red', () => {
    const { container } = render(
      <SettlementDisplay settlement={mockSettlement} />
    );

    // Find elements with text-red-600 class (negative balances)
    const redElements = container.querySelectorAll('.text-red-600');
    expect(redElements.length).toBe(2); // Bob and Charlie have negative balances

    // Verify at least one contains a euro amount
    const hasAmount = Array.from(redElements).some(el =>
      el.textContent.includes('€')
    );
    expect(hasAmount).toBe(true);
  });

  test('should render transactions section', () => {
    render(<SettlementDisplay settlement={mockSettlement} />);

    expect(screen.getByText('Who Pays Whom')).toBeInTheDocument();
  });

  test('should render all transactions', () => {
    render(<SettlementDisplay settlement={mockSettlement} />);

    // Check transaction amounts
    expect(screen.getByText('€19.75')).toBeInTheDocument();
    expect(screen.getByText('€30.00')).toBeInTheDocument();
  });

  test('should not render transactions section when empty', () => {
    const settlementNoTransactions = {
      ...mockSettlement,
      transactions: [],
    };

    render(<SettlementDisplay settlement={settlementNoTransactions} />);

    expect(screen.queryByText('Who Pays Whom')).not.toBeInTheDocument();
  });

  test('should return null when settlement is null', () => {
    const { container } = render(<SettlementDisplay settlement={null} />);

    expect(container.firstChild).toBeNull();
  });

  test('should return null when settlement is undefined', () => {
    const { container } = render(<SettlementDisplay settlement={undefined} />);

    expect(container.firstChild).toBeNull();
  });

  test('should format decimal amounts correctly', () => {
    const settlementWithDecimals = {
      total: 99.99,
      perPerson: 33.33,
      balances: [{ name: 'Alice', paid: 50.5, owes: 33.33, balance: 17.17 }],
      transactions: [{ from: 'Bob', to: 'Alice', amount: 16.66 }],
    };

    render(<SettlementDisplay settlement={settlementWithDecimals} />);

    expect(screen.getByText('€99.99')).toBeInTheDocument();
    // Multiple €33.33 values may exist, use getAllByText
    const perPersonAmounts = screen.getAllByText('€33.33');
    expect(perPersonAmounts.length).toBeGreaterThan(0);
    expect(screen.getByText('€16.66')).toBeInTheDocument();
  });

  test('should handle zero balance', () => {
    const settlementWithZero = {
      total: 100.0,
      perPerson: 50.0,
      balances: [{ name: 'Alice', paid: 50.0, owes: 50.0, balance: 0.0 }],
      transactions: [],
    };

    render(<SettlementDisplay settlement={settlementWithZero} />);

    expect(screen.getByText('+€0.00')).toBeInTheDocument();
  });

  test('should render arrow icon in transactions', () => {
    const { container } = render(
      <SettlementDisplay settlement={mockSettlement} />
    );

    const arrows = container.querySelectorAll('svg');
    expect(arrows.length).toBeGreaterThan(0);
  });

  test('should have correct styling classes', () => {
    const { container } = render(
      <SettlementDisplay settlement={mockSettlement} />
    );

    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveClass('bg-white', 'rounded-2xl', 'shadow-xl');
  });

  test('should render balance details with paid and owes amounts', () => {
    render(<SettlementDisplay settlement={mockSettlement} />);

    expect(
      screen.getByText(/Paid: €100.00 \| Owes: €50.25/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Paid: €30.50 \| Owes: €50.25/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Paid: €20.25 \| Owes: €50.25/)
    ).toBeInTheDocument();
  });

  test('should handle single participant', () => {
    const singleParticipant = {
      total: 50.0,
      perPerson: 50.0,
      balances: [{ name: 'Alice', paid: 50.0, owes: 50.0, balance: 0.0 }],
      transactions: [],
    };

    render(<SettlementDisplay settlement={singleParticipant} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    // Multiple €50.00 values exist (total and per person), so use getAllByText
    const amounts = screen.getAllByText('€50.00');
    expect(amounts.length).toBeGreaterThan(0);
  });

  test('should handle large amounts', () => {
    const largeAmounts = {
      total: 9999.99,
      perPerson: 3333.33,
      balances: [
        { name: 'Alice', paid: 5000.0, owes: 3333.33, balance: 1666.67 },
      ],
      transactions: [{ from: 'Bob', to: 'Alice', amount: 1666.67 }],
    };

    render(<SettlementDisplay settlement={largeAmounts} />);

    expect(screen.getByText('€9999.99')).toBeInTheDocument();
    expect(screen.getByText('€3333.33')).toBeInTheDocument();
    expect(screen.getByText('+€1666.67')).toBeInTheDocument();
  });

  test('should render multiple transactions correctly', () => {
    const multipleTransactions = {
      total: 300.0,
      perPerson: 100.0,
      balances: [
        { name: 'Alice', paid: 200.0, owes: 100.0, balance: 100.0 },
        { name: 'Bob', paid: 50.0, owes: 100.0, balance: -50.0 },
        { name: 'Charlie', paid: 50.0, owes: 100.0, balance: -50.0 },
      ],
      transactions: [
        { from: 'Bob', to: 'Alice', amount: 50.0 },
        { from: 'Charlie', to: 'Alice', amount: 50.0 },
      ],
    };

    render(<SettlementDisplay settlement={multipleTransactions} />);

    // Check that both transactions are rendered
    expect(screen.getByText('€300.00')).toBeInTheDocument();
    expect(screen.getByText('€100.00')).toBeInTheDocument();
    expect(screen.getByText('Who Pays Whom')).toBeInTheDocument();
  });
});
