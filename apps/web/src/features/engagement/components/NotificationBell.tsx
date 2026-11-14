import type { NotificationResponse } from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  BookOpen,
  Briefcase,
  CheckCheck,
  Clock,
  FileText,
  Route,
  Settings,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useNotificationSocket } from '../hooks/use-socket';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notifications-api';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

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

function getNotificationIcon(type: string) {
  switch (type) {
    case 'application_update':
      return <FileText className="h-4 w-4 text-emerald-600" />;
    case 'new_opportunity':
    case 'opportunity_deadline':
      return <Briefcase className="h-4 w-4 text-blue-600" />;
    case 'test_assigned':
    case 'test_result_ready':
      return <BookOpen className="h-4 w-4 text-purple-600" />;
    case 'roadmap_reminder':
      return <Route className="h-4 w-4 text-amber-600" />;
    default:
      return <Bell className="h-4 w-4 text-slate-600" />;
  }
}

export function NotificationBell(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 60_000,
  });

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => getNotifications({ page: 1, pageSize: 20 }),
    enabled: isOpen,
  });

  // Real-time socket event handler
  const handleNewNotification = useCallback(
    (_notif: NotificationResponse) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    [queryClient],
  );

  useNotificationSocket(handleNewNotification);

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notif: NotificationResponse) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    setIsOpen(false);
    if (notif.actionUrl) {
      void navigate(notif.actionUrl);
    }
  };

  const notifications = notificationsData?.data ?? [];

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        aria-label="Open notifications"
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsOpen(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        markAllMutation.mutate();
                      }}
                      title="Mark all as read"
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Mark all read</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setPrefsOpen(true);
                    }}
                    title="Notification settings"
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {isLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading notifications…</div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Bell className="h-8 w-8 mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-500">All caught up!</p>
                    <p className="text-xs text-slate-400">You have no new notifications.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        handleNotificationClick(notif);
                      }}
                      className={`flex items-start gap-3 p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors relative ${
                        !notif.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="mt-0.5 p-2 rounded-xl bg-slate-100 flex-shrink-0">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-baseline justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${!notif.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 flex-shrink-0">
                            <Clock className="h-2.5 w-2.5" />
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <div className="mt-2 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={prefsOpen}
        onClose={() => {
          setPrefsOpen(false);
        }}
      />
    </div>
  );
}
