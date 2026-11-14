import { useQuery } from '@tanstack/react-query';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { getAuditFilterOptions, getAuditLogs } from '../api/admin-api';
import type { AuditLogEntry } from '../types';

export function AuditLogsTab(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);

  // Metadata inspector modal
  const [inspectEntry, setInspectEntry] = useState<AuditLogEntry | null>(null);

  // Queries
  const { data: filterOptions } = useQuery({
    queryKey: ['admin', 'audit-filter-options'],
    queryFn: getAuditFilterOptions,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page, actionFilter, entityFilter, search, dateFrom, dateTo],
    queryFn: () =>
      getAuditLogs({
        page,
        pageSize,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  const handleResetFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleCopyRequestId = (id: string) => {
    void navigator.clipboard.writeText(id);
    setCopiedRequestId(id);
    setTimeout(() => {
      setCopiedRequestId(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by action, entity type, origin, request ID, or user agent..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Actions</option>
              {filterOptions?.actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Entity Types</option>
              {filterOptions?.entityTypes.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                title="Date From"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                title="Date To"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleResetFilters}
              title="Reset all filters"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Timestamp
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Entity
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actor
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Request ID
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-sm">Fetching immutable audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-medium text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{log.entityType}</span>
                        {log.entityId && (
                          <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={log.entityId}>
                            {log.entityId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {log.userFullName || 'System / Anonymous'}
                        </span>
                        {log.userEmail && <span className="text-[11px] text-slate-500">{log.userEmail}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {log.requestId ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-sm max-w-[120px] truncate"
                            title={log.requestId}
                          >
                            {log.requestId}
                          </span>
                          <button
                            onClick={() => handleCopyRequestId(log.requestId!)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Copy Request ID"
                          >
                            {copiedRequestId === log.requestId ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setInspectEntry(log)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 text-xs text-slate-500">
            <span>
              Showing Page {meta.page} of {meta.totalPages} ({meta.totalItems} total audit events)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {inspectEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Audit Log Event Payload</h3>
              </div>
              <button
                onClick={() => setInspectEntry(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Action</span>
                  <span className="font-mono font-bold text-slate-900">{inspectEntry.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Entity Target</span>
                  <span className="font-semibold text-slate-900">
                    {inspectEntry.entityType} ({inspectEntry.entityId || 'none'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Actor Identity</span>
                  <span className="text-slate-900 font-medium">{inspectEntry.userFullName || 'System / Anonymous'}</span>
                  {inspectEntry.userEmail && (
                    <span className="text-[10px] text-slate-500 block">{inspectEntry.userEmail}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Request Origin</span>
                  <span className="inline-flex items-center rounded-sm bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                    {inspectEntry.origin || 'direct-api'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Client IP Address</span>
                  <span className="font-mono text-slate-800">{inspectEntry.ipAddress || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Event Timestamp</span>
                  <span className="text-slate-800">{new Date(inspectEntry.createdAt).toLocaleString()}</span>
                </div>
                {inspectEntry.requestId && (
                  <div className="col-span-2 flex items-center justify-between bg-white rounded-lg p-2 border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">End-to-End Correlation Request ID</span>
                      <span className="font-mono text-slate-900 font-semibold">{inspectEntry.requestId}</span>
                    </div>
                    <button
                      onClick={() => handleCopyRequestId(inspectEntry.requestId!)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100"
                    >
                      {copiedRequestId === inspectEntry.requestId ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                )}
                {inspectEntry.userAgent && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Client User Agent</span>
                    <span className="text-slate-600 font-mono text-[11px] break-all">{inspectEntry.userAgent}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600 font-semibold text-xs">Recorded Audit Metadata</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                    <ShieldCheck className="h-3 w-3" /> Immutable Audit Trail
                  </span>
                </div>
                <pre className="max-h-56 overflow-y-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-400 border border-slate-800">
                  {JSON.stringify(inspectEntry.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setInspectEntry(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
