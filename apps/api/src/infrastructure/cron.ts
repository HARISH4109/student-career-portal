import { db, schema } from '@career-portal/db';
import cron from 'node-cron';
import { and, eq, gt, lte, notInArray } from 'drizzle-orm';
import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { NoticesService } from '@/modules/notices/notices.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { logger } from './logger';

type CronJob = ReturnType<typeof cron.schedule>;

export class CronManager {
  private noticesService = new NoticesService();
  private notificationsService = new NotificationsService();
  private analyticsService = new AnalyticsService();
  private jobs: CronJob[] = [];

  startAll(): void {
    logger.info('Initializing in-process background cron scheduler');

    // 1. Process scheduled notices every 15 minutes
    const noticesJob = cron.schedule('*/15 * * * *', () => {
      void this.processScheduledNotices();
    });
    this.jobs.push(noticesJob);

    // 2. Scan opportunity deadlines every 15 minutes
    const deadlinesJob = cron.schedule('*/15 * * * *', () => {
      void this.processApproachingDeadlines();
    });
    this.jobs.push(deadlinesJob);

    // 3. Scan roadmap inactivity daily at 09:00
    const roadmapJob = cron.schedule('0 9 * * *', () => {
      void this.processRoadmapReminders();
    });
    this.jobs.push(roadmapJob);

    // 4. Generate analytics snapshot daily at midnight
    const snapshotJob = cron.schedule('0 0 * * *', () => {
      void this.generateSnapshots();
    });
    this.jobs.push(snapshotJob);

    // Trigger immediate checks on startup (after 3 seconds)
    setTimeout(() => {
      void this.processApproachingDeadlines();
      void this.processScheduledNotices();
    }, 3000);
  }

  stopAll(): void {
    for (const job of this.jobs) {
      void job.stop();
    }
    this.jobs = [];
    logger.info('Background cron scheduler stopped');
  }

  async processScheduledNotices(): Promise<number> {
    try {
      const publishedCount = await this.noticesService.processScheduledNotices();
      if (publishedCount > 0) {
        logger.info({ publishedCount }, 'Published scheduled notices');
      }
      return publishedCount;
    } catch (err) {
      logger.error({ err }, 'Error processing scheduled notices');
      return 0;
    }
  }

