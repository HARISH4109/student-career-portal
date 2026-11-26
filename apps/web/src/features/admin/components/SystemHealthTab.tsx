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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking system diagnostics and services...</p>
      </div>
    );
  }

  const isHealthy = data?.status === 'ok';

  return (
    <div className="space-y-6">
      {/* Top Health Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${isHealthy ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
              }`}
          >
            {isHealthy ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                System Status: {isHealthy ? 'Operational' : 'Degraded Performance'}
              </h2>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${isHealthy ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                  }`}
              >
                {data?.status?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {!isHealthy && data?.dependencies.extractionAgent === 'error'
                ? 'Opportunity extraction agent is offline (external tunnel disconnected). Core database, Redis, and Resume AI services are operational.'
                : 'Automated institutional health monitor. Auto-refreshes every 30 seconds.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          Run Diagnostics
        </button>
      </div>

      {/* Core Dependencies Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* PostgreSQL Database */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">PostgreSQL DB</span>
            <div
              className={`p-2 rounded-lg ${data?.dependencies.database === 'ok'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                }`}
            >
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              {data?.dependencies.database === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="font-bold text-foreground">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-rose-700 dark:text-rose-400" />
                  <span className="font-bold text-rose-700 dark:text-rose-400">Connection Error</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">Drizzle ORM + Supabase PostgreSQL pool</p>
          </div>
        </div>

        {/* Redis Cache */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Redis Cache</span>
            <div
              className={`p-2 rounded-lg ${data?.dependencies.redis === 'ok'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                }`}
            >
              <HardDrive className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              {data?.dependencies.redis === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="font-bold text-foreground">Active</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-rose-700 dark:text-rose-400" />
                  <span className="font-bold text-rose-700 dark:text-rose-400">Degraded / Offline</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">Token blacklist, session cache & rate limits</p>
          </div>
        </div>

        {/* AI Service (FastAPI) */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Resume AI (FastAPI)</span>
            <div
              className={`p-2 rounded-lg ${data?.dependencies.aiService === 'ok'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : data?.dependencies.aiService === 'unconfigured'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                }`}
            >
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              {data?.dependencies.aiService === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="font-bold text-foreground">Healthy</span>
                </>
              ) : data?.dependencies.aiService === 'unconfigured' ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  <span className="font-bold text-amber-700 dark:text-amber-400">Not Configured</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-rose-700 dark:text-rose-400" />
                  <span className="font-bold text-rose-700 dark:text-rose-400">Unreachable</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">ATS scoring, enhancement & matching</p>
          </div>
        </div>

        {/* Opportunity Extraction Agent */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Extraction Agent</span>
            <div
              className={`p-2 rounded-lg ${data?.dependencies.extractionAgent === 'ok'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : data?.dependencies.extractionAgent === 'unconfigured'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                }`}
            >
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              {data?.dependencies.extractionAgent === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="font-bold text-foreground">Connected</span>
                </>
              ) : data?.dependencies.extractionAgent === 'unconfigured' ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  <span className="font-bold text-amber-700 dark:text-amber-400">Not Configured</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-rose-700 dark:text-rose-400" />
                  <span className="font-bold text-rose-700 dark:text-rose-400">Disconnected</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">n8n opportunity extraction webhook</p>
          </div>
        </div>
      </div>

      {/* Key Portal Counts Grid */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Portal Activity & Counts
        </h3>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg bg-muted/20 p-4 border border-border">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Total Accounts
            </span>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-foreground">{data?.counts.totalUsers ?? 0}</p>
            <span className="text-[11px] text-muted-foreground/70">Registered users across all roles</span>
          </div>

          <div className="rounded-lg bg-muted/20 p-4 border border-border">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" /> Active Users
            </span>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">{data?.counts.activeUsers ?? 0}</p>
            <span className="text-[11px] text-muted-foreground/70">Permitted login access</span>
          </div>

          <div className="rounded-lg bg-muted/20 p-4 border border-border">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" /> Pending AI Drafts
            </span>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">{data?.counts.pendingDrafts ?? 0}</p>
            <span className="text-[11px] text-muted-foreground/70">Awaiting faculty review</span>
          </div>

          <div className="rounded-lg bg-muted/20 p-4 border border-border">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-700 dark:text-rose-400" /> Failed AI Jobs
            </span>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400">{data?.counts.failedAiJobs ?? 0}</p>
            <span className="text-[11px] text-muted-foreground/70">Recorded extraction failures</span>
          </div>
        </div>
      </div>

      {/* Runtime & Environment Metrics */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" /> Runtime Environment
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/20 p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="h-4 w-4" /> Server Uptime
            </div>
            <p className="mt-2 font-mono text-lg font-bold text-foreground">
              {data ? formatUptime(data.uptime) : '—'}
            </p>
          </div>

          <div className="rounded-lg bg-muted/20 p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Cpu className="h-4 w-4" /> Node Engine
            </div>
            <p className="mt-2 font-mono text-lg font-bold text-foreground">
              {data?.nodeVersion || 'v20.x'}
            </p>
          </div>

          <div className="rounded-lg bg-muted/20 p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Activity className="h-4 w-4" /> Memory Footprint (Heap)
            </div>
            <p className="mt-2 font-mono text-lg font-bold text-foreground">
              {data?.memoryUsageMb ? `${data.memoryUsageMb.heapUsed}MB / ${data.memoryUsageMb.heapTotal}MB` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
