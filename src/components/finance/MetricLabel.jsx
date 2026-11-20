import InfoTip from '../ui/InfoTip';

/** A metric's label with an ⓘ that explains it (the app's one InfoTip). */
export default function MetricLabel({ children, explanation }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{children}</span>
      <InfoTip topic={children}>{explanation}</InfoTip>
    </span>
  );
}
