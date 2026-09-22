import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function MetricLabel({ children, explanation }) {
  const tooltipId = React.useId();

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{children}</span>
      <span className="group relative inline-flex">
        <button
          type="button"
          aria-label={`About ${children}`}
          aria-describedby={tooltipId}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-700 outline-none transition-colors hover:bg-slate-200 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          <HelpCircle size={14} aria-hidden="true" />
        </button>
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-md bg-slate-950 px-3 py-2 text-left text-xs font-medium normal-case leading-relaxed text-white opacity-0  transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        >
          {explanation}
        </span>
      </span>
    </span>
  );
}