import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { safetyApi } from '../../lib/backendApi';
import { milkTestsKey } from '../../lib/milkSafety';
import { safetyCopy as copy } from '../../i18n/safety.en';

// Date and time of a test, e.g. "3 Nov, 07:30"; null when unreadable.
const formatTestTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;
};

/** A cow's milk tests, newest first, loaded when opened. */
export default function MilkTestHistory({ tenantId, cowId }) {
  const [open, setOpen] = useState(false);
  const tests = useQuery({
    queryKey: milkTestsKey(tenantId, cowId),
    queryFn: () => safetyApi.milkTests(cowId),
    enabled: open && Boolean(cowId),
  });

  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-brand hover:underline">
        {copy.testHistory}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-1 text-xs">
          {tests.isLoading ? <p className="text-ink-muted">…</p>
            : tests.isError ? <p className="text-ink">{copy.testHistoryFailed}</p>
              : (tests.data ?? []).length === 0 ? <p className="text-ink-muted">{copy.testHistoryEmpty}</p>
                : (
                  <ul className="divide-y divide-ink/10 rounded-md border border-ink/10">
                    {tests.data.map((test) => (
                      <li key={test.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2">
                        <span className="text-ink">
                          <span className={test.result === 'FAIL' ? 'font-bold text-brand-900' : 'font-semibold'}>{copy.testResultLabel(test.result)}</span>
                          {' · '}{test.test_type}
                          {test.notes ? <span className="text-ink-muted"> · {test.notes}</span> : null}
                        </span>
                        <span className="text-ink-muted">
                          {formatTestTime(test.tested_at) ?? '—'}{test.recorded_by_name ? ` ${copy.recordedBy(test.recorded_by_name)}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
        </div>
      )}
    </div>
  );
}
