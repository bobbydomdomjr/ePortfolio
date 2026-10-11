
export default function Skeleton({
  className = "",
  style = {},
}) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`}
      style={style}
    />
  );
}
