import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { getFailedAiJobs } from '../api/admin-api';
import type { FailedAiJob } from '../types';

export function FailedAIJobsTab(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [taskType, setTaskType] = useState('');
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);

  const [inspectJob, setInspectJob] = useState<FailedAiJob | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'failed-ai-jobs', page, dateFrom, dateTo, taskType],
    queryFn: () =>
      getFailedAiJobs({
        page,
        pageSize,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        taskType: taskType || undefined,
      }),
  });

  const jobs = data?.data ?? [];
  const meta = data?.meta;

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setTaskType('');
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
      {/* Informational Governance Notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
        <Bot className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <span className="font-bold">AI Pipeline Observability & Governance Notice:</span>
          <p className="mt-0.5 text-amber-800">
            This log tracks failed extraction and parsing runs from faculty-submitted job postings (URLs, PDFs, images)
            alongside AI workload tasks. Per portal architecture rules, AI execution is sandboxed, never publishes
            opportunities directly, and preserves error provenance for auditability.
          </p>
        </div>
      </div>

      {/* Date Range & Task Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={taskType}
            onChange={(e) => {
              setTaskType(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All AI Tasks & Workloads</option>
            <option value="opportunity_extraction">Opportunity Extraction (n8n)</option>
            <option value="resume_analysis">Resume ATS Analysis</option>
            <option value="resume_enhancement">STAR Bullet Enhancement</option>
            <option value="resume_match">Opportunity Matcher</option>
            <option value="interview_eval">AI Mock Interview Evaluation</option>
            <option value="service_health_probe">AI Service Health Probes</option>
          </select>

          <span className="text-xs font-semibold text-slate-500 ml-2">Date:</span>
          <input
            type="date"
            title="Date From"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
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
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          />
          {(dateFrom || dateTo || taskType) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Refresh Log
        </button>
      </div>

      {/* Failed Jobs Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Execution Time
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Source Channel
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Model / Duration
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Error Details
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Submitter
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Inspect
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-sm mt-2 block">Loading failed AI execution runs...</span>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Sparkles className="h-6 w-6 text-emerald-500" />
                      <span className="font-semibold text-slate-700">All clear</span>
                      <span className="text-xs text-slate-400">No failed AI execution jobs recorded.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(job.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-900">{job.serviceName}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700 border border-slate-200">
                            {job.taskType}
                          </span>
                          {job.fileName && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={job.fileName}>
                              {job.fileName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{job.modelUsed || 'default-agent'}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {job.durationMs != null ? `${job.durationMs}ms` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-rose-700 max-w-xs">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                        <span className="line-clamp-2" title={job.errorMessage || 'No error message recorded'}>
                          {job.errorMessage || 'Unknown extraction failure'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="flex flex-col">
                        <span className="text-slate-800 font-medium">{job.submitterName || 'Faculty / System'}</span>
                        {job.submitterEmail && <span className="text-[11px] text-slate-400">{job.submitterEmail}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setInspectJob(job)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" /> Details
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
              Showing Page {meta.page} of {meta.totalPages} ({meta.totalItems} total failed jobs)
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

      {/* Inspect Detail Modal */}
      {inspectJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Failed AI Job Diagnosis</h3>
              </div>
              <button
                onClick={() => setInspectJob(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <span className="font-bold text-rose-900 block mb-1">Error Diagnostic</span>
                <p className="font-mono text-rose-800 break-words">{inspectJob.errorMessage || 'No message logged'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
                <div>
                  <span className="text-slate-400 block">Source Channel</span>
                  <span className="font-semibold text-slate-800">{inspectJob.sourceType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Model Used</span>
                  <span className="font-semibold text-slate-800">{inspectJob.modelUsed || 'default'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Execution Duration</span>
                  <span className="text-slate-800">{inspectJob.durationMs != null ? `${inspectJob.durationMs}ms` : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Submitted By</span>
                  <span className="text-slate-800">{inspectJob.submitterName || 'System'}</span>
                </div>
                {inspectJob.requestId && (
                  <div className="col-span-2 flex items-center justify-between bg-white rounded-lg p-2 border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Correlation Request ID</span>
                      <span className="font-mono text-slate-900 font-semibold">{inspectJob.requestId}</span>
                    </div>
                    <button
                      onClick={() => handleCopyRequestId(inspectJob.requestId!)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100"
                    >
                      {copiedRequestId === inspectJob.requestId ? (
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
                {inspectJob.origin && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Provenance Origin</span>
                    <span className="font-mono text-slate-700">{inspectJob.origin}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Source Content Preview</span>
                <pre className="max-h-40 overflow-y-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-slate-200 break-words whitespace-pre-wrap">
                  {inspectJob.rawContentPreview || 'No raw content preview available'}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setInspectJob(null)}
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
