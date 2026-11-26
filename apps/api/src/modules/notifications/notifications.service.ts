import { db, schema } from '@career-portal/db';
import type {
  NotificationQueryInput,
  NotificationType,
  UpdateNotificationPreferencesInput,
} from '@career-portal/shared-types';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/infrastructure/email';
import { logger } from '@/infrastructure/logger';
import { emitNotificationToUser } from '@/infrastructure/socket';
import { NotificationsRepository } from './notifications.repository';

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeEmailActionUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}

export class NotificationsService {
  constructor(
    private readonly repository = new NotificationsRepository(),
    private readonly database = db,
  ) {}

  async getUserNotifications(userId: string, query: NotificationQueryInput) {
    return this.repository.findNotificationsByUser(userId, query);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string, userId: string) {
    const updated = await this.repository.markAsRead(notificationId, userId);
    if (!updated) {
      throw new Error('Notification not found or unauthorized');
    }
    return updated;
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.repository.markAllAsRead(userId);
  }

  async getUserPreferences(userId: string) {
    return this.repository.getPreferences(userId);
  }

  async updateUserPreferences(
    userId: string,
    data: UpdateNotificationPreferencesInput,
  ) {
    return this.repository.updatePreferences(userId, data);
  }

  async sendNotification(
    userId: string,
    params: {
      type: NotificationType;
      title: string;
      message: string;
      actionUrl?: string | null;
      sendEmailNotification?: boolean;
    },
  ) {
    try {
      const preferences = await this.repository.getPreferences(userId);
      const mutedTypes = (preferences?.mutedTypes as string[] | undefined) ?? [];

      if (mutedTypes.includes(params.type)) {
        logger.debug({ userId, type: params.type }, 'Notification suppressed: user muted this type');
        return null;
      }

      let createdNotification = null;
      if (preferences?.pushEnabled ?? true) {
        createdNotification = await this.repository.create({
          userId,
          type: params.type,
          title: params.title,
          message: params.message,
          actionUrl: params.actionUrl,
        });

        emitNotificationToUser(userId, createdNotification);
      }

      if ((preferences?.emailEnabled ?? true) && params.sendEmailNotification) {
        const user = await this.database.query.users.findFirst({
          where: eq(schema.users.id, userId),
        });

        if (user?.email) {
          const safeActionUrl = sanitizeEmailActionUrl(params.actionUrl);
          void sendEmail({
            to: user.email,
            subject: params.title,
            text: `${params.message}\n\nView details: ${safeActionUrl ?? 'Career Portal'}`,
            html: `<h3>${escapeHtml(params.title)}</h3><p>${escapeHtml(params.message)}</p>${
              safeActionUrl
                ? `<p><a href="${escapeHtml(safeActionUrl)}">Click here to view</a></p>`
                : ''
            }`,
          });
        }
      }

      return createdNotification;
    } catch (err) {
      logger.error({ err, userId, type: params.type }, 'Failed to deliver notification');
      return null;
    }
  }

  async notifyApplicationStatusChanged(params: {
    studentUserId: string;
    opportunityTitle: string;
    newStatus: string;
    applicationId: string;
  }) {
    const formattedStatus = params.newStatus.replace('_', ' ').toUpperCase();
    return this.sendNotification(params.studentUserId, {
      type: 'application_update',
      title: `Application Status Updated: ${params.opportunityTitle}`,
      message: `Your application status for "${params.opportunityTitle}" is now ${formattedStatus}.`,
      actionUrl: `/dashboard/applications`,
      sendEmailNotification: true,
    });
  }

  async notifyNewOpportunity(params: {
    opportunityId: string;
    title: string;
    companyName: string;
    targetUserIds: string[];
  }) {
    const promises = params.targetUserIds.map((userId) =>
      this.sendNotification(userId, {
        type: 'new_opportunity',
        title: `New Opportunity: ${params.title}`,
        message: `${params.companyName} has posted a new opportunity: ${params.title}. Check your eligibility and apply!`,
        actionUrl: `/dashboard/opportunities/${params.opportunityId}`,
        sendEmailNotification: false,
      }),
    );
    await Promise.all(promises);
  }

  async notifyNoticePublished(params: {
    noticeId: string;
    title: string;
    targetAudience: Record<string, unknown> | null;
    targetDepartmentId?: string | null;
    targetBatchId?: string | null;
  }) {
    const recipientUserIds = await this.repository.findTargetedUserIds(
      params.targetAudience,
      params.targetDepartmentId,
      params.targetBatchId,
    );

    const promises = recipientUserIds.map((userId) =>
      this.sendNotification(userId, {
        type: 'notice_published',
        title: `Notice: ${params.title}`,
        message: `A new notice has been published: "${params.title}".`,
        actionUrl: `/dashboard/notices`,
        sendEmailNotification: false,
      }),
    );
    await Promise.all(promises);
  }

  async notifyTestResultReady(params: {
    studentUserId: string;
    testTitle: string;
    score: number;
    attemptId: string;
  }) {
    return this.sendNotification(params.studentUserId, {
      type: 'test_result_ready',
      title: `Test Results Available: ${params.testTitle}`,
      message: `You completed "${params.testTitle}" with a score of ${params.score}%. Review your answer breakdown now.`,
      actionUrl: `/dashboard/preparation/attempts/${params.attemptId}/result`,
      sendEmailNotification: false,
    });
  }

  async notifyTestAssigned(params: {
    studentUserIds: string[];
    testTitle: string;
    testId: string;
  }) {
    const promises = params.studentUserIds.map((userId) =>
      this.sendNotification(userId, {
        type: 'test_assigned',
        title: `New Practice Test: ${params.testTitle}`,
        message: `A new test "${params.testTitle}" is available for practice.`,
        actionUrl: `/dashboard/preparation/tests/${params.testId}/take`,
        sendEmailNotification: false,
      }),
    );
    await Promise.all(promises);
  }

  async notifyOpportunityDeadlineApproaching(params: {
    studentUserId: string;
    opportunityTitle: string;
    opportunityId: string;
    hoursLeft: number;
  }) {
    return this.sendNotification(params.studentUserId, {
      type: 'opportunity_deadline',
      title: `Deadline Approaching: ${params.opportunityTitle}`,
      message: `The deadline for "${params.opportunityTitle}" is in ${params.hoursLeft} hours. Don't miss out!`,
      actionUrl: `/dashboard/opportunities/${params.opportunityId}`,
      sendEmailNotification: true,
    });
  }

  async notifyRoadmapReminder(params: {
    studentUserId: string;
    roadmapTitle: string;
  }) {
    return this.sendNotification(params.studentUserId, {
      type: 'roadmap_reminder',
      title: `Keep up your progress: ${params.roadmapTitle}`,
      message: `You haven't updated your career roadmap for a week. Take a step toward completing your current stage!`,
      actionUrl: `/dashboard/roadmap`,
      sendEmailNotification: false,
    });
  }
}

