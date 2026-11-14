import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, Mail, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notifications-api';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  application_update: { label: 'Application Updates', desc: 'Status updates on your job & internship applications' },
  new_opportunity: { label: 'New Opportunities', desc: 'When new job/internship matching your profile is published' },
  notice_published: { label: 'Notice Board Announcements', desc: 'Department, academic, or campus notices' },
  opportunity_deadline: { label: 'Deadline Alerts', desc: 'Reminders when opportunity deadlines approach within 48h' },
  test_assigned: { label: 'Test Assignments', desc: 'When new practice mock tests are assigned to you' },
  test_result_ready: { label: 'Test Results', desc: 'Instant score reports and feedback on submitted tests' },
  roadmap_reminder: { label: 'Roadmap Inactivity Reminders', desc: 'Gentle nudges to keep up with your career roadmap' },
};

export function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps): React.JSX.Element | null {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
    enabled: isOpen,
  });

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [mutedTypes, setMutedTypes] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (preferences) {
      setEmailEnabled(preferences.emailEnabled);
      setPushEnabled(preferences.pushEnabled);
      setMutedTypes(preferences.mutedTypes);
    }
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 800);
    },
  });

  const toggleMuted = (type: string) => {
    setMutedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleSave = () => {
    mutation.mutate({
      emailEnabled,
      pushEnabled,
      mutedTypes,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
                <p className="text-xs text-slate-500">Configure how and when you want to be notified</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading settings…</div>
            ) : (
              <>
                {/* Channels */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Delivery Channels
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={pushEnabled}
                        onChange={(e) => { setEmailEnabled(e.target.checked); setPushEnabled(e.target.checked); }}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="space-y-0.5">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          <Bell className="h-4 w-4 text-blue-600" /> In-App Alerts
                        </span>
                        <p className="text-xs text-slate-500">Popups and notification center</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={emailEnabled}
                        onChange={(e) => { setEmailEnabled(e.target.checked); }}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="space-y-0.5">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          <Mail className="h-4 w-4 text-emerald-600" /> Email
                        </span>
                        <p className="text-xs text-slate-500">Important status updates</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Event types */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Notification Types
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, meta]) => {
                      const isMuted = mutedTypes.includes(type);
                      return (
                        <div
                          key={type}
                          onClick={() => { toggleMuted(type); }}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-all"
                        >
                          <div className="pr-4">
                            <p className="text-sm font-medium text-slate-800">{meta.label}</p>
                            <p className="text-xs text-slate-500">{meta.desc}</p>
                          </div>
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                              isMuted
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isMuted ? 'Muted' : 'Enabled'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4" /> Saved!
                </>
              ) : mutation.isPending ? (
                'Saving…'
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

