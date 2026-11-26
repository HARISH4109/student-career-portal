import { render, screen, fireEvent } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { describe, expect, it, vi } from 'vitest';
import {
  AnimatedCounter,
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './index';

describe('UI Primitives — CareerSuccess Design System', () => {
  describe('Button', () => {
    it('renders with label and handles click', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      const btn = screen.getByRole('button', { name: /click me/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders loading spinner and disables button when loading', () => {
      render(<Button loading>Saving</Button>);
      const btn = screen.getByRole('button', { name: /saving/i });
      expect(btn).toBeDisabled();
    });

    it('applies destructive variant styles', () => {
      render(<Button variant="destructive">Delete</Button>);
      const btn = screen.getByRole('button', { name: /delete/i });
      expect(btn.className).toContain('bg-destructive');
    });

    it('renders asChild delegating to anchor link without Slot children error', () => {
      render(
        <Button asChild variant="outline">
          <a href="/test">Link Button</a>
        </Button>,
      );
      const link = screen.getByRole('link', { name: /link button/i });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link.className).toContain('border-input');
    });
  });

  describe('Badge & StatusBadge', () => {
    it('renders standard badge variants', () => {
      render(<Badge variant="success">Completed</Badge>);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('renders StatusBadge with semantic colors and dot', () => {
      render(<StatusBadge status="active">Active Listing</StatusBadge>);
      const badge = screen.getByText('Active Listing');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-emerald-50');
    });

    it('renders StatusBadge for rejected state', () => {
      render(<StatusBadge status="rejected">Rejected</StatusBadge>);
      const badge = screen.getByText('Rejected');
      expect(badge.className).toContain('bg-rose-50');
    });
  });

  describe('EmptyState & ErrorState', () => {
    it('renders empty state with context and triggers primary action', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No Opportunities Found"
          description="Try broadening your filters."
          action={{ label: 'Reset Filters', onClick: handleAction }}
        />,
      );
      expect(screen.getByText('No Opportunities Found')).toBeInTheDocument();
      expect(screen.getByText('Try broadening your filters.')).toBeInTheDocument();
      const btn = screen.getByRole('button', { name: /reset filters/i });
      fireEvent.click(btn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('renders error state with retry button', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          title="Network Error"
          message="Failed to fetch data."
          onRetry={handleRetry}
        />,
      );
      expect(screen.getByText('Network Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data.')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tabs', () => {
    it('switches tabs and displays active content panel', () => {
      render(
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applicants">Applicants</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Overview Panel Content</TabsContent>
          <TabsContent value="applicants">Applicants Panel Content</TabsContent>
        </Tabs>,
      );

      expect(screen.getByText('Overview Panel Content')).toBeInTheDocument();
      expect(screen.queryByText('Applicants Panel Content')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('tab', { name: /applicants/i }));

      expect(screen.queryByText('Overview Panel Content')).not.toBeInTheDocument();
      expect(screen.getByText('Applicants Panel Content')).toBeInTheDocument();
    });
  });

  describe('DataTable', () => {
    interface TestRow {
      id: string;
      title: string;
      company: string;
    }

    const columns: ColumnDef<TestRow>[] = [
      { accessorKey: 'title', header: 'Role Title' },
      { accessorKey: 'company', header: 'Company' },
    ];

    const sampleData: TestRow[] = [
      { id: '1', title: 'Frontend Engineer', company: 'Acme Corp' },
      { id: '2', title: 'Backend Developer', company: 'Global Tech' },
    ];

    it('renders table headers and data rows correctly', () => {
      render(<DataTable columns={columns} data={sampleData} searchKey="title" />);
      expect(screen.getByText('Role Title')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    });

    it('renders empty table message when data array is empty', () => {
      render(<DataTable columns={columns} data={[]} />);
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  describe('AnimatedCounter', () => {
    it('renders initial formatted value with prefix and suffix', () => {
      render(<AnimatedCounter value={88} suffix="%" />);
      expect(screen.getByText('88%')).toBeInTheDocument();
    });

    it('renders formatted decimals and prefix', () => {
      render(<AnimatedCounter value={1250} prefix="₹" decimals={0} />);
      expect(screen.getByText('₹1250')).toBeInTheDocument();
    });
  });
});
