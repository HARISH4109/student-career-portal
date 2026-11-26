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
import { safeHref } from '@/shared/lib/safe-url';
import { NoticeFormModal } from '../components/NoticeFormModal';
import {
  expireNotice,
  getStaffNotices,
  getStudentNotices,
  setNoticePin,
} from '../services/notices-api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
} from '@/shared/components/ui';

const CATEGORIES: Array<{ key: NoticeCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All Notices' },
  { key: 'placement', label: 'Placement' },
  { key: 'academic', label: 'Academic' },
  { key: 'event', label: 'Events' },
  { key: 'general', label: 'General' },
];

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
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Notice Board
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Institutional announcements, placement schedules, and department updates
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isStaff && (
            <Button
              onClick={() => {
                setNoticeToEdit(null);
                setIsModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Post Notice
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => { setActiveCategory(cat.key); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search notices…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Notice List */}
      {isLoading ? (
        <div className="p-16 text-center text-muted-foreground text-sm font-medium">Loading notice board…</div>
      ) : notices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notices found"
          description={
            search ? 'Try adjusting your search criteria' : 'There are no active notices at this time.'
          }
        />
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card
              key={notice.id}
              className={`p-6 transition-colors hover:shadow-md ${
                notice.isPinned
                  ? 'border-primary/40 ring-1 ring-primary/20 bg-primary/5'
                  : ''
              }`}
            >
              {/* Poster Banner if present */}
              {notice.posterUrl && (
                <div className="relative mb-5 -mx-6 -mt-6 overflow-hidden rounded-t-xl border-b border-border/60 bg-muted/20 max-h-72">
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
                    <Badge variant="warning" className="gap-1 font-bold">
                      <Pin className="h-3 w-3 fill-amber-700 dark:fill-amber-300" /> Pinned
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {notice.category.toUpperCase()}
                  </Badge>

                  {viewMode === 'manage' && (
                    <Badge
                      variant={notice.status === 'published' ? 'success' : 'outline'}
                      className="text-[11px]"
                    >
                      {notice.status.toUpperCase()}
                    </Badge>
                  )}

                  {notice.targetDepartmentName && (
                    <Badge variant="outline" className="gap-1 text-[11px]">
                      <GraduationCap className="h-3 w-3" /> {notice.targetDepartmentName}
                    </Badge>
                  )}

                  {notice.targetBatchYear && (
                    <Badge variant="outline" className="gap-1 text-[11px] font-mono">
                      <Users className="h-3 w-3" /> Class of {notice.targetBatchYear}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(notice.publishedAt || notice.createdAt)}
                  </span>
                </div>
              </div>

              {/* Title & Content */}
              <h2 className="text-lg font-bold text-card-foreground mb-2">{notice.title}</h2>
              <div className="text-sm text-foreground whitespace-pre-line leading-relaxed mb-4">
                {notice.content}
              </div>

              {/* Event / Action Link CTA */}
              {safeHref(notice.actionUrl || notice.linkUrl) && (
                <div className="mb-4">
                  <a
                    href={safeHref(notice.actionUrl || notice.linkUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" className="gap-2">
                      <span>View Event / Register Now</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              )}

              {/* Attachments */}
              {notice.attachments && notice.attachments.length > 0 && (
                <div className="pt-3 border-t border-border/60 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" /> Attachments:
                  </span>
                  {notice.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={safeHref(att.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted border border-border text-xs font-medium text-foreground transition-colors"
                    >
                      <Download className="h-3 w-3 text-primary" />
                      <span>{att.name}</span>
                      <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}

              {/* Staff Actions */}
              {isStaff && viewMode === 'manage' && (
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      pinMutation.mutate({ id: notice.id, isPinned: !notice.isPinned });
                    }}
                    className="gap-1 text-muted-foreground"
                  >
                    <Pin className="h-3 w-3" />
                    <span>{notice.isPinned ? 'Unpin' : 'Pin'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNoticeToEdit(notice);
                      setIsModalOpen(true);
                    }}
                    className="gap-1 text-muted-foreground"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                  {notice.status !== 'expired' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        expireMutation.mutate(notice.id);
                      }}
                      className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Clock className="h-3 w-3" />
                      <span>Expire</span>
                    </Button>
                  )}
                </div>
              )}
            </Card>
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
