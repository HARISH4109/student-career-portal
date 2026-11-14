import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EligibilityTag } from './EligibilityTag';

describe('EligibilityTag', () => {
  it('renders "You\'re Eligible" badge when isEligible=true in standard mode', () => {
    render(<EligibilityTag isEligible={true} />);

    const badge = screen.getByText("You're Eligible");
    expect(badge).toBeInTheDocument();
    expect(badge.closest('span')).toHaveClass('bg-emerald-50', 'text-emerald-700', 'rounded-full');
  });

  it('renders "Not Eligible" badge when isEligible=false in standard mode', () => {
    render(<EligibilityTag isEligible={false} />);

    const badge = screen.getByText('Not Eligible');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('span')).toHaveClass('bg-red-50', 'text-red-600', 'rounded-full');
  });

  it('renders "Eligible" badge in compact mode when isEligible=true', () => {
    render(<EligibilityTag isEligible={true} compact={true} />);

    const badge = screen.getByText('Eligible');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('span')).toHaveClass('text-emerald-600');
    expect(badge.closest('span')).not.toHaveClass('rounded-full');
  });

  it('renders "Not Eligible" badge in compact mode when isEligible=false', () => {
    render(<EligibilityTag isEligible={false} compact={true} />);

    const badge = screen.getByText('Not Eligible');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('span')).toHaveClass('text-red-500');
    expect(badge.closest('span')).not.toHaveClass('rounded-full');
  });
});
