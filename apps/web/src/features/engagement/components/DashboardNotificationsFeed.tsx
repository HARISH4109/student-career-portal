import type { NoticeResponse, NotificationResponse } from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Pin,
  Route,
  Sparkles,
  Tag,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth/use-auth';
import { safeHref } from '@/shared/lib/safe-url';
import { getStudentNotices } from '../services/notices-api';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from '../services/notifications-api';

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'placement':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'academic':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'event':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
    default:
      return 'bg-muted/40 text-muted-foreground border-border';
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'application_update':
      return <FileText className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />;
    case 'new_opportunity':
    case 'opportunity_deadline':
      return <Briefcase className="h-4 w-4 text-primary" />;
    case 'test_assigned':
    case 'test_result_ready':
      return <BookOpen className="h-4 w-4 text-purple-400" />;
    case 'roadmap_reminder':
      return <Route className="h-4 w-4 text-amber-700 dark:text-amber-400" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

export function DashboardNotificationsFeed(): React.JSX.Element {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'notices' | 'notifications'>('notices');

  // Notices query
  const { data: noticesData, isLoading: noticesLoading } = useQuery({
    queryKey: ['notices', 'dashboard-feed'],
    queryFn: () => getStudentNotices({ page: 1, pageSize: 6 }),
  });

  // Notifications query
  const { data: notificationsData, isLoading: notifsLoading } = useQuery({
    queryKey: ['notifications', 'dashboard-feed'],
    queryFn: () => getNotifications({ page: 1, pageSize: 6 }),
    enabled: Boolean(user?.id),
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
    enabled: Boolean(user?.id),
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notices: NoticeResponse[] = noticesData?.data ?? [];
  const notifications: NotificationResponse[] = notificationsData?.data ?? [];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header with Feed Switching */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-6 py-4 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-normal text-foreground">Department Activity & Notices</h3>
            <p className="text-xs text-muted-foreground">Live announcements, recruitment updates, and alerts</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Feed Tabs */}
          <div className="flex bg-muted/40 border border-border/80 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('notices'); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'notices'
                  ? 'bg-card shadow-xs text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Campus Notices</span>
              {notices.length > 0 && (
                <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] rounded-full font-bold font-mono">
                  {notices.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('notifications'); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-card shadow-xs text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Direct Alerts</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] rounded-full font-semibold font-mono">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <Link
            to="/dashboard/notices"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 pl-2"
          >
            <span>Notice Board</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'notices' ? (
          noticesLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading department notices…</div>
          ) : notices.length === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40 stroke-[1.5]" />
              <p className="mt-2 text-xs font-semibold text-foreground">No active notices right now</p>
              <p className="text-[11px] text-muted-foreground">
                Placement drives, hackathons, and announcements will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.slice(0, 4).map((notice) => (
                <div
                  key={notice.id}
                  className={`group rounded-lg border p-4 transition-colors hover:border-primary/40 flex flex-col justify-between ${
                    notice.isPinned
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-card/60'
                  }`}
                >
                  <div>
                    {/* Poster thumbnail banner if present */}
                    {notice.posterUrl && (
                      <div className="relative mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-lg max-h-36 bg-background border-b border-border">
                        <img
                          src={notice.posterUrl}
                          alt={notice.title}
                          className="w-full h-32 object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Metadata Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {notice.isPinned && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 font-mono">
                            <Pin className="h-2.5 w-2.5 fill-amber-400" /> Pinned
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${getCategoryColor(
                            notice.category,
                          )}`}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {notice.category.toUpperCase()}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                        <Calendar className="h-3 w-3" />
                        {formatDate(notice.publishedAt || notice.createdAt)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {notice.title}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notice.content}
                    </p>
                  </div>

                  {/* Actions / CTA Link */}
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                    {safeHref(notice.actionUrl || notice.linkUrl) ? (
                      <a
                        href={safeHref(notice.actionUrl || notice.linkUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 hover:underline"
                      >
                        <span>Register / Details</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link
                        to="/dashboard/notices"
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Read full notice
                      </Link>
                    )}
                    <span className="text-[10px] text-muted-foreground/70 font-mono tracking-normal">
                      Department Notice
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : notifsLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Loading direct alerts…</div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700 dark:text-emerald-400 stroke-[1.5]" />
            <p className="mt-2 text-xs font-semibold text-foreground">All caught up</p>
            <p className="text-[11px] text-muted-foreground">No unread alerts or notifications.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`py-3 flex items-start gap-3 transition-colors hover:bg-muted/20 ${
                  !notif.isRead ? 'bg-primary/5 -mx-6 px-6' : ''
                }`}
              >
                <div className="p-2 bg-muted/40 rounded-lg shrink-0 mt-0.5 border border-border/60">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs ${!notif.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{notif.message}</p>
                </div>
                {!notif.isRead && (
                  <button
                    onClick={() => { markReadMutation.mutate(notif.id); }}
                    className="shrink-0 p-1 text-muted-foreground hover:text-primary rounded cursor-pointer"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer link for mobile */}
      <div className="border-t border-border px-6 py-2.5 bg-muted/20 sm:hidden">
        <Link
          to="/dashboard/notices"
          className="flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
        >
          <span>View All Campus Notices</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
