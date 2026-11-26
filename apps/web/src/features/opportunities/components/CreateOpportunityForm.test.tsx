import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateOpportunityForm } from './CreateOpportunityForm';

const mockCreateMutation = vi.fn();
const mockUpdateMutation = vi.fn();
const mockStatusMutation = vi.fn();
const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();

const mockCompanies = [
  { id: 'company-1', name: 'Acme Technologies', industry: 'Tech' },
  { id: 'company-2', name: 'Globex Corp', industry: 'Finance' },
];

const mockSkills = [
  { id: 'skill-1', name: 'React', category: 'Frontend' },
  { id: 'skill-2', name: 'Node.js', category: 'Backend' },
  { id: 'skill-3', name: 'Python', category: 'Data Science' },
];

vi.mock('@/features/opportunities/api/opportunities-api', () => ({
  useCompanies: () => ({ data: mockCompanies }),
  useCreateOpportunity: () => ({
    mutateAsync: mockCreateMutation,
    isPending: false,
    error: null,
  }),
  useUpdateOpportunity: () => ({
    mutateAsync: mockUpdateMutation,
    isPending: false,
    error: null,
  }),
  useUpdateOpportunityStatus: () => ({
    mutateAsync: mockStatusMutation,
    isPending: false,
  }),
  useOpportunities: () => ({
    data: { data: [] },
  }),
}));

vi.mock('@/features/student/api/student-api', () => ({
  useDepartments: () => ({ data: [] }),
  useBatches: () => ({ data: [] }),
  usePrograms: () => ({ data: [] }),
  useSkillsCatalog: () => ({ data: mockSkills }),
}));

describe('CreateOpportunityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required form fields', () => {
    render(
      <CreateOpportunityForm onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    // Header
    expect(screen.getByRole('heading', { name: /post new opportunity/i })).toBeInTheDocument();

    // Required inputs
    expect(screen.getByPlaceholderText(/e\.g\. Associate Software Engineer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/provide role responsibilities/i)).toBeInTheDocument();

    // Selects
    expect(screen.getByDisplayValue('-- Choose Company --')).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /post opportunity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('validates that missing title shows an error', async () => {
    render(
      <CreateOpportunityForm onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    const form = screen.getByRole('button', { name: /post opportunity/i }).closest('form')!;

    // Fill company and description except title
    const companySelect = screen.getByDisplayValue('-- Choose Company --');
    fireEvent.change(companySelect, { target: { value: 'company-1' } });

    const descInput = screen.getByPlaceholderText(/provide role responsibilities/i);
    fireEvent.change(descInput, { target: { value: 'Awesome job description' } });

    // Submit form with empty title
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    expect(mockCreateMutation).not.toHaveBeenCalled();
  });

  it('validates that past deadline shows an error', async () => {
    const { container } = render(
      <CreateOpportunityForm onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    const form = screen.getByRole('button', { name: /post opportunity/i }).closest('form')!;

    const titleInput = screen.getByPlaceholderText(/e\.g\. Associate Software Engineer/i);
    fireEvent.change(titleInput, { target: { value: 'Software Engineer' } });

    const companySelect = screen.getByDisplayValue('-- Choose Company --');
    fireEvent.change(companySelect, { target: { value: 'company-1' } });

    const descInput = screen.getByPlaceholderText(/provide role responsibilities/i);
    fireEvent.change(descInput, { target: { value: 'Job description' } });

    // Set past deadline using datetime-local selector
    const deadlineInput = container.querySelector('input[type="datetime-local"]')!;
    expect(deadlineInput).toBeInTheDocument();
    fireEvent.change(deadlineInput, { target: { value: '2020-01-01T10:00' } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Application deadline must be in the future')).toBeInTheDocument();
    });

    expect(mockCreateMutation).not.toHaveBeenCalled();
  });

  it('sends correct DTO shape on valid submission', async () => {
    mockCreateMutation.mockResolvedValue({});

    const { container } = render(
      <CreateOpportunityForm onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    const form = screen.getByRole('button', { name: /post opportunity/i }).closest('form')!;

    // Title
    const titleInput = screen.getByPlaceholderText(/e\.g\. Associate Software Engineer/i);
    fireEvent.change(titleInput, { target: { value: 'Senior Frontend Engineer' } });

    // Company
    const companySelect = screen.getByDisplayValue('-- Choose Company --');
    fireEvent.change(companySelect, { target: { value: 'company-1' } });

    // Description
    const descInput = screen.getByPlaceholderText(/provide role responsibilities/i);
    fireEvent.change(descInput, { target: { value: 'Develop high performance React dashboards' } });

    // Location
    const locationInput = screen.getByPlaceholderText(/e\.g\. Bangalore, Mumbai/i);
    fireEvent.change(locationInput, { target: { value: 'Bangalore' } });

    // Switch to Paid compensation (exact button)
    const paidButton = screen.getByRole('button', { name: /^Paid$/i });
    fireEvent.click(paidButton);

    const salaryMinInput = screen.getByPlaceholderText('e.g. 600000');
    fireEvent.change(salaryMinInput, { target: { value: '800000' } });

    const salaryMaxInput = screen.getByPlaceholderText('e.g. 1200000');
    fireEvent.change(salaryMaxInput, { target: { value: '1400000' } });

    // Future deadline using datetime-local selector
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16);
    const deadlineInput = container.querySelector('input[type="datetime-local"]')!;
    expect(deadlineInput).toBeInTheDocument();
    fireEvent.change(deadlineInput, { target: { value: futureDate } });

    // Submit form
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateMutation).toHaveBeenCalledTimes(1);
    });

    expect(mockCreateMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Senior Frontend Engineer',
        type: 'job',
        companyId: 'company-1',
        description: 'Develop high performance React dashboards',
        workMode: 'onsite',
        location: 'Bangalore',
        salaryMin: 800000,
        salaryMax: 1400000,
        applicationDeadline: expect.any(String),
      }),
    );

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });

  it('allows dynamic addition and removal of skills', () => {
    render(
      <CreateOpportunityForm onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    const skillSearchInput = screen.getByPlaceholderText(/search and add skills/i);
    fireEvent.change(skillSearchInput, { target: { value: 'Rea' } });

    // Dropdown option for React should appear
    const reactOption = screen.getByRole('button', { name: /react/i });
    expect(reactOption).toBeInTheDocument();

    // Click to add skill
    fireEvent.click(reactOption);

    // Selected skill chip appears
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('(Required)')).toBeInTheDocument();

    // Toggle required / optional
    const toggleBtn = screen.getByText('(Required)');
    fireEvent.click(toggleBtn);
    expect(screen.getByText('(Optional)')).toBeInTheDocument();

    // Find and click the chip's delete button (the button following toggleBtn)
    const deleteBtn = toggleBtn.nextElementSibling;
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn!);

    // Chip is removed
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });
});
