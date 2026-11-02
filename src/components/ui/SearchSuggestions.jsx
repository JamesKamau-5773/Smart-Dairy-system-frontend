/** "Did you mean …" chips for a search that found nothing. */
export default function SearchSuggestions({ items, getKey, getLabel, onPick }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
      <span className="text-ink-muted">Did you mean</span>
      {items.map((item) => (
        <button
          key={getKey(item)}
          type="button"
          onClick={() => onPick(item)}
          className="rounded-full border border-brand/30 bg-brand-50 px-3 py-1 font-semibold text-brand hover:bg-brand-100"
        >
          {getLabel(item)}
        </button>
      ))}
    </div>
  );
}
