import type { OpportunityListQuery } from '@career-portal/shared-types';
import { CheckCircle2, Clock, Filter, Search, X } from 'lucide-react';
import { useState } from 'react';

interface OpportunityFiltersProps {
  filters: Partial<OpportunityListQuery>;
  onChange: (filters: Partial<OpportunityListQuery>) => void;
  showStatusFilter?: boolean;
}

export function OpportunityFilters({
  filters,
  onChange,
  showStatusFilter = false,
}: OpportunityFiltersProps): React.JSX.Element {
  const [showMore, setShowMore] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  const handleSearchSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onChange({ ...filters, search: searchInput || undefined, page: 1 });
  };

  const clearFilters = () => {
    setSearchInput('');
    onChange({ page: 1, pageSize: filters.pageSize ?? 20, sortBy: 'newest' });
  };

  const hasActiveFilters = !!(
    filters.search ||
    filters.type ||
    filters.workMode ||
    filters.closingSoon ||
    filters.eligibleOnly ||
    filters.status
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); }}
            placeholder="Search opportunities by title, company, description..."
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Search
        </button>
      </form>

      {/* Quick filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setShowMore(!showMore); }}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showMore
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
        </button>

        {/* Type filter pills */}
        {(['job', 'internship'] as const).map((type) => (
          <button
            key={type}
            onClick={() =>
              { onChange({ ...filters, type: filters.type === type ? undefined : type, page: 1 }); }
            }
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filters.type === type
                ? type === 'job'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
            }`}
          >
            {type === 'job' ? 'Jobs' : 'Internships'}
          </button>
        ))}

        {/* Work mode filter pills */}
        {(['remote', 'onsite', 'hybrid'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() =>
              { onChange({ ...filters, workMode: filters.workMode === mode ? undefined : mode, page: 1 }); }
            }
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
              filters.workMode === mode
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
            }`}
          >
            {mode}
          </button>
        ))}

        {/* Closing soon toggle */}
        <button
          onClick={() =>
            { onChange({ ...filters, closingSoon: !filters.closingSoon || undefined, page: 1 }); }
          }
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filters.closingSoon
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
          }`}
        >
          <Clock className="h-3 w-3" />
          Closing Soon
        </button>

        {/* Eligible only toggle */}
        <button
          onClick={() =>
            { onChange({ ...filters, eligibleOnly: !filters.eligibleOnly || undefined, page: 1 }); }
          }
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filters.eligibleOnly
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
          }`}
        >
          <CheckCircle2 className="h-3 w-3" />
          Eligible Only
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Extended filters */}
      {showMore && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground tracking-normal">Sort:</label>
            <select
              value={filters.sortBy ?? 'newest'}
              onChange={(e) => { onChange({ ...filters, sortBy: e.target.value as NonNullable<typeof filters.sortBy>, page: 1 }); }}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="newest">Newest First</option>
              <option value="deadline">Deadline (Soonest)</option>
              <option value="salary">Salary (Highest)</option>
            </select>
          </div>

          {/* Status filter (faculty only) */}
          {showStatusFilter && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground tracking-normal">Status:</label>
              <select
                value={filters.status ?? ''}
                onChange={(e) =>
                  { onChange({ ...filters, status: (e.target.value || undefined) as typeof filters.status, page: 1 }); }
                }
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
