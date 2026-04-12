import React, { useState } from "react";

const AnalyticsLineGraph = ({
  data = [],
  color = "#A3AED0",
  height = 48,
  showDots = true,
  showAxis = false,
  showHoverLabel = false,
}) => {
  const width = 320;
  const showAxes = Boolean(showAxis);
  const topPadding = 14;
  const bottomPadding = showAxes ? 24 : 16;
  const leftPadding = showAxes ? 36 : 10;
  const rightPadding = 10;
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const safeValues = Array.isArray(data) ? data.map((value) => Number(value) || 0) : [];
  const maxValue = Math.max(...safeValues, 1);

  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;
  const points =
    safeValues.length > 0
      ? safeValues.map((value, index) => {
          const x =
            safeValues.length === 1
              ? leftPadding + chartWidth / 2
              : leftPadding + (index / (safeValues.length - 1)) * chartWidth;
          const y =
            topPadding +
            ((maxValue - value) / maxValue) * chartHeight;
          return { x, y, value };
        })
      : [];

  const path = points.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const prev = points[index - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${acc} Q ${cpX} ${prev.y}, ${point.x} ${point.y}`;
  }, "");

  const yTicks = showAxes
    ? Array.from(
        new Set([
          0,
          Math.round(maxValue / 3),
          Math.round((maxValue * 2) / 3),
          maxValue,
        ]),
      ).sort((a, b) => a - b)
    : [];

  const activePoint = hoveredPointIndex != null ? points[hoveredPointIndex] : null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      {showAxes &&
        yTicks.map((tick) => {
          const y = topPadding + ((maxValue - tick) / maxValue) * chartHeight;
          return (
            <g key={`tick-${tick}`}>
              <line
                x1={leftPadding}
                y1={y}
                x2={width - rightPadding}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
              <text
                x={leftPadding - 10}
                y={y + 4}
                fill="rgba(226,232,240,0.7)"
                fontSize="10"
                textAnchor="end"
              >
                {tick}
              </text>
            </g>
          );
        })}
      <line
        x1={leftPadding}
        y1={height - bottomPadding}
        x2={width - rightPadding}
        y2={height - bottomPadding}
        stroke={color}
        strokeOpacity="0.25"
      />
      {path ? (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 2px 6px #A3AED0AA)" }}
        />
      ) : null}
      {showDots
        ? points.map((point, index) => (
            <g key={`dot-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="transparent"
                onMouseEnter={() => setHoveredPointIndex(index)}
                onMouseLeave={() => setHoveredPointIndex(null)}
                style={{ cursor: showHoverLabel ? "pointer" : "default" }}
              />
              <circle cx={point.x} cy={point.y} r="3.5" fill={color} fillOpacity="0.95" />
            </g>
          ))
        : null}
      {showHoverLabel && activePoint ? (
        <g pointerEvents="none">
          <rect
            x={Math.min(width - rightPadding - 110, activePoint.x + 8)}
            y={Math.max(8, activePoint.y - 28)}
            rx="8"
            width="100"
            height="22"
            fill="rgba(15,23,42,0.92)"
            stroke="rgba(148,163,184,0.28)"
          />
          <text
            x={Math.min(width - rightPadding - 60, activePoint.x + 58)}
            y={Math.max(24, activePoint.y - 10)}
            fill="#f8fafc"
            fontSize="11"
            fontWeight="600"
            textAnchor="middle"
          >
            {activePoint.value}
          </text>
        </g>
      ) : null}
    </svg>
  );
};

export default AnalyticsLineGraph;
