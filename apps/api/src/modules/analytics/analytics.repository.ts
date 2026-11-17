import { db, schema } from '@career-portal/db';
import type {
  AdminAnalyticsResponse,
  FacultyAnalyticsResponse,
  StudentAnalyticsResponse,
} from '@career-portal/shared-types';
import { and, avg, count, countDistinct, desc, eq, gt, gte, isNull, or } from 'drizzle-orm';
import { ProfileCompletionService } from '../student/profile-completion.service';

export class AnalyticsRepository {
  private profileCompletionService = new ProfileCompletionService();

  constructor(private readonly database = db) {}

  async getStudentAnalytics(userId: string): Promise<StudentAnalyticsResponse> {
    const studentProfile = await this.database.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, userId),
    });

    if (!studentProfile) {
      return {
        profileCompletionPercentage: 0,
        resumeScore: null,
        testsAttempted: 0,
        averageTestScore: 0,
        roadmapProgress: {
          hasActiveRoadmap: false,
          careerPathTitle: null,
          percentage: 0,
          completedStages: 0,
          totalStages: 0,
        },
        applicationsCount: 0,
        applicationsByStatus: {},
        interviewsCount: 0,
        selectionsCount: 0,
      };
    }

    const studentId = studentProfile.id;

    // 1. Profile Completion Percentage
    const [skillsRes, resumesRes] = await Promise.all([
      this.database
        .select({ count: count() })
        .from(schema.studentSkills)
        .where(eq(schema.studentSkills.studentId, studentId)),
      this.database
        .select({ count: count() })
        .from(schema.resumes)
        .where(eq(schema.resumes.studentId, studentId)),
    ]);

    const projectsList = Array.isArray(studentProfile.projects) ? (studentProfile.projects as unknown[]) : [];
    const certsList = Array.isArray(studentProfile.certifications) ? (studentProfile.certifications as unknown[]) : [];
    const achievementsList = Array.isArray(studentProfile.achievements) ? (studentProfile.achievements as unknown[]) : [];

    const completionResult = this.profileCompletionService.calculateCompletion({
      rollNumber: studentProfile.rollNumber,
      departmentId: studentProfile.departmentId,
      programId: studentProfile.programId,
      batchId: studentProfile.batchId,
      cgpa: studentProfile.cgpa,
      phone: null,
      bio: studentProfile.bio,
      linkedinUrl: studentProfile.linkedinUrl,
      githubUrl: studentProfile.githubUrl,
      portfolioUrl: studentProfile.portfolioUrl,
      skillsCount: skillsRes[0]?.count ?? 0,
      projectsCount: projectsList.length,
      certificationsCount: certsList.length,
      achievementsCount: achievementsList.length,
      resumeCount: resumesRes[0]?.count ?? 0,
    });
    const profileCompletionPercentage = completionResult.percentage;

    // 2. Resume ATS / Overall Score
    const latestAnalysis = await this.database
      .select({ atsScore: schema.resumeAnalyses.atsScore, overallScore: schema.resumeAnalyses.overallScore })
      .from(schema.resumeAnalyses)
      .innerJoin(schema.resumes, eq(schema.resumeAnalyses.resumeId, schema.resumes.id))
      .where(eq(schema.resumes.studentId, studentId))
      .orderBy(desc(schema.resumeAnalyses.analyzedAt))
      .limit(1);

    const resumeScore = latestAnalysis[0]?.overallScore
      ? Number(latestAnalysis[0].overallScore)
      : latestAnalysis[0]?.atsScore
        ? Number(latestAnalysis[0].atsScore)
        : null;

    // 3. Tests Attempted & Average Test Score
    const [testStats] = await this.database
      .select({
        attemptCount: count(),
        avgScore: avg(schema.mockTestAttempts.score),
      })
      .from(schema.mockTestAttempts)
      .where(
        and(
          eq(schema.mockTestAttempts.studentId, studentId),
          eq(schema.mockTestAttempts.status, 'submitted'),
        ),
      );

    const testsAttempted = testStats?.attemptCount ?? 0;
    const averageTestScore = testStats?.avgScore ? Math.round(Number(testStats.avgScore) * 10) / 10 : 0;

    // 4. Roadmap Progress
    const activeRoadmap = await this.database.query.careerRoadmaps.findFirst({
      where: and(
        eq(schema.careerRoadmaps.studentId, studentId),
        eq(schema.careerRoadmaps.status, 'active'),
      ),
    });

    let roadmapProgress = {
      hasActiveRoadmap: false,
      careerPathTitle: null as string | null,
      percentage: 0,
      completedStages: 0,
      totalStages: 0,
    };

    if (activeRoadmap) {
      let careerPathTitle: string | null = activeRoadmap.targetRole ?? null;
      if (activeRoadmap.careerPathId) {
        const pathRow = await this.database.query.careerPaths.findFirst({
          where: eq(schema.careerPaths.id, activeRoadmap.careerPathId),
        });
        if (pathRow) careerPathTitle = pathRow.title;
      }

      const stages = await this.database
        .select({ isCompleted: schema.roadmapStages.isCompleted })
        .from(schema.roadmapStages)
        .where(eq(schema.roadmapStages.roadmapId, activeRoadmap.id));

      const totalStages = stages.length;
      const completedStages = stages.filter((s) => s.isCompleted).length;
      const percentage = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

      roadmapProgress = {
        hasActiveRoadmap: true,
        careerPathTitle,
        percentage,
        completedStages,
        totalStages,
      };
    }

    // 5. Applications & Counts
    const applications = await this.database
      .select({ status: schema.opportunityApplications.status })
      .from(schema.opportunityApplications)
      .where(eq(schema.opportunityApplications.studentId, studentId));

    const applicationsCount = applications.length;
    const applicationsByStatus: Record<string, number> = {};
    let interviewsCount = 0;
    let selectionsCount = 0;

    for (const app of applications) {
      applicationsByStatus[app.status] = (applicationsByStatus[app.status] ?? 0) + 1;
      if (app.status === 'interview') interviewsCount += 1;
      if (app.status === 'selected') {
        selectionsCount += 1;
        interviewsCount += 1; // Selected implies passed interview stage
      }
    }

    return {
      profileCompletionPercentage,
      resumeScore,
      testsAttempted,
      averageTestScore,
      roadmapProgress,
      applicationsCount,
      applicationsByStatus,
      interviewsCount,
      selectionsCount,
    };
  }

  async getFacultyAnalytics(): Promise<FacultyAnalyticsResponse> {
    const now = new Date();

    // 1. Opportunities counts
    const [publishedCountRes] = await this.database
      .select({ count: count() })
      .from(schema.opportunities)
      .where(eq(schema.opportunities.status, 'published'));

    const [activeCountRes] = await this.database
      .select({ count: count() })
      .from(schema.opportunities)
      .where(
        and(
          eq(schema.opportunities.status, 'published'),
          or(isNull(schema.opportunities.applicationDeadline), gt(schema.opportunities.applicationDeadline, now)),
        ),
      );

    const opportunitiesPublished = publishedCountRes?.count ?? 0;
    const activeOpportunities = activeCountRes?.count ?? 0;

    // 2. Application Funnel
    const apps = await this.database
      .select({ status: schema.opportunityApplications.status })
      .from(schema.opportunityApplications);

    const totalApplications = apps.length;
    const funnel = {
      applied: 0,
      under_review: 0,
      shortlisted: 0,
      assessment: 0,
      interview: 0,
      selected: 0,
      rejected: 0,
    };

    for (const app of apps) {
      if (app.status in funnel) {
        funnel[app.status as keyof typeof funnel] += 1;
      }
    }

    // 2b. Unique Applicants and Placed Students
    const [uniqueApplicantsRes] = await this.database
      .select({ count: countDistinct(schema.opportunityApplications.studentId) })
      .from(schema.opportunityApplications);

    const [uniquePlacedRes] = await this.database
      .select({ count: countDistinct(schema.opportunityApplications.studentId) })
      .from(schema.opportunityApplications)
      .where(eq(schema.opportunityApplications.status, 'selected'));

    const uniqueApplicants = Number(uniqueApplicantsRes?.count ?? 0);
    const uniquePlaced = Number(uniquePlacedRes?.count ?? 0);
    const placementRate = uniqueApplicants > 0 ? Math.round((uniquePlaced / uniqueApplicants) * 100) : 0;
    const interviewClearanceRate =
      funnel.interview + funnel.selected > 0
        ? Math.round((funnel.selected / (funnel.interview + funnel.selected)) * 100)
        : 0;

    const placementStats = {
      uniqueApplicants,
      uniquePlaced,
      placementRate,
      interviewClearanceRate,
    };

    // 3. Test participation
    const [testCountRes] = await this.database.select({ count: count() }).from(schema.mockTests);
    const [attemptStatsRes] = await this.database
      .select({
        attemptCount: count(),
        avgScore: avg(schema.mockTestAttempts.score),
      })
      .from(schema.mockTestAttempts)
      .where(eq(schema.mockTestAttempts.status, 'submitted'));

    const testParticipation = {
      totalTests: testCountRes?.count ?? 0,
      totalAttempts: attemptStatsRes?.attemptCount ?? 0,
      averageScore: attemptStatsRes?.avgScore ? Math.round(Number(attemptStatsRes.avgScore) * 10) / 10 : 0,
    };

    // 4. Student readiness trends by degree course
    const cseDept = await this.database.query.departments.findFirst({
      where: eq(schema.departments.code, 'CSE'),
    });

    const programs = await this.database
      .select()
      .from(schema.academicPrograms)
      .where(
        and(
          eq(schema.academicPrograms.isActive, true),
          cseDept ? eq(schema.academicPrograms.departmentId, cseDept.id) : undefined,
        ),
      );

    const studentReadinessTrends = [];

    for (const prog of programs) {
      const [progStudentsRes] = await this.database
        .select({ count: count() })
        .from(schema.studentProfiles)
        .where(eq(schema.studentProfiles.programId, prog.id));

      const [progScoreRes] = await this.database
        .select({
          avgScore: avg(schema.mockTestAttempts.score),
        })
        .from(schema.mockTestAttempts)
        .innerJoin(schema.studentProfiles, eq(schema.mockTestAttempts.studentId, schema.studentProfiles.id))
        .where(
          and(
            eq(schema.studentProfiles.programId, prog.id),
            eq(schema.mockTestAttempts.status, 'submitted'),
          ),
        );

      const [readyStudentsRes] = await this.database
        .select({ count: count() })
        .from(schema.mockTestAttempts)
        .innerJoin(schema.studentProfiles, eq(schema.mockTestAttempts.studentId, schema.studentProfiles.id))
        .where(
          and(
            eq(schema.studentProfiles.programId, prog.id),
            eq(schema.mockTestAttempts.status, 'submitted'),
            gte(schema.mockTestAttempts.score, '70'),
          ),
        );

      studentReadinessTrends.push({
        departmentName: prog.name,
        studentCount: progStudentsRes?.count ?? 0,
        averageTestScore: progScoreRes?.avgScore ? Math.round(Number(progScoreRes.avgScore) * 10) / 10 : 0,
        readyStudentCount: readyStudentsRes?.count ?? 0,
      });
    }

    // 5. Skill Gap Trends
    const analyses = await this.database
      .select({
        gapSkills: schema.skillGapAnalyses.gapSkills,
        result: schema.skillGapAnalyses.result,
      })
      .from(schema.skillGapAnalyses)
      .orderBy(desc(schema.skillGapAnalyses.createdAt))
      .limit(50);

    const missingSkillCounts: Record<string, number> = {};
    for (const analysis of analyses) {
      const rawGaps =
        (analysis.gapSkills as Array<{ name?: string; skillName?: string }> | null) ??
        ((analysis.result as { skills?: Array<{ name?: string; skillName?: string; status?: string }> })?.skills?.filter((s) => s.status !== 'matched') ?? []);
      for (const item of rawGaps) {
        const name = ('name' in item && item.name) || ('skillName' in item && item.skillName);
        if (name) {
          missingSkillCounts[name] = (missingSkillCounts[name] ?? 0) + 1;
        }
      }
    }

    const skillGapTrends = Object.entries(missingSkillCounts)
      .map(([skillName, missingCount]) => ({ skillName, missingCount }))
      .sort((a, b) => b.missingCount - a.missingCount)
      .slice(0, 10);

    return {
      opportunitiesPublished,
      activeOpportunities,
      totalApplications,
      applicationFunnel: funnel,
      testParticipation,
      studentReadinessTrends,
      skillGapTrends,
      placementStats,
    };
  }

  async getAdminAnalytics(): Promise<AdminAnalyticsResponse> {
    // 1. Users Breakdown
    const [totalUsersRes] = await this.database.select({ count: count() }).from(schema.users);
    const usersWithRoles = await this.database
      .select({ roleName: schema.roles.name })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id));

    let students = 0;
    let faculty = 0;
    let admins = 0;

    for (const u of usersWithRoles) {
      if (u.roleName === 'STUDENT') students += 1;
      else if (u.roleName === 'PLACEMENT_FACULTY') faculty += 1;
      else if (u.roleName === 'ADMIN') admins += 1;
    }

    const users = {
      total: totalUsersRes?.count ?? 0,
      students,
      faculty,
      admins,
    };

    // 2. Academic Programs Breakdown (Single-Department context)
    const programs = await this.database
      .select()
      .from(schema.academicPrograms)
      .where(eq(schema.academicPrograms.isActive, true));

    const programBreakdown = [];
    for (const prog of programs) {
      const [pCount] = await this.database
        .select({ count: count() })
        .from(schema.studentProfiles)
        .where(eq(schema.studentProfiles.programId, prog.id));

      programBreakdown.push({
        programId: prog.id,
        programName: prog.name,
        degreeLevel: prog.degreeLevel,
        studentCount: pCount?.count ?? 0,
      });
    }

    // 2b. Cross-Department Placement & Readiness Benchmarks
    const depts = await this.database.select().from(schema.departments);
    const departmentBreakdown = [];
    for (const dept of depts) {
      const [deptCount] = await this.database
        .select({ count: count() })
        .from(schema.studentProfiles)
        .where(eq(schema.studentProfiles.departmentId, dept.id));

      const [placedRes] = await this.database
        .select({ count: countDistinct(schema.opportunityApplications.studentId) })
        .from(schema.opportunityApplications)
        .innerJoin(schema.studentProfiles, eq(schema.opportunityApplications.studentId, schema.studentProfiles.id))
        .where(
          and(
            eq(schema.studentProfiles.departmentId, dept.id),
            eq(schema.opportunityApplications.status, 'selected'),
          ),
        );

      const [deptScoreRes] = await this.database
        .select({
          avgScore: avg(schema.mockTestAttempts.score),
        })
        .from(schema.mockTestAttempts)
        .innerJoin(schema.studentProfiles, eq(schema.mockTestAttempts.studentId, schema.studentProfiles.id))
        .where(
          and(
            eq(schema.studentProfiles.departmentId, dept.id),
            eq(schema.mockTestAttempts.status, 'submitted'),
          ),
        );

      const [readyStudentsRes] = await this.database
        .select({ count: countDistinct(schema.mockTestAttempts.studentId) })
        .from(schema.mockTestAttempts)
        .innerJoin(schema.studentProfiles, eq(schema.mockTestAttempts.studentId, schema.studentProfiles.id))
        .where(
          and(
            eq(schema.studentProfiles.departmentId, dept.id),
            eq(schema.mockTestAttempts.status, 'submitted'),
            gte(schema.mockTestAttempts.score, '70'),
          ),
        );

      const studentCount = deptCount?.count ?? 0;
      const placedCount = Number(placedRes?.count ?? 0);
      const placementRate = studentCount > 0 ? Math.round((placedCount / studentCount) * 100) : 0;
      const averageScore = deptScoreRes?.avgScore ? Math.round(Number(deptScoreRes.avgScore) * 10) / 10 : 0;
      const readyStudentCount = Number(readyStudentsRes?.count ?? 0);

      departmentBreakdown.push({
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        studentCount,
        placedCount,
        placementRate,
        averageScore,
        readyStudentCount,
      });
    }

    // 3. Batch Breakdown
    const batches = await this.database.select().from(schema.batches);
    const batchBreakdown = [];
    for (const batch of batches) {
      const [batchCount] = await this.database
        .select({ count: count() })
        .from(schema.studentProfiles)
        .where(eq(schema.studentProfiles.batchId, batch.id));

      batchBreakdown.push({
        batchId: batch.id,
        graduationYear: batch.graduationYear,
        studentCount: batchCount?.count ?? 0,
      });
    }

    // 4. Opportunities Breakdown
    const opps = await this.database
      .select({
        type: schema.opportunities.type,
        status: schema.opportunities.status,
      })
      .from(schema.opportunities);

    let jobs = 0;
    let internships = 0;
    let published = 0;
    let draft = 0;
    let closed = 0;

    for (const opp of opps) {
      if (opp.type === 'job') jobs += 1;
      if (opp.type === 'internship') internships += 1;

      if (opp.status === 'published') published += 1;
      else if (opp.status === 'draft') draft += 1;
      else if (opp.status === 'closed' || opp.status === 'expired') closed += 1;
    }

    const opportunities = {
      total: opps.length,
      jobs,
      internships,
      published,
      draft,
      closed,
    };

    // 5. Applications & Placement Rate
    const [totalAppsRes] = await this.database.select({ count: count() }).from(schema.opportunityApplications);
    const [selectedAppsRes] = await this.database
      .select({ count: count() })
      .from(schema.opportunityApplications)
      .where(eq(schema.opportunityApplications.status, 'selected'));

    const totalApps = totalAppsRes?.count ?? 0;
    const selectedCount = selectedAppsRes?.count ?? 0;
    const placementRate = students > 0 ? Math.round((selectedCount / students) * 1000) / 10 : 0;

    const applications = {
      total: totalApps,
      selectedCount,
      placementRate,
    };

    // 6. Preparation Metrics
    const [totalTestsRes] = await this.database.select({ count: count() }).from(schema.mockTests);
    const [totalAttemptsRes] = await this.database
      .select({ count: count() })
      .from(schema.mockTestAttempts)
      .where(eq(schema.mockTestAttempts.status, 'submitted'));
    const [totalInterviewsRes] = await this.database
      .select({ count: count() })
      .from(schema.mockInterviews);

    const preparation = {
      totalTests: totalTestsRes?.count ?? 0,
      totalAttempts: totalAttemptsRes?.count ?? 0,
      totalInterviews: totalInterviewsRes?.count ?? 0,
    };

    // 7. Notification Delivery Metrics
    const [totalNotifsRes] = await this.database.select({ count: count() }).from(schema.notifications);
    const [readNotifsRes] = await this.database
      .select({ count: count() })
      .from(schema.notifications)
      .where(eq(schema.notifications.isRead, true));

    const totalNotifications = totalNotifsRes?.count ?? 0;
    const readCount = readNotifsRes?.count ?? 0;
    const unreadCount = totalNotifications - readCount;
    const readRate = totalNotifications > 0 ? Math.round((readCount / totalNotifications) * 1000) / 10 : 0;

    const notificationDelivery = {
      totalNotifications,
      readCount,
      unreadCount,
      readRate,
    };

    // 8. System Operations & Audit Telemetry
    const [activeUsersRes] = await this.database
      .select({ count: count() })
      .from(schema.users)
      .where(eq(schema.users.isActive, true));

    const [totalAuditLogsRes] = await this.database
      .select({ count: count() })
      .from(schema.auditLogs);

    const rawRecentAuditLogs = await this.database
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        entityType: schema.auditLogs.entityType,
        createdAt: schema.auditLogs.createdAt,
        actorName: schema.users.fullName,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(6);

    const systemOperations = {
      activeUsersCount: activeUsersRes?.count ?? 0,
      totalAuditLogs: totalAuditLogsRes?.count ?? 0,
      recentAuditLogs: rawRecentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        actorName: log.actorName,
        createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
      })),
    };

    return {
      users,
      departmentBreakdown,
      programBreakdown,
      batchBreakdown,
      opportunities,
      applications,
      preparation,
      notificationDelivery,
      systemOperations,
    };
  }

  async saveSnapshot(metricType: string, metricData: Record<string, unknown>, scope = 'global' as const) {
    const today = new Date().toISOString().slice(0, 10);
    const [snapshot] = await this.database
      .insert(schema.analyticsSnapshots)
      .values({
        snapshotDate: today,
        metricType,
        scope,
        metricData,
      })
      .returning();

    return snapshot;
  }
}
