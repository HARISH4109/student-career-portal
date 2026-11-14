import type { NoticeCategory, NoticeResponse } from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Calendar,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  GraduationCap,
  Paperclip,
  Pin,
  Plus,
  Search,
  Tag,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/features/auth/use-auth';
import { NoticeFormModal } from '../components/NoticeFormModal';
import {
  expireNotice,
  getStaffNotices,
  getStudentNotices,
  setNoticePin,
} from '../services/notices-api';

const CATEGORIES: Array<{ key: NoticeCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All Notices' },
  { key: 'placement', label: 'Placement' },
  { key: 'academic', label: 'Academic' },
  { key: 'event', label: 'Events' },
  { key: 'general', label: 'General' },
];

function getCategoryColor(category: string) {
  switch (category) {
    case 'placement':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'academic':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'event':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function NoticesPage(): React.JSX.Element {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isStaff =
    user?.roles?.includes('PLACEMENT_FACULTY') || user?.roles?.includes('ADMIN');

  const [activeCategory, setActiveCategory] = useState<NoticeCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const viewMode = isStaff ? 'manage' : 'student';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noticeToEdit, setNoticeToEdit] = useState<NoticeResponse | null>(null);

  const queryParams = {
    category: activeCategory === 'all' ? undefined : activeCategory,
    search: search.trim() || undefined,
    page: 1,
    pageSize: 50,
  };

  const { data: noticesData, isLoading } = useQuery({
    queryKey: ['notices', viewMode, queryParams],
    queryFn: () => (viewMode === 'manage' ? getStaffNotices(queryParams) : getStudentNotices(queryParams)),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      setNoticePin(id, isPinned),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
  });

  const expireMutation = useMutation({
    mutationFn: expireNotice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
  });

  const notices = noticesData?.data ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" /> Notice Board
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Institutional announcements, placement schedules, and department updates
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isStaff && (
            <button
              onClick={() => {
                setNoticeToEdit(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" /> Post Notice
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notices…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Notice List */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 text-sm">Loading notice board…</div>
      ) : notices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-slate-300 stroke-[1.5]" />
          <h3 className="mt-3 text-base font-bold text-slate-800">No notices found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {search ? 'Try adjusting your search criteria' : 'There are no active notices at this time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                notice.isPinned
                  ? 'border-blue-300 ring-1 ring-blue-100 bg-blue-50/10'
                  : 'border-slate-200'
              }`}
            >
              {/* Poster Banner if present */}
              {notice.posterUrl && (
                <div className="relative mb-5 -mx-6 -mt-6 overflow-hidden rounded-t-2xl border-b border-slate-100 bg-slate-900/5 max-h-72">
                  <img
                    src={notice.posterUrl}
                    alt={notice.title}
                    className="w-full h-52 sm:h-60 object-cover object-center transition-transform duration-300 hover:scale-[1.01]"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Header meta */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {notice.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      <Pin className="h-3 w-3 fill-amber-700" /> Pinned
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryColor(
                      notice.category,
                    )}`}
                  >
                    <Tag className="h-3 w-3" />
                    {notice.category.toUpperCase()}
                  </span>

                  {viewMode === 'manage' && (
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                        notice.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : notice.status === 'scheduled'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {notice.status.toUpperCase()}
                    </span>
                  )}

                  {notice.targetDepartmentName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                      <GraduationCap className="h-3 w-3" /> {notice.targetDepartmentName}
                    </span>
                  )}

                  {notice.targetBatchYear && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                      <Users className="h-3 w-3" /> Class of {notice.targetBatchYear}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(notice.publishedAt || notice.createdAt)}
                  </span>
                </div>
              </div>

              {/* Title & Content */}
              <h2 className="text-lg font-bold text-slate-900 mb-2">{notice.title}</h2>
              <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-4">
                {notice.content}
              </div>

              {/* Event / Action Link CTA */}
              {(notice.actionUrl || notice.linkUrl) && (
                <div className="mb-4">
                  <a
                    href={(notice.actionUrl || notice.linkUrl) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all hover:shadow hover:gap-2.5"
                  >
                    <span>View Event / Register Now</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Attachments */}
              {notice.attachments && notice.attachments.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" /> Attachments:
                  </span>
                  {notice.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
                    >
                      <Download className="h-3 w-3 text-blue-600" />
                      {att.name}
                      <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
                    </a>
                  ))}
                </div>
              )}

              {/* Staff Actions */}
              {isStaff && viewMode === 'manage' && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      pinMutation.mutate({ id: notice.id, isPinned: !notice.isPinned });
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Pin className="h-3 w-3" />
                    {notice.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={() => {
                      setNoticeToEdit(notice);
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </button>
                  {notice.status !== 'expired' && (
                    <button
                      onClick={() => {
                        expireMutation.mutate(notice.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Clock className="h-3 w-3" /> Expire
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <NoticeFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNoticeToEdit(null);
        }}
        noticeToEdit={noticeToEdit}
      />
    </div>
  );
}
