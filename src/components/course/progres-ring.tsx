interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({
  percent,
  size = 48,
  strokeWidth = 4,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  function clamp(min: number, max: number, val: number) {
    return Math.min(max, Math.max(min, val));
  }
  const offset = circumference - clamp(0, 100, percent) / 100 * circumference;

  const safePercent = Math.min(100, Math.max(0, percent));
  const safeOffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={safeOffset}
          strokeLinecap="round"
          className="text-blue-500 transition-all duration-700 ease-out"
        />
      </svg>
      {/* Label in center */}
      <div
        className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums"
        style={{ position: "relative", marginTop: -size }}
      >
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold">
          {Math.round(safePercent)}%
        </span>
      </div>
    </div>
  );
}