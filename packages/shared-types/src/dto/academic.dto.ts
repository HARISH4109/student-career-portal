import { z } from 'zod';

export const academicStreamDtoSchema = z.object({
  id: z.string().uuid(),
  programId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type AcademicStreamDto = z.infer<typeof academicStreamDtoSchema>;

export const createAcademicStreamSchema = z.object({
  programId: z.string().uuid('Valid program ID is required'),
  name: z.string().min(1, 'Stream name is required').max(200),
  code: z.string().min(1, 'Stream code is required').max(50),
});
export type CreateAcademicStreamDto = z.infer<typeof createAcademicStreamSchema>;

export const updateAcademicStreamSchema = z.object({
  programId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  code: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAcademicStreamDto = z.infer<typeof updateAcademicStreamSchema>;

export const academicProgramWithStreamsDtoSchema = z.object({
  id: z.string().uuid(),
  departmentId: z.string().uuid(),
  name: z.string(),
  degreeLevel: z.string(),
  durationYears: z.number().int(),
  isActive: z.boolean(),
  streams: z.array(academicStreamDtoSchema).default([]),
});
export type AcademicProgramWithStreamsDto = z.infer<typeof academicProgramWithStreamsDtoSchema>;

export const createAcademicProgramSchema = z.object({
  departmentId: z.string().uuid().optional(),
  name: z.string().min(1, 'Program name is required').max(200),
  code: z.string().max(50).optional(),
  degreeLevel: z.string().min(1, 'Degree level is required').max(50),
  durationYears: z.number().int().min(1).max(10).default(4),
});
export type CreateAcademicProgramDto = z.infer<typeof createAcademicProgramSchema>;

export const updateAcademicProgramSchema = z.object({
  departmentId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(50).optional(),
  degreeLevel: z.string().min(1).max(50).optional(),
  durationYears: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAcademicProgramDto = z.infer<typeof updateAcademicProgramSchema>;

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(150),
  code: z.string().min(1, 'Department code is required').max(20),
  description: z.string().max(500).optional(),
});
export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  code: z.string().min(1).max(20).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;

export const createBatchSchema = z.object({
  graduationYear: z.number().int().min(2000).max(2100),
});
export type CreateBatchDto = z.infer<typeof createBatchSchema>;

export const updateBatchSchema = z.object({
  graduationYear: z.number().int().min(2000).max(2100).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateBatchDto = z.infer<typeof updateBatchSchema>;

