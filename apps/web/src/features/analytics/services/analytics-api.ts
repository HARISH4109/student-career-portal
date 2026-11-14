import type {
  AdminAnalyticsResponse,
  FacultyAnalyticsResponse,
  StudentAnalyticsResponse,
} from '@career-portal/shared-types';
import { apiClient } from '@/shared/lib/api-client';

export async function getStudentAnalytics(): Promise<StudentAnalyticsResponse> {
  const res = await apiClient.get<{ data: StudentAnalyticsResponse }>('/api/v1/analytics/student');
  return res.data.data;
}

export async function getFacultyAnalytics(): Promise<FacultyAnalyticsResponse> {
  const res = await apiClient.get<{ data: FacultyAnalyticsResponse }>('/api/v1/analytics/faculty');
  return res.data.data;
}

export async function getAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  const res = await apiClient.get<{ data: AdminAnalyticsResponse }>('/api/v1/analytics/admin');
  return res.data.data;
}

