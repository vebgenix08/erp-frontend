import { useState } from "react";

// --- SVG LINE & AREA CHART COMPONENT ---
export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

function formatAxisValue(value: number, unit: string) {
  if (unit !== "₹") return `${unit}${Math.round(value).toLocaleString("en-IN")}`;
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${Math.round(value / 1_000)}K`;
  return `₹${Math.round(value)}`;
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
  const maxValue = yMax ?? (maxValInSeries > 0 ? maxValInSeries * 1.2 : 1000);

  const paddingLeft = 48;
  const paddingBottom = 28;
  const paddingTop = 16;
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
  const maxXLabels = 6;
  const xTickStep = Math.max(1, Math.ceil((labels.length - 1) / (maxXLabels - 1)));
  const visibleLabelIndexes = new Set(
    labels
      .map((_, index) => index)
      .filter((index) => index === 0 || index === labels.length - 1 || index % xTickStep === 0),
  );

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="h-auto w-full select-none overflow-visible text-slate-400"
        style={{ minWidth: "280px" }}
        role="img"
        aria-label="Daily fee collections for the selected period"
      >
        <defs>
          <linearGradient id="line-gradient-brand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

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
                {formatAxisValue(tick, unit)}
              </text>
            </g>
          );
        })}

        {/* X Labels */}
        {labels.map((label, i) =>
          visibleLabelIndexes.has(i) ? (
            <text
              key={i}
              x={getX(i)}
              y={svgHeight - 6}
              textAnchor="middle"
              className="text-[9px] fill-slate-400 font-medium"
            >
              {label}
            </text>
          ) : null,
        )}

        {/* Baseline / Area / Curve */}
        {series.map((s, sIdx) => {
          const points = s.values.map((v, i) => ({ x: getX(i), y: getY(v), val: v }));
          const pathD = points.reduce((acc, pt, i) => {
            return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
          }, "");
          const areaD = `${pathD} L ${getX(points.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

          return (
            <g key={sIdx}>
              {/* Gradient Area Fill */}
              <path d={areaD} fill="url(#line-gradient-brand)" />

              {/* Main Line */}
              <path
                d={pathD}
                fill="none"
                stroke={hasData ? s.color : "#94a3b8"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={hasData ? "0" : "4 4"}
              />

              {/* Data Points */}
              {points.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIdx === i ? "5" : pt.val > 0 ? "3.5" : "2.5"}
                  fill="#ffffff"
                  stroke={hasData ? s.color : "#94a3b8"}
                  strokeWidth="2"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              ))}

              {points.map((pt, i) => (
                <rect
                  key={`hit-${i}`}
                  x={pt.x - Math.max(5, chartWidth / Math.max(labels.length, 1) / 2)}
                  y={paddingTop}
                  width={Math.max(10, chartWidth / Math.max(labels.length, 1))}
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              ))}
            </g>
          );
        })}

        {/* Interactive Hover Tooltip */}
        {hoveredIdx !== null && (
          <g>
            <line
              x1={getX(hoveredIdx)}
              y1={paddingTop}
              x2={getX(hoveredIdx)}
              y2={svgHeight - paddingBottom}
              stroke="#94a3b8"
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
                    x={x > svgWidth - 95 ? x - 85 : x + 8}
                    y={Math.max(paddingTop, y - 14)}
                    width="78"
                    height="22"
                    rx="6"
                    fill="#0f172a"
                    className="drop-shadow-md"
                  />
                  <text
                    x={x > svgWidth - 95 ? x - 46 : x + 47}
                    y={Math.max(paddingTop, y - 14) + 14}
                    textAnchor="middle"
                    className="text-[10px] fill-white font-bold"
                  >
                    {formatAxisValue(val, unit)}
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

// --- SVG BAR CHART COMPONENT ---
export interface BarItem {
  label: string;
  value: number;
  color?: string;
  secondaryText?: string;
}

export function SvgBarChart({
  items,
  height = 160,
  unit = "",
  highlightMax = true,
}: {
  items: BarItem[];
  height?: number;
  unit?: string;
  highlightMax?: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(...items.map((it) => it.value), 1);
  const paddingLeft = 32;
  const paddingBottom = 26;
  const paddingTop = 16;
  const paddingRight = 16;

  const svgWidth = 460;
  const svgHeight = height;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const barWidth = Math.min(32, Math.max(16, (chartWidth / Math.max(items.length, 1)) * 0.65));
  const gap = (chartWidth - barWidth * items.length) / Math.max(items.length - 1, 1);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="h-auto w-full select-none overflow-visible"
      >
        {/* Background Grid Lines */}
        {[0, 0.5, 1].map((frac, i) => {
          const y = paddingTop + chartHeight * (1 - frac);
          return (
            <g key={i}>
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
                x={paddingLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="text-[9px] fill-slate-400 font-medium"
              >
                {formatAxisValue(maxValue * frac, unit)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {items.map((item, idx) => {
          const barHeight = Math.max(4, (item.value / maxValue) * chartHeight);
          const x = paddingLeft + idx * (barWidth + gap);
          const y = paddingTop + chartHeight - barHeight;
          const isMax = highlightMax && item.value === maxValue && item.value > 0;
          const barColor = item.color || (isMax ? "#3b82f6" : "#60a5fa");

          return (
            <g
              key={item.label}
              className="transition-all cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Bar Rect */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={barColor}
                opacity={hoveredIdx === null || hoveredIdx === idx ? 1 : 0.4}
                className="transition-opacity duration-150"
              />

              {/* Bar Value on Top if Hovered or Highlight */}
              {(hoveredIdx === idx || isMax) && item.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="text-[9px] font-extrabold fill-slate-800"
                >
                  {formatAxisValue(item.value, unit)}
                </text>
              )}

              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={svgHeight - 6}
                textAnchor="middle"
                className="text-[9px] font-semibold fill-slate-600 truncate"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- SVG RADIAL / SEMI-CIRCLE GAUGE COMPONENT ---
export function SvgRadialGauge({
  percentage,
  label = "Rate",
  subtext = "",
  size = 140,
  strokeWidth = 12,
  color = "#10b981",
}: {
  percentage: number;
  label?: string;
  subtext?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Center percentage label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-xl font-extrabold text-slate-900 leading-tight">
          {percentage.toFixed(1)}%
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
          {label}
        </span>
        {subtext && (
          <span className="text-[9px] font-semibold text-slate-500 mt-0.5">{subtext}</span>
        )}
      </div>
    </div>
  );
}

// --- PAYMENT METHODS BREAKDOWN COMPONENT ---
export interface PaymentMethodItem {
  method: string;
  paymentCount: number;
  amountMinor: number;
  color?: string;
}

const METHOD_COLORS: Record<string, string> = {
  CASH: "#10b981",
  UPI: "#6366f1",
  ONLINE: "#3b82f6",
  NET_BANKING: "#0ea5e9",
  CHEQUE: "#f59e0b",
  DEMAND_DRAFT: "#8b5cf6",
  CARD: "#ec4899",
  BANK_TRANSFER: "#14b8a6",
};

export function PaymentMethodsBreakdown({
  items,
  totalAmountMinor,
}: {
  items: PaymentMethodItem[];
  totalAmountMinor: number;
}) {
  const money = (minor: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(minor / 100);

  const displayItems = items;

  return (
    <div className="space-y-3">
      {/* Multi-segment stacked bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
        {totalAmountMinor > 0 ? (
          displayItems.map((item) => {
            const pct = totalAmountMinor > 0 ? (item.amountMinor / totalAmountMinor) * 100 : 0;
            if (pct <= 0) return null;
            const color = item.color || METHOD_COLORS[item.method] || "#64748b";
            return (
              <div
                key={item.method}
                style={{ width: `${pct}%`, backgroundColor: color }}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                title={`${item.method.replace(/_/g, " ")}: ${money(item.amountMinor)} (${pct.toFixed(1)}%)`}
              />
            );
          })
        ) : (
          <div className="h-full w-full rounded-full bg-slate-200" title="No collections today" />
        )}
      </div>

      {/* Method items list */}
      {displayItems.length ? (
        <div className="grid grid-cols-2 gap-2">
          {displayItems.map((item) => {
            const pct = totalAmountMinor > 0 ? (item.amountMinor / totalAmountMinor) * 100 : 0;
            const color = item.color || METHOD_COLORS[item.method] || "#64748b";
            const label = item.method.replace(/_/g, " ");

            return (
              <div
                key={item.method}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 p-2 transition-all hover:bg-slate-100/80"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{label}</p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      {item.paymentCount} rx · {pct.toFixed(0)}%
                    </p>
                  </div>
                </div>
                <p className="text-[11px] font-extrabold text-slate-900 shrink-0 ml-1">
                  {money(item.amountMinor)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center text-xs text-slate-500">
          No payment-method activity recorded for this period.
        </p>
      )}
    </div>
  );
}

// --- SVG DONUT CHART COMPONENT ---
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

  let cumulativeAngle = -Math.PI / 2;

  const arcs =
    totalNumeric > 0
      ? segments.map((seg, i) => {
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
        })
      : [];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          {totalNumeric === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={midRadius}
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : segments.length === 1 ? (
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
                className="transition-all cursor-pointer duration-150"
                opacity={hoveredIndex === null || hoveredIndex === arc.index ? 1 : 0.4}
                onMouseEnter={() => setHoveredIndex(arc.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
            {totalLabel}
          </span>
          <span className="text-base font-extrabold text-slate-900 leading-tight mt-0.5">
            {totalNumeric === 0
              ? "0"
              : typeof totalValue === "number"
                ? totalValue.toLocaleString()
                : totalValue}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-1 min-w-0 w-full text-xs max-h-[160px] overflow-y-auto pr-1">
        {totalNumeric === 0 ? (
          <p className="text-xs text-slate-400 font-medium text-center py-4">
            No categories recorded
          </p>
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
                    className="h-2 w-2 rounded-full shrink-0"
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

function cn(...classes: Array<string | boolean | undefined>) {
  return classes.filter(Boolean).join(" ");
}
