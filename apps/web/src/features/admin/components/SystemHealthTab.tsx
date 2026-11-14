import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileText,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  Users,
  XCircle,
} from 'lucide-react';

import { getAdminHealth } from '../api/admin-api';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export function SystemHealthTab(): React.JSX.Element {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: getAdminHealth,
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Checking system diagnostics and services...</p>
      </div>
    );
  }

  const isHealthy = data?.status === 'ok';

  return (
    <div className="space-y-6">
      {/* Top Health Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              isHealthy ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}
          >
            {isHealthy ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                System Status: {isHealthy ? 'Operational' : 'Degraded Performance'}
              </h2>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {data?.status?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {!isHealthy && data?.dependencies.extractionAgent === 'error'
                ? 'Opportunity extraction agent is offline (external tunnel disconnected). Core database, Redis, and Resume AI services are operational.'
                : 'Automated institutional health monitor. Auto-refreshes every 30 seconds.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          Run Diagnostics
        </button>
      </div>

      {/* Core Dependencies Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* PostgreSQL Database */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">PostgreSQL DB</span>
            <div
              className={`p-2 rounded-xl ${
                data?.dependencies.database === 'ok'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              {data?.dependencies.database === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-rose-600" />
                  <span className="font-bold text-rose-700">Connection Error</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Drizzle ORM + Supabase PostgreSQL pool</p>
          </div>
        </div>

        {/* Redis Cache */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Redis Cache</span>
            <div
              className={`p-2 rounded-xl ${
                data?.dependencies.redis === 'ok'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <HardDrive className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              {data?.dependencies.redis === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">Active</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-rose-600" />
                  <span className="font-bold text-rose-700">Degraded / Offline</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Token blacklist, session cache & rate limits</p>
          </div>
        </div>

        {/* AI Service (FastAPI) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Resume AI (FastAPI)</span>
            <div
              className={`p-2 rounded-xl ${
                data?.dependencies.aiService === 'ok'
                  ? 'bg-emerald-50 text-emerald-600'
                  : data?.dependencies.aiService === 'unconfigured'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              {data?.dependencies.aiService === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">Healthy</span>
                </>
              ) : data?.dependencies.aiService === 'unconfigured' ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-bold text-amber-700">Not Configured</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-rose-600" />
                  <span className="font-bold text-rose-700">Unreachable</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">ATS scoring, enhancement & matching</p>
          </div>
        </div>

        {/* Opportunity Extraction Agent */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Extraction Agent</span>
            <div
              className={`p-2 rounded-xl ${
                data?.dependencies.extractionAgent === 'ok'
                  ? 'bg-emerald-50 text-emerald-600'
                  : data?.dependencies.extractionAgent === 'unconfigured'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              {data?.dependencies.extractionAgent === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">Connected</span>
                </>
              ) : data?.dependencies.extractionAgent === 'unconfigured' ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-bold text-amber-700">Not Configured</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-rose-600" />
                  <span className="font-bold text-rose-700">Disconnected</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">n8n opportunity extraction webhook</p>
          </div>
        </div>
      </div>

      {/* Key Portal Counts Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" /> Portal Activity & Counts
        </h3>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-600" /> Total Accounts
            </span>
            <p className="mt-2 text-2xl font-bold text-slate-900">{data?.counts.totalUsers ?? 0}</p>
            <span className="text-[11px] text-slate-400">Registered users across all roles</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Active Users
            </span>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{data?.counts.activeUsers ?? 0}</p>
            <span className="text-[11px] text-slate-400">Permitted login access</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-600" /> Pending AI Drafts
            </span>
            <p className="mt-2 text-2xl font-bold text-amber-700">{data?.counts.pendingDrafts ?? 0}</p>
            <span className="text-[11px] text-slate-400">Awaiting faculty review</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Failed AI Jobs
            </span>
            <p className="mt-2 text-2xl font-bold text-rose-700">{data?.counts.failedAiJobs ?? 0}</p>
            <span className="text-[11px] text-slate-400">Recorded extraction failures</span>
          </div>
        </div>
      </div>

      {/* Runtime & Environment Metrics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Server className="h-4 w-4 text-purple-600" /> Runtime Environment
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Clock className="h-4 w-4" /> Server Uptime
            </div>
            <p className="mt-2 font-mono text-lg font-bold text-slate-900">
              {data ? formatUptime(data.uptime) : '—'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Cpu className="h-4 w-4" /> Node Engine
            </div>
            <p className="mt-2 font-mono text-lg font-bold text-slate-900">
              {data?.nodeVersion || 'v20.x'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Activity className="h-4 w-4" /> Memory Footprint (Heap)
            </div>
            <p className="mt-2 font-mono text-lg font-bold text-slate-900">
              {data?.memoryUsageMb ? `${data.memoryUsageMb.heapUsed}MB / ${data.memoryUsageMb.heapTotal}MB` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
