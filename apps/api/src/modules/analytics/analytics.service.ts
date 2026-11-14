import { AnalyticsRepository } from './analytics.repository';

export class AnalyticsService {
  constructor(private readonly repository = new AnalyticsRepository()) {}

  async getStudentAnalytics(userId: string) {
    return this.repository.getStudentAnalytics(userId);
  }

  async getFacultyAnalytics() {
    return this.repository.getFacultyAnalytics();
  }

  async getAdminAnalytics() {
    return this.repository.getAdminAnalytics();
  }

  async generateDailySnapshots() {
    const [facultyMetrics, adminMetrics] = await Promise.all([
      this.repository.getFacultyAnalytics(),
      this.repository.getAdminAnalytics(),
    ]);

    await Promise.all([
      this.repository.saveSnapshot('faculty_overview', facultyMetrics as unknown as Record<string, unknown>),
      this.repository.saveSnapshot('admin_overview', adminMetrics as unknown as Record<string, unknown>),
    ]);

    return { success: true, timestamp: new Date().toISOString() };
  }
}

