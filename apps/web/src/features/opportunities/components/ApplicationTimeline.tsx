import type { ApplicationStatusHistoryDto } from '@career-portal/shared-types';
import { Clock } from 'lucide-react';

import { ApplicationStatusBadge } from './ApplicationStatusBadge';

interface ApplicationTimelineProps {
  history: ApplicationStatusHistoryDto[];
}

export function ApplicationTimeline({ history }: ApplicationTimelineProps): React.JSX.Element {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No status history available</p>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-4">
        {history.map((entry, idx) => (
          <li key={entry.id} className="relative pb-4">
            {/* Connecting line */}
            {idx < history.length - 1 && (
              <span
                className="absolute left-3.5 top-7 -ml-px h-full w-0.5 bg-border"
                aria-hidden="true"
              />
            )}

            <div className="relative flex items-start gap-3">
              {/* Timeline dot */}
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card ring-2 ring-border">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ApplicationStatusBadge status={entry.status} />
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(entry.changedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {entry.changedByName && (
                  <p className="mt-0.5 text-xs text-muted-foreground">by {entry.changedByName}</p>
                )}
                {entry.remarks && (
                  <p className="mt-1 text-sm text-foreground">{entry.remarks}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
