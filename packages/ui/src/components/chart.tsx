"use client";

import { cn } from "@ticket-app/ui/lib/utils";
import { LoaderIcon } from "lucide-react";
import * as React from "react";

interface ChartLegend {
  display?: boolean;
  position?: "top" | "bottom" | "left" | "right";
}

export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface ChartConfig {
  [key: string]: {
    label?: string;
    color?: string;
  };
}

interface ChartProps extends React.ComponentProps<"div"> {
  data: ChartData[];
  type?: "line" | "bar" | "pie";
  config?: ChartConfig;
  legend?: ChartLegend;
  loading?: boolean;
  height?: number;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
}

function Chart({
  className,
  data = [],
  type = "bar",
  config = {},
  legend = { display: true, position: "bottom" },
  loading = false,
  height = 300,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  ...props
}: ChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const colors = React.useMemo(() => {
    const defaultColors = [
      "hsl(var(--primary))",
      "hsl(var(--chart-1, 220 90% 50%))",
      "hsl(var(--chart-2, 160 60% 45%))",
      "hsl(var(--chart-3, 30 80% 50%))",
      "hsl(var(--chart-4, 280 65% 55%))",
      "hsl(var(--chart-5, 340 75% 55%))",
    ];

    return data.map((item, idx) => item.color || config[item.label]?.color || defaultColors[idx % defaultColors.length]);
  }, [data, config]);

  const maxValue = Math.max(...data.map((d) => d.value), 0);

  const renderLineChart = () => {
    const padding = 40;
    const chartWidth = 100;
    const chartHeight = 100;
    const points = data.map((d, idx) => ({
      x: padding + (idx / Math.max(data.length - 1, 1)) * (chartWidth - padding * 2),
      y: chartHeight - padding - (d.value / maxValue) * (chartHeight - padding * 2),
      ...d,
    }));

    const pathD = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="size-full">
        {showGrid && (
          <g>
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                y1={padding + (1 - ratio) * (chartHeight - padding * 2)}
                x2={chartWidth - padding}
                y2={padding + (1 - ratio) * (chartHeight - padding * 2)}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="2 2"
              />
            ))}
          </g>
        )}
        <path
          d={pathD}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--primary)"
          />
        ))}
      </svg>
    );
  };

  const renderBarChart = () => {
    const padding = 40;
    const chartWidth = 100;
    const chartHeight = 100;
    const barWidth = (chartWidth - padding * 2) / data.length * 0.6;
    const gap = (chartWidth - padding * 2) / data.length * 0.4;

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="size-full">
        {showGrid && (
          <g>
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                y1={padding + (1 - ratio) * (chartHeight - padding * 2)}
                x2={chartWidth - padding}
                y2={padding + (1 - ratio) * (chartHeight - padding * 2)}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="2 2"
              />
            ))}
          </g>
        )}
        {data.map((d, idx) => {
          const barHeight = maxValue > 0 ? (d.value / maxValue) * (chartHeight - padding * 2) : 0;
          const x = padding + idx * (barWidth + gap) + gap / 2;
          const y = chartHeight - padding - barHeight;

          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={colors[idx]}
                rx="0"
              />
              {d.label && showXAxis && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - padding + 8}
                  textAnchor="middle"
                  fontSize="3"
                  fill="currentColor"
                  className="text-muted-foreground"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  const renderPieChart = () => {
    const cx = 50;
    const cy = 50;
    const r = 40;
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = -90;

    if (total === 0) {
      return (
        <svg viewBox="0 0 100 100" className="size-full">
          <circle cx={cx} cy={cy} r={r} fill="var(--muted)" />
        </svg>
      );
    }

    const slices = data.map((d, idx) => {
      const angle = (d.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const pathD = [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");

      return { pathD, color: colors[idx], label: d.label, value: d.value };
    });

    return (
      <svg viewBox="0 0 100 100" className="size-full">
        {slices.map((slice, idx) => (
          <path
            key={idx}
            d={slice.pathD}
            fill={slice.color}
            stroke="var(--background)"
            strokeWidth="1"
          />
        ))}
      </svg>
    );
  };

  if (!mounted) {
    return (
      <div
        data-slot="chart"
        className={cn("relative", className)}
        style={{ height }}
        {...props}
      >
        <div className="flex items-center justify-center h-full">
          <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div data-slot="chart" className={cn("relative", className)} {...props}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="relative" style={{ height }}>
        {type === "line" && renderLineChart()}
        {type === "bar" && renderBarChart()}
        {type === "pie" && renderPieChart()}
      </div>

      {legend.display && (
        <div
          className={cn(
            "flex flex-wrap gap-4 pt-2",
            legend.position === "top" && "justify-center",
            legend.position === "bottom" && "justify-center",
            legend.position === "left" && "flex-col",
            legend.position === "right" && "flex-col"
          )}
        >
          {data.map((d, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: colors[idx] }}
              />
              <span className="text-muted-foreground">
                {config[d.label]?.label || d.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { Chart };
