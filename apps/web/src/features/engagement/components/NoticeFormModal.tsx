import type {
  CreateNoticeInput,
  NoticeAttachment,
  NoticeCategory,
  NoticeResponse,
  NoticeStatus,
} from '@career-portal/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Image as ImageIcon, Loader2, Paperclip, Plus, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createNotice, updateNotice, uploadNoticePoster } from '../services/notices-api';

interface NoticeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  noticeToEdit?: NoticeResponse | null;
}

export function NoticeFormModal({
  isOpen,
  onClose,
  noticeToEdit,
}: NoticeFormModalProps): React.JSX.Element | null {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('general');
  const [status, setStatus] = useState<NoticeStatus>('published');
  const [isPinned, setIsPinned] = useState(false);
  const [publishedAt, setPublishedAt] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<NoticeAttachment[]>([]);
  const [newAttachName, setNewAttachName] = useState('');
  const [newAttachUrl, setNewAttachUrl] = useState('');

  useEffect(() => {
    if (noticeToEdit) {
      setTitle(noticeToEdit.title);
      setContent(noticeToEdit.content);
      setCategory(noticeToEdit.category);
      setStatus(noticeToEdit.status);
      setIsPinned(noticeToEdit.isPinned);
      setPublishedAt(noticeToEdit.publishedAt ? noticeToEdit.publishedAt.slice(0, 16) : '');
      setPosterUrl(noticeToEdit.posterUrl ?? '');
      setActionUrl(noticeToEdit.actionUrl ?? noticeToEdit.linkUrl ?? '');
      setAttachments(noticeToEdit.attachments ?? []);
    } else {
      setTitle('');
      setContent('');
      setCategory('general');
      setStatus('published');
      setIsPinned(false);
      setPublishedAt(new Date().toISOString().slice(0, 16));
      setPosterUrl('');
      setActionUrl('');
      setAttachments([]);
    }
    setPosterError(null);
  }, [noticeToEdit, isOpen]);

  const mutation = useMutation({
    mutationFn: async (payload: CreateNoticeInput) => {
      if (noticeToEdit) {
        return updateNotice(noticeToEdit.id, payload);
      }
      return createNotice(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notices'] });
      onClose();
    },
  });

  const handlePosterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPosterError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPosterError('Poster image must be smaller than 5MB.');
      return;
    }

    setPosterError(null);
    setIsUploadingPoster(true);
    try {
      const res = await uploadNoticePoster(file);
      setPosterUrl(res.url);
    } catch {
      setPosterError('Failed to upload poster image. Please try again or provide an image URL.');
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleAddAttachment = () => {
    if (!newAttachName.trim() || !newAttachUrl.trim()) return;
    setAttachments((prev) => [...prev, { name: newAttachName.trim(), url: newAttachUrl.trim() }]);
    setNewAttachName('');
    setNewAttachUrl('');
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    mutation.mutate({
      title: title.trim(),
      content: content.trim(),
      category,
      status,
      isPinned,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
      posterUrl: posterUrl.trim() || null,
      actionUrl: actionUrl.trim() || null,
      targetAudience: {},
      attachments,
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
          className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {noticeToEdit ? 'Edit Notice' : 'Post Announcement / Notice'}
              </h2>
              <p className="text-xs text-slate-500">
                Broadcast announcements, hackathons, and seminars across the Computer Science & Engineering department
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notice Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => { setTitle(e.target.value); }}
                placeholder="e.g. Smart India Hackathon 2026 - Department Shortlisting"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value as NoticeCategory); }}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="placement">Placement</option>
                  <option value="academic">Academic</option>
                  <option value="event">Event / Seminar</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Publish Status</label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as NoticeStatus); }}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="published">Published Immediately (All Students)</option>
                  <option value="scheduled">Scheduled for Future</option>
                  <option value="draft">Draft (Saved only)</option>
                </select>
              </div>
            </div>

            {status === 'scheduled' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Schedule Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={publishedAt}
                  onChange={(e) => { setPublishedAt(e.target.value); }}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            )}

            {/* Poster Upload / URL Section */}
            <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-blue-600" /> Event Poster or Banner (Optional)
                </span>
                {posterUrl && (
                  <button
                    type="button"
                    onClick={() => { setPosterUrl(''); }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove Poster
                  </button>
                )}
              </div>

              {posterUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 max-h-48 flex items-center justify-center">
                  <img
                    src={posterUrl}
                    alt="Poster preview"
                    className="w-full h-44 object-cover object-center"
                    onError={() => { setPosterError('Could not load image from URL.'); }}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white rounded-xl cursor-pointer transition-colors group">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handlePosterFileUpload}
                        disabled={isUploadingPoster}
                      />
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 group-hover:text-blue-600">
                        {isUploadingPoster ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        ) : (
                          <Upload className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                        )}
                        <span>{isUploadingPoster ? 'Uploading Poster…' : 'Upload Image (PNG, JPG, WebP max 5MB)'}</span>
                      </div>
                    </label>
                  </div>

                  <div className="relative flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">or paste image link:</span>
                    <input
                      type="url"
                      placeholder="https://example.com/poster.jpg"
                      value={posterUrl}
                      onChange={(e) => {
                        setPosterUrl(e.target.value);
                        setPosterError(null);
                      }}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {posterError && (
                <p className="text-xs text-red-600 font-medium">{posterError}</p>
              )}
            </div>

            {/* Event Link / Registration URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-blue-600" /> Registration / External Action Link (Optional)
              </label>
              <input
                type="url"
                value={actionUrl}
                onChange={(e) => { setActionUrl(e.target.value); }}
                placeholder="https://hackathon-registration.dev or registration form link"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Description / Content *</label>
              <textarea
                required
                rows={5}
                value={content}
                onChange={(e) => { setContent(e.target.value); }}
                placeholder="Write detailed announcements, eligibility, schedule, and guidelines here…"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Pin to top */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => { setIsPinned(e.target.checked); }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Pin notice to top of Notice Board
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Keeps urgent hackathons and major notices at the top for maximum visibility
                  </span>
                </div>
              </label>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Additional Document Attachments (Optional)</label>
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <span className="flex items-center gap-2 text-slate-700 truncate font-medium">
                    <Paperclip className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    {att.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => { handleRemoveAttachment(idx); }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Document Name (e.g. Schedule.pdf)"
                  value={newAttachName}
                  onChange={(e) => { setNewAttachName(e.target.value); }}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
                <input
                  type="url"
                  placeholder="URL link (https://...)"
                  value={newAttachUrl}
                  onChange={(e) => { setNewAttachUrl(e.target.value); }}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving…' : noticeToEdit ? 'Save Changes' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
