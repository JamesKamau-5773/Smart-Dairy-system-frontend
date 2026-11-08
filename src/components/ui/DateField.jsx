import { useId, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { formatDate, maskInputDate, parseInputDate, toInputDate } from '../../lib/dateFormat';

const pad = (value) => String(value).padStart(2, '0');
const isoOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dateOf = (iso) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
};

/** Why a typed date can't be used, or null. `text` is what's typed; `iso` its parsed value. */
function dateFieldError(text, iso, { min, max } = {}) {
  if (!text) return null;
  if (text.length === 10 && !iso) return 'Enter a real date as dd/mm/yyyy.';
  if (iso && max && iso > max) return `Use a date on or before ${formatDate(max)}.`;
  if (iso && min && iso < min) return `Use a date on or after ${formatDate(min)}.`;
  return null;
}

/**
 * A date typed as dd/mm/yyyy (en-KE), with a calendar to pick from. Never the browser's
 * own date input, whose order follows the phone's locale (often US month-first).
 * `value` and `onChange` use YYYY-MM-DD; '' while the typed date is incomplete or invalid.
 */
export default function DateField({ label, value = '', onChange, min, max, required = false, name, className = '', inputClassName = 'input-machined', hideLabel = false }) {
  const id = useId();
  const errorId = `${id}-error`;
  const [text, setText] = useState(() => toInputDate(value));
  // Follow changes made outside the field (a restored draft, a reset), not our own.
  const [seenValue, setSeenValue] = useState(value);
  const [emitted, setEmitted] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    if (value !== emitted) setText(toInputDate(value));
  }

  const iso = parseInputDate(text);
  const error = dateFieldError(text, iso, { min, max });

  const emit = (nextText) => {
    const nextIso = parseInputDate(nextText);
    const usable = nextIso && !dateFieldError(nextText, nextIso, { min, max }) ? nextIso : '';
    setText(nextText);
    setEmitted(usable);
    onChange(usable);
  };

  const [calendarOpen, setCalendarOpen] = useState(false);
  const disabled = [max && { after: dateOf(max) }, min && { before: dateOf(min) }].filter(Boolean);

  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'label-text'}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          value={text}
          onChange={(event) => emit(maskInputDate(event.target.value))}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${inputClassName} pr-11`}
        />
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Pick ${label.toLowerCase()} from a calendar`}
              className="absolute right-0.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center !rounded-input text-ink-muted hover:text-brand"
            >
              <CalendarDays size={16} aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto rounded-input border-ink/10 bg-card p-0">
            <Calendar
              mode="single"
              weekStartsOn={1}
              selected={dateOf(iso)}
              defaultMonth={dateOf(iso) ?? dateOf(max)}
              disabled={disabled.length ? disabled : undefined}
              onSelect={(date) => {
                if (!date) return;
                emit(toInputDate(isoOf(date)));
                setCalendarOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && <p id={errorId} className="mt-1.5 text-xs text-danger-900">{error}</p>}
    </div>
  );
}
