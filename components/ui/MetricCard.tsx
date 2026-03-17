export function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <article className="metric-card">
      <span className="metric-card__accent" style={{ background: accent }} />
      <p className="metric-card__label">{label}</p>
      <strong className="metric-card__value">{value}</strong>
    </article>
  );
}
