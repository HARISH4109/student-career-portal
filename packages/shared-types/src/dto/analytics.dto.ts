import { z } from 'zod';

export const StudentAnalyticsResponseSchema = z.object({
  profileCompletionPercentage: z.number().min(0).max(100),
  resumeScore: z.number().nullable(),
  testsAttempted: z.number().int().nonnegative(),
  averageTestScore: z.number().min(0).max(100),
  roadmapProgress: z.object({
    hasActiveRoadmap: z.boolean(),
    careerPathTitle: z.string().nullable().optional(),
    percentage: z.number().min(0).max(100),
    completedStages: z.number().int().nonnegative(),
    totalStages: z.number().int().nonnegative(),
  }),
  applicationsCount: z.number().int().nonnegative(),
  applicationsByStatus: z.record(z.number().int().nonnegative()),
  interviewsCount: z.number().int().nonnegative(),
  selectionsCount: z.number().int().nonnegative(),
});
export type StudentAnalyticsResponse = z.infer<typeof StudentAnalyticsResponseSchema>;

export const FacultyAnalyticsResponseSchema = z.object({
  opportunitiesPublished: z.number().int().nonnegative(),
  activeOpportunities: z.number().int().nonnegative(),
  totalApplications: z.number().int().nonnegative(),
  applicationFunnel: z.object({
    applied: z.number().int().nonnegative(),
    under_review: z.number().int().nonnegative(),
    shortlisted: z.number().int().nonnegative(),
    assessment: z.number().int().nonnegative(),
    interview: z.number().int().nonnegative(),
    selected: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
  }),
  testParticipation: z.object({
    totalTests: z.number().int().nonnegative(),
    totalAttempts: z.number().int().nonnegative(),
    averageScore: z.number().min(0).max(100),
  }),
  studentReadinessTrends: z.array(
    z.object({
      departmentName: z.string(),
      studentCount: z.number().int().nonnegative(),
      averageTestScore: z.number().min(0).max(100),
      readyStudentCount: z.number().int().nonnegative(),
    }),
  ),
  skillGapTrends: z.array(
    z.object({
      skillName: z.string(),
      missingCount: z.number().int().nonnegative(),
    }),
  ),
  placementStats: z
    .object({
      uniqueApplicants: z.number().int().nonnegative(),
      uniquePlaced: z.number().int().nonnegative(),
      placementRate: z.number().min(0).max(100),
      interviewClearanceRate: z.number().min(0).max(100),
    })
    .optional(),
});
export type FacultyAnalyticsResponse = z.infer<typeof FacultyAnalyticsResponseSchema>;

export const AdminAnalyticsResponseSchema = z.object({
  users: z.object({
    total: z.number().int().nonnegative(),
    students: z.number().int().nonnegative(),
    faculty: z.number().int().nonnegative(),
    admins: z.number().int().nonnegative(),
  }),
  departmentBreakdown: z.array(
    z.object({
      departmentId: z.string().uuid(),
      departmentName: z.string(),
      departmentCode: z.string(),
      studentCount: z.number().int().nonnegative(),
      placedCount: z.number().int().nonnegative().optional(),
      placementRate: z.number().min(0).max(100).optional(),
      averageScore: z.number().min(0).max(100).optional(),
      readyStudentCount: z.number().int().nonnegative().optional(),
    }),
  ),
  programBreakdown: z.array(
    z.object({
      programId: z.string().uuid(),
      programName: z.string(),
      degreeLevel: z.string(),
      studentCount: z.number().int().nonnegative(),
    }),
  ).optional(),
  batchBreakdown: z.array(
    z.object({
      batchId: z.string().uuid(),
      graduationYear: z.number().int(),
      studentCount: z.number().int().nonnegative(),
    }),
  ),
  opportunities: z.object({
    total: z.number().int().nonnegative(),
    jobs: z.number().int().nonnegative(),
    internships: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    draft: z.number().int().nonnegative(),
    closed: z.number().int().nonnegative(),
  }),
  applications: z.object({
    total: z.number().int().nonnegative(),
    selectedCount: z.number().int().nonnegative(),
    placementRate: z.number().min(0).max(100),
  }),
  preparation: z.object({
    totalTests: z.number().int().nonnegative(),
    totalAttempts: z.number().int().nonnegative(),
    totalInterviews: z.number().int().nonnegative(),
  }),
  notificationDelivery: z.object({
    totalNotifications: z.number().int().nonnegative(),
    readCount: z.number().int().nonnegative(),
    unreadCount: z.number().int().nonnegative(),
    readRate: z.number().min(0).max(100),
  }),
  systemOperations: z
    .object({
      activeUsersCount: z.number().int().nonnegative(),
      totalAuditLogs: z.number().int().nonnegative(),
      recentAuditLogs: z.array(
        z.object({
          id: z.string(),
          action: z.string(),
          entityType: z.string(),
          actorName: z.string().nullable().optional(),
          createdAt: z.string(),
        }),
      ),
    })
    .optional(),
});
export type AdminAnalyticsResponse = z.infer<typeof AdminAnalyticsResponseSchema>;

