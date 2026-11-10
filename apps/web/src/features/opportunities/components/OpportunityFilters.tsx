import type { OpportunityListQuery } from '@career-portal/shared-types';
import { Filter, Search, X } from 'lucide-react';
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); }}
            placeholder="Search opportunities by title, company, description..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                  : 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {type === 'job' ? '💼 Jobs' : '🎓 Internships'}
          </button>
        ))}

        {/* Work mode filter pills */}
        {(['remote', 'onsite', 'hybrid'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() =>
              { onChange({ ...filters, workMode: filters.workMode === mode ? undefined : mode, page: 1 }); }
            }
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filters.workMode === mode
                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {mode === 'remote' ? '🏠' : mode === 'onsite' ? '🏢' : '🔄'} {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}

        {/* Closing soon toggle */}
        <button
          onClick={() =>
            { onChange({ ...filters, closingSoon: !filters.closingSoon || undefined, page: 1 }); }
          }
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filters.closingSoon
              ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          ⏰ Closing Soon
        </button>

        {/* Eligible only toggle */}
        <button
          onClick={() =>
            { onChange({ ...filters, eligibleOnly: !filters.eligibleOnly || undefined, page: 1 }); }
          }
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filters.eligibleOnly
              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          ✅ Eligible Only
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Extended filters */}
      {showMore && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Sort:</label>
            <select
              value={filters.sortBy ?? 'newest'}
              onChange={(e) => { onChange({ ...filters, sortBy: e.target.value as NonNullable<typeof filters.sortBy>, page: 1 }); }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
            >
              <option value="newest">Newest First</option>
              <option value="deadline">Deadline (Soonest)</option>
              <option value="salary">Salary (Highest)</option>
            </select>
          </div>

          {/* Status filter (faculty only) */}
          {showStatusFilter && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Status:</label>
              <select
                value={filters.status ?? ''}
                onChange={(e) =>
                  { onChange({ ...filters, status: (e.target.value || undefined) as typeof filters.status, page: 1 }); }
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
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
