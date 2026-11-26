import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import {
  ADMIN_STATIONS,
  AdminStickAnimation,
  DashboardRoleStickAnimation,
  FACULTY_STATIONS,
  FacultyStickAnimation,
  STUDENT_STATIONS,
  StudentStickAnimation,
} from './RoleStickAnimations';

describe('RoleStickAnimations Component Suite', () => {
  it('renders StudentStickAnimation with actionable stations and panoramic stick figure', () => {
    const { container } = render(
      <MemoryRouter>
        <StudentStickAnimation />
      </MemoryRouter>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Roadmap & Skills/i })).toHaveAttribute('href', '/dashboard/roadmap');
    expect(screen.getByRole('link', { name: /ATS Resume/i })).toHaveAttribute('href', '/dashboard/resumes');
    expect(screen.getByRole('link', { name: /Mock Practice/i })).toHaveAttribute('href', '/dashboard/preparation');
    expect(screen.getByRole('link', { name: /Land Offer/i })).toHaveAttribute('href', '/dashboard/opportunities');
    expect(screen.getByText(/Student Journey • Auto Loop/i)).toBeInTheDocument();
  });

  it('renders FacultyStickAnimation with actionable drive verification, match, and broadcast stations', () => {
    const { container } = render(
      <MemoryRouter>
        <FacultyStickAnimation />
      </MemoryRouter>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Extract & Verify Drive/i })).toHaveAttribute('href', '/dashboard/opportunities/manage');
    expect(screen.getByRole('link', { name: /Assess & Match/i })).toHaveAttribute('href', '/dashboard/preparation');
    expect(screen.getByRole('link', { name: /Publish & Notify/i })).toHaveAttribute('href', '/dashboard/notices');
    expect(screen.getByText(/Faculty Pipeline • Auto Loop/i)).toBeInTheDocument();
  });

  it('renders AdminStickAnimation with actionable programs, server ops, and audit security stations', () => {
    const { container } = render(
      <MemoryRouter>
        <AdminStickAnimation />
      </MemoryRouter>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Programs & Roles/i })).toHaveAttribute('href', '/dashboard/programs');
    expect(screen.getByRole('link', { name: /AI & Server Ops/i })).toHaveAttribute('href', '/dashboard/admin');
    expect(screen.getByRole('link', { name: /Audit & Security/i })).toHaveAttribute('href', '/dashboard/analytics');
    expect(screen.getByText(/Admin Governance • Auto Loop/i)).toBeInTheDocument();
  });

  it('correctly maps roles in DashboardRoleStickAnimation', () => {
    render(
      <MemoryRouter>
        <DashboardRoleStickAnimation role="STUDENT" />
        <DashboardRoleStickAnimation role="PLACEMENT_FACULTY" />
        <DashboardRoleStickAnimation role="ADMIN" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Roadmap & Skills/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Extract & Verify Drive/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Programs & Roles/i })).toBeInTheDocument();
  });

  it('exports valid station configurations with routes', () => {
    expect(STUDENT_STATIONS).toHaveLength(4);
    expect(FACULTY_STATIONS).toHaveLength(3);
    expect(ADMIN_STATIONS).toHaveLength(3);

    expect(STUDENT_STATIONS.map((s) => s.to)).toEqual([
      '/dashboard/roadmap',
      '/dashboard/resumes',
      '/dashboard/preparation',
      '/dashboard/opportunities',
    ]);
  });
});
