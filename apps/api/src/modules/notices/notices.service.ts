import { db, schema } from '@career-portal/db';
import type {
  CreateNoticeInput,
  NoticeQueryInput,
  UpdateNoticeInput,
} from '@career-portal/shared-types';
import { eq } from 'drizzle-orm';
import { auditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NoticesRepository } from './notices.repository';

export class NoticesService {
  constructor(
    private readonly repository = new NoticesRepository(),
    private readonly notificationsService = new NotificationsService(),
    private readonly database = db,
  ) {}

  async getStudentNotices(
    userId: string,
    role: string,
    query: NoticeQueryInput,
  ) {
    let departmentId: string | null = null;
    let batchId: string | null = null;

    if (role === 'STUDENT') {
      const studentProfile = await this.database.query.studentProfiles.findFirst({
        where: eq(schema.studentProfiles.userId, userId),
      });
      if (studentProfile) {
        departmentId = studentProfile.departmentId;
        batchId = studentProfile.batchId;
      }
    }

    return this.repository.findTargetedNotices(
      { role, departmentId, batchId },
      query,
    );
  }

  async getStaffNotices(query: NoticeQueryInput) {
    return this.repository.findAllNotices(query);
  }

  async getNoticeById(id: string) {
    const notice = await this.repository.findById(id);
    if (!notice) {
      throw new Error('Notice not found');
    }
    return notice;
  }

  async createNotice(userId: string, data: CreateNoticeInput) {
    const notice = await this.repository.create({
      ...data,
      postedBy: userId,
    });
    if (!notice) {
      throw new Error('Failed to create notice');
    }

    const isPublishedNow =
      notice.status === 'published' &&
      new Date(notice.publishedAt).getTime() <= Date.now();

    if (isPublishedNow) {
      void this.notificationsService.notifyNoticePublished({
        noticeId: notice.id,
        title: notice.title,
        targetAudience: notice.targetAudience as Record<string, unknown>,
        targetDepartmentId: notice.targetDepartmentId,
        targetBatchId: notice.targetBatchId,
      });
    }

    void auditService.log({
      userId,
      action: isPublishedNow ? 'notice.published' : 'notice.created',
      entityType: 'notice',
      entityId: notice.id,
      metadata: { title: notice.title, status: notice.status },
    });

    return notice;
  }

  async updateNotice(id: string, data: UpdateNoticeInput) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Notice not found');
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new Error('Notice could not be updated');
    }

    const becamePublished =
      existing.status !== 'published' &&
      updated.status === 'published' &&
      new Date(updated.publishedAt).getTime() <= Date.now();

    if (becamePublished) {
      void this.notificationsService.notifyNoticePublished({
        noticeId: updated.id,
        title: updated.title,
        targetAudience: updated.targetAudience as Record<string, unknown>,
        targetDepartmentId: updated.targetDepartmentId,
        targetBatchId: updated.targetBatchId,
      });
    }

    return updated;
  }

  async pinNotice(id: string, isPinned: boolean) {
    const updated = await this.repository.setPin(id, isPinned);
    if (!updated) throw new Error('Notice not found');
    void auditService.log({
      action: isPinned ? 'notice.pinned' : 'notice.unpinned',
      entityType: 'notice',
      entityId: id,
    });
    return updated;
  }

  async expireNotice(id: string) {
    const updated = await this.repository.expire(id);
    if (!updated) throw new Error('Notice not found');
    void auditService.log({
      action: 'notice.expired',
      entityType: 'notice',
      entityId: id,
    });
    return updated;
  }

  async publishNotice(id: string) {
    const updated = await this.repository.publish(id);
    if (!updated) throw new Error('Notice not found');

    void this.notificationsService.notifyNoticePublished({
      noticeId: updated.id,
      title: updated.title,
      targetAudience: updated.targetAudience as Record<string, unknown>,
      targetDepartmentId: updated.targetDepartmentId,
      targetBatchId: updated.targetBatchId,
    });

    void auditService.log({
      action: 'notice.published',
      entityType: 'notice',
      entityId: id,
      metadata: { title: updated.title },
    });

    return updated;
  }

  async processScheduledNotices(): Promise<number> {
    const dueNotices = await this.repository.findScheduledNoticesDue();
    for (const notice of dueNotices) {
      await this.publishNotice(notice.id);
    }
    return dueNotices.length;
  }
}
