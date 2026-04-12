import React from "react";

const AnalyticsLineGraph = ({
  data = [],
  color = "#A3AED0",
  height = 48,
  showDots = true,
}) => {
  const width = 320;
  const topPadding = 10;
  const bottomPadding = 12;
  const sidePadding = 10;
  const safeValues = Array.isArray(data) ? data.map((value) => Number(value) || 0) : [];
  const maxValue = Math.max(...safeValues, 1);

  const points =
    safeValues.length > 0
      ? safeValues.map((value, index) => {
          const x =
            safeValues.length === 1
              ? width / 2
              : sidePadding + (index / (safeValues.length - 1)) * (width - sidePadding * 2);
          const y =
            topPadding +
            ((maxValue - value) / maxValue) * (height - topPadding - bottomPadding);
          return { x, y };
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

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <line
        x1={sidePadding}
        y1={height - bottomPadding}
        x2={width - sidePadding}
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
            <circle key={`dot-${index}`} cx={point.x} cy={point.y} r="2.2" fill={color} fillOpacity="0.9" />
          ))
        : null}
    </svg>
  );
};

export default AnalyticsLineGraph;