  async processApproachingDeadlines(): Promise<number> {
    try {
      const now = new Date();
      // Scan opportunities expiring within 72 hours (3 days)
      const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      // Find published opportunities expiring within the next 72 hours
      const opportunities = await db
        .select({
          id: schema.opportunities.id,
          title: schema.opportunities.title,
          applicationDeadline: schema.opportunities.applicationDeadline,
          postedBy: schema.opportunities.postedBy,
        })
        .from(schema.opportunities)
        .where(
          and(
            eq(schema.opportunities.status, 'published'),
            gt(schema.opportunities.applicationDeadline, now),
            lte(schema.opportunities.applicationDeadline, in72Hours),
          ),
        );

      let notificationsSent = 0;

      for (const opp of opportunities) {
        if (!opp.applicationDeadline) continue;
        const hoursLeft = Math.max(
          1,
          Math.round((new Date(opp.applicationDeadline).getTime() - now.getTime()) / (1000 * 60 * 60)),
        );

        // 1. Notify faculty owner who created/posted this opportunity
        if (opp.postedBy) {
          const existingFacultyNotifs = await db
            .select({ id: schema.notifications.id })
            .from(schema.notifications)
            .where(
              and(
                eq(schema.notifications.userId, opp.postedBy),
                eq(schema.notifications.type, 'opportunity_deadline'),
                eq(schema.notifications.actionUrl, '/dashboard/opportunities/manage'),
                gt(schema.notifications.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
              ),
            )
            .limit(1);

          if (existingFacultyNotifs.length === 0) {
            await this.notificationsService.sendNotification(opp.postedBy, {
              type: 'opportunity_deadline',
              title: `Opportunity Deadline Approaching: ${opp.title}`,
              message: `The application deadline for your posted opportunity "${opp.title}" expires in ${hoursLeft} hours. Please review submitted applications and shortlist candidates.`,
              actionUrl: '/dashboard/opportunities/manage',
              sendEmailNotification: true,
            });
            notificationsSent += 1;
          }
        }

        // 2. Notify institutional administrators
        const adminUsers = await db
          .select({ userId: schema.userRoles.userId })
          .from(schema.userRoles)
          .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
          .where(eq(schema.roles.name, 'ADMIN'));

        for (const admin of adminUsers) {
          if (admin.userId === opp.postedBy) continue; // Already notified as owner

          const existingAdminNotifs = await db
            .select({ id: schema.notifications.id })
            .from(schema.notifications)
            .where(
              and(
                eq(schema.notifications.userId, admin.userId),
                eq(schema.notifications.type, 'opportunity_deadline'),
                eq(schema.notifications.actionUrl, `/dashboard/opportunities/${opp.id}`),
                gt(schema.notifications.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
              ),
            )
            .limit(1);

          if (existingAdminNotifs.length === 0) {
            await this.notificationsService.sendNotification(admin.userId, {
              type: 'opportunity_deadline',
              title: `Placement Alert: Opportunity Closing Soon (${opp.title})`,
              message: `Application deadline for "${opp.title}" expires in ${hoursLeft} hours across the institution.`,
              actionUrl: `/dashboard/opportunities/${opp.id}`,
              sendEmailNotification: true,
            });
            notificationsSent += 1;
          }
        }

        // 3. Find students who haven't applied to this opportunity
        const appliedStudents = await db
          .select({ studentId: schema.opportunityApplications.studentId })
          .from(schema.opportunityApplications)
          .where(eq(schema.opportunityApplications.opportunityId, opp.id));

        const appliedStudentIds = appliedStudents.map((a) => a.studentId);

        const unappliedStudentsQuery = db
          .select({
            userId: schema.studentProfiles.userId,
          })
          .from(schema.studentProfiles);

        const unappliedStudents =
          appliedStudentIds.length > 0
            ? await unappliedStudentsQuery.where(
                notInArray(schema.studentProfiles.id, appliedStudentIds),
              )
            : await unappliedStudentsQuery;

        for (const student of unappliedStudents) {
          // Deduplicate: avoid spamming if deadline alert was sent within the last 24 hours
          const existingNotifs = await db
            .select({ id: schema.notifications.id })
            .from(schema.notifications)
            .where(
              and(
                eq(schema.notifications.userId, student.userId),
                eq(schema.notifications.type, 'opportunity_deadline'),
                eq(schema.notifications.actionUrl, `/dashboard/opportunities/${opp.id}`),
                gt(schema.notifications.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
              ),
            )
            .limit(1);

          if (existingNotifs.length > 0) continue;

          await this.notificationsService.notifyOpportunityDeadlineApproaching({
            studentUserId: student.userId,
            opportunityTitle: opp.title,
            opportunityId: opp.id,
            hoursLeft,
          });
          notificationsSent += 1;
        }
      }

      if (notificationsSent > 0) {
        logger.info({ notificationsSent }, 'Sent opportunity deadline notifications');
      }
      return notificationsSent;
    } catch (err) {
      logger.error({ err }, 'Error processing approaching deadlines');
      return 0;
    }
  }

  async processRoadmapReminders(): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Find active roadmaps that haven't been updated in 7+ days
      const activeRoadmaps = await db
        .select({
          roadmapId: schema.careerRoadmaps.id,
          studentId: schema.careerRoadmaps.studentId,
          userId: schema.studentProfiles.userId,
          careerTitle: schema.careerPaths.title,
        })
        .from(schema.careerRoadmaps)
        .innerJoin(
          schema.studentProfiles,
          eq(schema.careerRoadmaps.studentId, schema.studentProfiles.id),
        )
        .innerJoin(
          schema.careerPaths,
          eq(schema.careerRoadmaps.careerPathId, schema.careerPaths.id),
        )
        .where(
          and(
            eq(schema.careerRoadmaps.status, 'active'),
            lte(schema.careerRoadmaps.updatedAt, sevenDaysAgo),
          ),
        );

      let remindersSent = 0;
      for (const roadmap of activeRoadmaps) {
        await this.notificationsService.notifyRoadmapReminder({
          studentUserId: roadmap.userId,
          roadmapTitle: roadmap.careerTitle,
        });
        remindersSent += 1;
      }

      if (remindersSent > 0) {
        logger.info({ remindersSent }, 'Sent roadmap inactivity reminders');
      }
      return remindersSent;
    } catch (err) {
      logger.error({ err }, 'Error processing roadmap reminders');
      return 0;
    }
  }

  async generateSnapshots() {
    try {
      await this.analyticsService.generateDailySnapshots();
      logger.info('Daily analytics snapshots generated successfully');
    } catch (err) {
      logger.error({ err }, 'Error generating daily analytics snapshots');
    }
  }

  async runAllNow(): Promise<{
    publishedNotices: number;
    deadlinesSent: number;
    remindersSent: number;
  }> {
    const publishedNotices = await this.processScheduledNotices();
    const deadlinesSent = await this.processApproachingDeadlines();
    const remindersSent = await this.processRoadmapReminders();
    await this.generateSnapshots();
    return { publishedNotices, deadlinesSent, remindersSent };
  }
}

export const cronManager = new CronManager();
