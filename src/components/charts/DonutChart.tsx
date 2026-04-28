export interface DonutSegment {
  value: number;
  color: string;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeSectorPath(cx: number, cy: number, radius: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, radius, startDeg);
  const end = polarToCartesian(cx, cy, radius, endDeg);
  const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

export function DonutChart({ segments, ariaLabel, size }: { segments: DonutSegment[]; ariaLabel: string; size: number }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = size / 2;

  if (total <= 0) {
    return <div aria-label={ariaLabel} className="h-full w-full rounded-full bg-slate-200" role="img" />;
  }

  let currentDeg = 0;

  return (
    <div aria-label={ariaLabel} className="h-full w-full" role="img">
      <svg className="h-full w-full" viewBox={`0 0 ${size} ${size}`}>
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment, index) => {
            const sweepDeg = (segment.value / total) * 360;
            const startDeg = currentDeg;
            const endDeg = currentDeg + sweepDeg;
            currentDeg = endDeg;
            const path = describeSectorPath(radius, radius, radius, startDeg, endDeg);

            return <path d={path} fill={segment.color} key={`${segment.color}-${index}`} stroke="rgba(255,255,255,0.9)" strokeWidth={2} />;
          })}
      </svg>
    </div>
  );
}
