import type {
  BatchDto,
  DepartmentDto,
  ProfileCompletionResponseDto,
  StudentProfileResponseDto,
} from '@career-portal/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfilePage } from './ProfilePage';

const mockMutateAsync = vi.fn();

const mockProfile: StudentProfileResponseDto = {
  id: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '1234567890',
  avatarUrl: null,
  rollNumber: '2023CSE001',
  departmentId: '11111111-1111-4111-8111-111111111111',
  department: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Computer Science and Engineering',
    code: 'CSE',
    isActive: true,
  },
  programId: '22222222-2222-4222-8222-222222222222',
  program: {
    id: '22222222-2222-4222-8222-222222222222',
    departmentId: '11111111-1111-4111-8111-111111111111',
    name: 'B.Tech Computer Science',
    degreeLevel: 'Bachelor',
    durationYears: 4,
    isActive: true,
  },
  batchId: '33333333-3333-4333-8333-333333333333',
  batch: {
    id: '33333333-3333-4333-8333-333333333333',
    graduationYear: 2027,
    isActive: true,
  },
  cgpa: 8.5,
  bio: 'Passionate software engineer',
  linkedinUrl: 'https://linkedin.com/in/johndoe',
  githubUrl: 'https://github.com/johndoe',
  portfolioUrl: 'https://johndoe.dev',
  isPlacementEligible: true,
  careerInterests: ['Full Stack', 'Cloud Architecture'],
  projects: [],
  certifications: [],
  achievements: [],
  skills: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockDepartments: DepartmentDto[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Computer Science and Engineering',
    code: 'CSE',
    isActive: true,
  },
];

const mockBatches: BatchDto[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    graduationYear: 2027,
    isActive: true,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    graduationYear: 2028,
    isActive: true,
  },
];

const mockCompletion: ProfileCompletionResponseDto = {
  percentage: 85,
  isComplete: true,
  completedSections: ['academic'],
  missingSections: [],
  categories: [
    {
      id: 'academic',
      name: 'Academic Details',
      weight: 25,
      isCompleted: true,
      score: 25,
      detail: 'Completed',
    },
  ],
};

vi.mock('../api/student-api', () => ({
  useStudentProfile: () => ({ data: mockProfile, isLoading: false }),
  useProfileCompletion: () => ({ data: mockCompletion, isLoading: false }),
  useDepartments: () => ({ data: mockDepartments, isLoading: false }),
  useBatches: () => ({ data: mockBatches, isLoading: false }),
  useUpdateProfile: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useSkillsCatalog: () => ({ data: [], isLoading: false }),
  useAddStudentSkill: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveStudentSkill: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/academic/services/academic-api', () => ({
  getAcademicPrograms: vi.fn().mockResolvedValue([
    {
      id: '22222222-2222-4222-8222-222222222222',
      departmentId: '11111111-1111-4111-8111-111111111111',
      name: 'B.Tech Computer Science',
      degreeLevel: 'Bachelor',
      durationYears: 4,
      isActive: true,
    },
  ]),
}));

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student profile form fields and information', async () => {
    const { container } = renderProfilePage();

    // Check header information
    expect(screen.getByRole('heading', { name: /john doe/i })).toBeInTheDocument();
    expect(screen.getByText(/Roll No: 2023CSE001/i)).toBeInTheDocument();
    expect(screen.getByText(/Placement Eligible/i)).toBeInTheDocument();

    // Check academic fields
    const rollInput = screen.getByPlaceholderText('e.g. 2022CSE045');
    expect(rollInput).toHaveValue('2023CSE001');

    const cgpaInput = screen.getByPlaceholderText('e.g. 8.75');
    expect(cgpaInput).toHaveValue(8.5);

    // Degree program select
    const programSelect = container.querySelector('select[name="programId"]');
    expect(programSelect).toBeInTheDocument();

    // Batch select
    const batchSelect = container.querySelector('select[name="batchId"]');
    expect(batchSelect).toBeInTheDocument();
    expect(batchSelect).toHaveValue('33333333-3333-4333-8333-333333333333');
  });

  it('validates CGPA range (0-10) and shows error on out of range value', async () => {
    renderProfilePage();

    const cgpaInput = screen.getByPlaceholderText('e.g. 8.75');
    fireEvent.change(cgpaInput, { target: { value: '11.5' } });

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/number must be less than or equal to 10/i),
      ).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('shows error when graduation batch is invalid or missing', async () => {
    const { container } = renderProfilePage();

    const batchSelect = container.querySelector('select[name="batchId"]');
    expect(batchSelect).toBeInTheDocument();
    fireEvent.change(batchSelect!, { target: { value: '' } });

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/valid batch id is required|required/i),
      ).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('submits valid form data with correct payload to API', async () => {
    mockMutateAsync.mockResolvedValue({});
    renderProfilePage();

    const rollInput = screen.getByPlaceholderText('e.g. 2022CSE045');
    fireEvent.change(rollInput, { target: { value: '2023CSE999' } });

    const cgpaInput = screen.getByPlaceholderText('e.g. 8.75');
    fireEvent.change(cgpaInput, { target: { value: '9.25' } });

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        rollNumber: '2023CSE999',
        cgpa: 9.25,
        departmentId: '11111111-1111-4111-8111-111111111111',
        programId: '22222222-2222-4222-8222-222222222222',
        batchId: '33333333-3333-4333-8333-333333333333',
      }),
    );
  });
});
