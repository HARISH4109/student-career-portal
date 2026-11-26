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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl border border-border max-h-[90vh] flex flex-col text-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary border border-primary/20 rounded-lg">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Notification Preferences</h2>
                <p className="text-xs text-muted-foreground">Configure delivery channels and category alerts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading settings…</div>
            ) : (
              <>
                {/* Channels */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold tracking-normal text-muted-foreground">
                    Delivery Channels
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border/80 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={pushEnabled}
                        onChange={(e) => { setEmailEnabled(e.target.checked); setPushEnabled(e.target.checked); }}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/25"
                      />
                      <div className="space-y-0.5">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <Bell className="h-4 w-4 text-primary" /> In-App Alerts
                        </span>
                        <p className="text-xs text-muted-foreground">Popups and notification center</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border/80 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={emailEnabled}
                        onChange={(e) => { setEmailEnabled(e.target.checked); }}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/25"
                      />
                      <div className="space-y-0.5">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <Mail className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Email
                        </span>
                        <p className="text-xs text-muted-foreground">Important status updates</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Event types */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold tracking-normal text-muted-foreground">
                    Notification Types
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, meta]) => {
                      const isMuted = mutedTypes.includes(type);
                      return (
                        <div
                          key={type}
                          onClick={() => { toggleMuted(type); }}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <div className="pr-4">
                            <p className="text-sm font-medium text-foreground">{meta.label}</p>
                            <p className="text-xs text-muted-foreground">{meta.desc}</p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full font-mono transition-colors border ${
                              isMuted
                                ? 'bg-muted text-muted-foreground border-border/80'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
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
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
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
