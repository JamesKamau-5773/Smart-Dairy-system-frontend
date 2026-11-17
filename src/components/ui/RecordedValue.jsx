/**
 * A figure the backend sent, formatted; or, when it sent none, a dash with `missingLabel` for
 * screen readers ("Not recorded"). The one way to show an empty value, so a missing figure never
 * reads as a real 0.
 *
 * value: the backend's value (null, undefined, '' or a non-finite number count as none)
 * format: (value) => text; a null result also counts as none
 */
export default function RecordedValue({ value, format = (raw) => raw, missingLabel }) {
  const missing = value === null || value === undefined || value === ''
    || (typeof value === 'number' && !Number.isFinite(value));
  const text = missing ? null : format(value);
  if (text !== null && text !== undefined) return text;
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{missingLabel}</span>
    </>
  );
}
