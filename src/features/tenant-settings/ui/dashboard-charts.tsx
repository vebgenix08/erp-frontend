import { useState } from "react";

// --- SVG LINE CHART COMPONENT ---
export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

export function SvgLineChart({
  labels,
  series,
  height = 180,
  yMax,
  unit = "",
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  yMax?: number;
  unit?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const allValues = series.flatMap((s) => s.values);
  const maxValInSeries = allValues.length ? Math.max(...allValues, 0) : 0;
  const maxValue = yMax ?? (maxValInSeries > 0 ? maxValInSeries * 1.2 : 10);

  const paddingLeft = 40;
  const paddingBottom = 26;
  const paddingTop = 14;
  const paddingRight = 16;

  const svgWidth = 500;
  const svgHeight = height;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (labels.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (labels.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const safeVal = Math.max(0, Math.min(val, maxValue));
    return paddingTop + chartHeight - (safeVal / maxValue) * chartHeight;
  };

  const yTicks = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue];
  const hasData = allValues.some((v) => v > 0);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto text-slate-400 select-none overflow-visible"
        style={{ minWidth: "300px" }}
      >
        {/* Y Grid Lines */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray={i === 0 ? "0" : "3 3"}
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="text-[9px] fill-slate-400 font-medium"
              >
                {unit}
                {Math.round(tick).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* X Labels */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={getX(i)}
            y={svgHeight - 6}
            textAnchor="middle"
            className="text-[9px] fill-slate-400 font-medium"
          >
            {label}
          </text>
        ))}

        {!hasData ? (
          <text
            x={svgWidth / 2}
            y={svgHeight / 2}
            textAnchor="middle"
            className="text-xs fill-slate-400 font-semibold"
          >
            No data recorded for selected period
          </text>
        ) : (
          series.map((s, sIdx) => {
            const points = s.values.map((v, i) => ({ x: getX(i), y: getY(v), val: v }));
            const pathD = points.reduce((acc, pt, i) => {
              return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
            }, "");

            return (
              <g key={sIdx}>
                {/* Main Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIdx === i ? "5" : "3"}
                    fill="#ffffff"
                    stroke={s.color}
                    strokeWidth="2"
                    className="transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                ))}
              </g>
            );
          })
        )}

        {/* Interactive Hover Tooltip */}
        {hasData && hoveredIdx !== null && (
          <g>
            <line
              x1={getX(hoveredIdx)}
              y1={paddingTop}
              x2={getX(hoveredIdx)}
              y2={svgHeight - paddingBottom}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            {series.map((s, sIdx) => {
              const val = s.values[hoveredIdx];
              if (val === undefined) return null;
              const x = getX(hoveredIdx);
              const y = getY(val);
              return (
                <g key={sIdx}>
                  <rect
                    x={x > svgWidth - 85 ? x - 75 : x + 6}
                    y={y - 12}
                    width="70"
                    height="20"
                    rx="4"
                    fill="#0f172a"
                    opacity="0.9"
                  />
                  <text
                    x={x > svgWidth - 85 ? x - 40 : x + 41}
                    y={y + 2}
                    textAnchor="middle"
                    className="text-[10px] fill-white font-bold"
                  >
                    {unit}
                    {val.toLocaleString()}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
}

// --- SVG DONUT CHART COMPONENT (PERFECT CIRCLE FIT) ---
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  percentage?: string;
}

export function SvgDonutChart({
  segments,
  totalLabel = "Total",
  totalValue,
  size = 170,
  innerRadius = 48,
  outerRadius = 70,
}: {
  segments: DonutSegment[];
  totalLabel?: string;
  totalValue: string | number;
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalNumeric = segments.reduce((acc, s) => acc + s.value, 0);
  const center = size / 2;
  const strokeWidth = outerRadius - innerRadius;
  const midRadius = (innerRadius + outerRadius) / 2;

  let cumulativeAngle = -Math.PI / 2; // Start from top 12 o'clock

  const arcs = totalNumeric > 0 ? segments.map((seg, i) => {
    const fraction = seg.value / totalNumeric;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = center + outerRadius * Math.cos(startAngle);
    const y1 = center + outerRadius * Math.sin(startAngle);
    const x2 = center + outerRadius * Math.cos(endAngle);
    const y2 = center + outerRadius * Math.sin(endAngle);

    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(startAngle);
    const y4 = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");

    const pctStr = seg.percentage ?? `${((seg.value / totalNumeric) * 100).toFixed(1)}%`;

    return {
      ...seg,
      pctStr,
      pathData,
      index: i,
    };
  }) : [];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
      {/* SVG Donut Visual */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          {totalNumeric === 0 ? (
            /* Empty Gray Circle if Zero Data */
            <circle
              cx={center}
              cy={center}
              r={midRadius}
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : segments.length === 1 ? (
            /* PERFECT Circle stroke when 100% of data belongs to 1 category */
            <circle
              cx={center}
              cy={center}
              r={midRadius}
              stroke={segments[0]!.color}
              strokeWidth={strokeWidth}
              fill="none"
              className="transition-opacity cursor-pointer duration-150"
              opacity={hoveredIndex === null || hoveredIndex === 0 ? 1 : 0.4}
              onMouseEnter={() => setHoveredIndex(0)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ) : (
            arcs.map((arc) => (
              <path
                key={arc.index}
                d={arc.pathData}
                fill={arc.color}
                className="transition-opacity cursor-pointer duration-150"
                opacity={hoveredIndex === null || hoveredIndex === arc.index ? 1 : 0.4}
                onMouseEnter={() => setHoveredIndex(arc.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))
          )}
        </svg>

        {/* Center Text Badge */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
            {totalLabel}
          </span>
          <span className="text-sm font-extrabold text-slate-900 leading-tight mt-0.5">
            {totalNumeric === 0 ? "0" : typeof totalValue === "number" ? totalValue.toLocaleString() : totalValue}
          </span>
        </div>
      </div>

      {/* Legend Column (Clean Full Name Labels, No Truncation Glitches) */}
      <div className="flex-1 space-y-1.5 min-w-0 w-full text-xs">
        {totalNumeric === 0 ? (
          <p className="text-xs text-slate-400 font-medium text-center py-4">No categories recorded</p>
        ) : (
          segments.map((seg, i) => {
            const pctStr = seg.percentage ?? `${((seg.value / totalNumeric) * 100).toFixed(1)}%`;
            return (
              <div
                key={seg.label}
                className={cn(
                  "flex items-center justify-between p-1 rounded-md transition-colors cursor-pointer text-xs",
                  hoveredIndex === i ? "bg-slate-100 font-bold" : "hover:bg-slate-50",
                )}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">
                    {seg.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-900 font-bold text-right shrink-0 ml-1.5 whitespace-nowrap">
                  {seg.value.toLocaleString()}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">({pctStr})</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// --- SVG BAR CHART COMPONENT ---
export interface BarItem {
  label: string;
  value: number;
  color: string;
}

export function SvgBarChart({
  bars,
  height = 160,
  avgLine,
  unit = "%",
}: {
  bars: BarItem[];
  height?: number;
  avgLine?: { value: number; label: string };
  unit?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxBarVal = Math.max(...bars.map((b) => b.value), 0);
  const maxValue = Math.max(maxBarVal > 0 ? maxBarVal * 1.15 : 100, 100);

  const paddingLeft = 32;
  const paddingBottom = 26;
  const paddingTop = 12;
  const paddingRight = 12;

  const svgWidth = 450;
  const svgHeight = height;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const barGap = bars.length ? chartWidth / bars.length : chartWidth;
  const barWidth = Math.max(8, barGap * 0.55);

  const getY = (val: number) => {
    return paddingTop + chartHeight - (val / maxValue) * chartHeight;
  };

  const hasData = bars.some((b) => b.value > 0);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto text-slate-400 select-none"
        style={{ minWidth: "280px" }}
      >
        {/* Y Ticks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 4}
                y={y + 3}
                textAnchor="end"
                className="text-[9px] fill-slate-400 font-medium"
              >
                {tick}
                {unit}
              </text>
            </g>
          );
        })}

        {!hasData ? (
          <text
            x={svgWidth / 2}
            y={svgHeight / 2}
            textAnchor="middle"
            className="text-xs fill-slate-400 font-semibold"
          >
            No attendance entries logged
          </text>
        ) : (
          bars.map((bar, i) => {
            const x = paddingLeft + i * barGap + barGap / 2 - barWidth / 2;
            const y = getY(bar.value);
            const barH = paddingTop + chartHeight - y;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="3"
                  fill={bar.color}
                  opacity={hoveredIdx === null || hoveredIdx === i ? 0.9 : 0.4}
                  className="transition-opacity cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
                <text
                  x={x + barWidth / 2}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  className="text-[8px] fill-slate-400 font-medium"
                >
                  {bar.label}
                </text>
              </g>
            );
          })
        )}

        {/* Avg Threshold Line */}
        {avgLine && hasData && (
          <g>
            <line
              x1={paddingLeft}
              y1={getY(avgLine.value)}
              x2={svgWidth - paddingRight}
              y2={getY(avgLine.value)}
              stroke="#2563eb"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <text
              x={svgWidth - paddingRight - 4}
              y={getY(avgLine.value) - 4}
              textAnchor="end"
              className="text-[9px] fill-brand-700 font-bold"
            >
              {avgLine.label} ({avgLine.value}%)
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function cn(...classes: Array<string | boolean | undefined>) {
  return classes.filter(Boolean).join(" ");
}
