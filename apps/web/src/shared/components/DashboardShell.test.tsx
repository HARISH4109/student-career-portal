import type { AuthenticatedUser } from '@career-portal/shared-types';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardShell } from './DashboardShell';

const mockUseAuth = vi.fn();

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/features/engagement/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Notifications</div>,
}));

function renderDashboardShell() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardShell />
    </MemoryRouter>,
  );
}

describe('DashboardShell Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student navigation links for STUDENT role', () => {
    const studentUser: AuthenticatedUser = {
      id: 'student-id-1',
      email: 'student@example.com',
      fullName: 'Alice Student',
      roles: ['STUDENT'],
      permissions: [
        'resources.view',
        'roadmaps.manage_own',
        'skill_gap.analyze_own',
        'notices.view',
      ],
    };

    mockUseAuth.mockReturnValue({
      user: studentUser,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    renderDashboardShell();

    // Student should see student-specific links
    expect(screen.getAllByRole('link', { name: /my profile/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /applications/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /resumes/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /my roadmap/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /skill gaps/i })[0]).toBeInTheDocument();

    // Common links
    expect(screen.getAllByRole('link', { name: /^opportunities$/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /preparation/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /career paths/i })[0]).toBeInTheDocument();

    // Student should NOT see faculty or admin specific links
    expect(screen.queryByRole('link', { name: /manage opportunities/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /academic programs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /administration/i })).not.toBeInTheDocument();
  });

  it('renders faculty navigation links for PLACEMENT_FACULTY role', () => {
    const facultyUser: AuthenticatedUser = {
      id: 'faculty-id-1',
      email: 'faculty@example.com',
      fullName: 'Dr. Placement Faculty',
      roles: ['PLACEMENT_FACULTY'],
      permissions: [
        'career_paths.manage',
        'notices.view',
        'resources.view',
      ],
    };

    mockUseAuth.mockReturnValue({
      user: facultyUser,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    renderDashboardShell();

    // Faculty should see faculty links
    expect(screen.getAllByRole('link', { name: /manage opportunities/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /manage career catalog/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /notice board/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /analytics/i })[0]).toBeInTheDocument();

    // Faculty should NOT see student-only links
    expect(screen.queryByRole('link', { name: /my profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /applications/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /resumes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /my roadmap/i })).not.toBeInTheDocument();

    // Faculty should NOT see admin-only links
    expect(screen.queryByRole('link', { name: /academic programs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /administration/i })).not.toBeInTheDocument();
  });

  it('renders admin navigation links for ADMIN role', () => {
    const adminUser: AuthenticatedUser = {
      id: 'admin-id-1',
      email: 'admin@example.com',
      fullName: 'Super Admin',
      roles: ['ADMIN'],
      permissions: [
        'career_paths.manage',
        'resources.view',
        'notices.view',
      ],
    };

    mockUseAuth.mockReturnValue({
      user: adminUser,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    renderDashboardShell();

    // Admin links
    expect(screen.getAllByRole('link', { name: /administration/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /academic programs/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /manage opportunities/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /manage career catalog/i })[0]).toBeInTheDocument();

    // Admin should NOT see student-only links
    expect(screen.queryByRole('link', { name: /my profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /applications/i })).not.toBeInTheDocument();
  });

  it('renders navigation links as accessible link elements with href attribute', () => {
    const studentUser: AuthenticatedUser = {
      id: 'student-id-1',
      email: 'student@example.com',
      fullName: 'Alice Student',
      roles: ['STUDENT'],
      permissions: [],
    };

    mockUseAuth.mockReturnValue({
      user: studentUser,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    renderDashboardShell();

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);

    const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
    expect(dashboardLinks[0]).toHaveAttribute('href', '/dashboard');

    const opportunitiesLinks = screen.getAllByRole('link', { name: /^opportunities$/i });
    expect(opportunitiesLinks[0]).toHaveAttribute('href', '/dashboard/opportunities');
  });
});
