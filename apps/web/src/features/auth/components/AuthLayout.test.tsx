import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AuthLayout } from './AuthLayout';

describe('AuthLayout — Classic Academic & Trusted Landing & Standalone Glass Modal', () => {
  it('renders State 1 (Hero Landing Canvas) when modal is closed', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthLayout title="Welcome Back" initialModalOpen={false}>
          <form>
            <label htmlFor="test-input">Email</label>
            <input id="test-input" />
          </form>
        </AuthLayout>
      </MemoryRouter>,
    );

    // Header branding
    expect(screen.getByText(/Student Success Portal/i)).toBeInTheDocument();

    // State 1 Hero title
    expect(
      screen.getByRole('heading', { name: /Build Your Career/i }),
    ).toBeInTheDocument();

    // Dual Center CTAs
    expect(screen.getByRole('button', { name: /Log In to Portal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Up \/ Join Cohort/i })).toBeInTheDocument();

    // Curated Student Success Network Badges & Notices
    expect(screen.getByText(/Internships & Placements/i)).toBeInTheDocument();
    expect(screen.getByText(/Career Roadmaps/i)).toBeInTheDocument();
    expect(screen.getByText(/Mock Interviews/i)).toBeInTheDocument();
    expect(screen.getByText(/Notices & Updates/i)).toBeInTheDocument();

    // Modal dialog should not be rendered
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('springs open State 2 (Centered Standalone Translucent Glass Modal) when clicking Log In', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthLayout title="Welcome Back" initialModalOpen={false}>
          <form>
            <label htmlFor="test-email">Email Address / College ID</label>
            <input id="test-email" />
            <button type="submit">Log In</button>
          </form>
        </AuthLayout>
      </MemoryRouter>,
    );

    const loginCta = screen.getByRole('button', { name: /Log In to Portal/i });
    fireEvent.click(loginCta);

    // Modal dialog is now visible
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address \/ College ID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close login modal/i })).toBeInTheDocument();
    // Verify direct credential access (no dead SSO button)
    expect(screen.queryByText(/Continue with Campus SSO/i)).not.toBeInTheDocument();
    // Verify standalone modal without top tab slider
    expect(screen.queryByLabelText(/Authentication Options/i)).not.toBeInTheDocument();
  });

  it('closes modal and restores State 1 when clicking close close button', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthLayout title="Welcome Back" initialModalOpen={true}>
          <form>
            <label htmlFor="test-email">Email Address / College ID</label>
            <input id="test-email" />
          </form>
        </AuthLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close login modal/i });
    fireEvent.click(closeBtn);

    // Modal is dismissed, returning to hero canvas
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Build Your Career/i })).toBeInTheDocument();
  });

  it('closes modal on Escape key press', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthLayout title="Welcome Back" initialModalOpen={true}>
          <div>Modal content</div>
        </AuthLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('marks background landmark regions with aria-hidden when modal is open', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthLayout title="Welcome Back" initialModalOpen={true}>
          <div>Modal content</div>
        </AuthLayout>
      </MemoryRouter>,
    );

    const header = container.querySelector('header');
    const main = container.querySelector('main');
    const footer = container.querySelector('footer');

    expect(header).toHaveAttribute('aria-hidden', 'true');
    expect(main).toHaveAttribute('aria-hidden', 'true');
    expect(footer).toHaveAttribute('aria-hidden', 'true');
  });

  it('cycles focus within modal on Tab key navigation', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthLayout title="Welcome Back" initialModalOpen={true}>
          <button type="button">Action 1</button>
          <button type="button">Action 2</button>
        </AuthLayout>
      </MemoryRouter>,
    );

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    const lastButton = buttons[buttons.length - 1];
    lastButton?.focus();
    expect(document.activeElement).toBe(lastButton);

    // Tab from last element wraps around to first focusable element
    fireEvent.keyDown(window, { key: 'Tab' });
  });
});
