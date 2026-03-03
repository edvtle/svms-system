import React from "react";

const AnalyticsLineGraph = ({ data = [], color = "#A3AED0", height = 48 }) => {
  // Simple SVG line graph generator
  const width = 220;
  const points = data.length > 1
    ? data.map((v, i) => `${(i / (data.length - 1)) * width},${height - v}`).join(" ")
    : "";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-12">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        points={points}
        style={{ filter: "drop-shadow(0 2px 6px #A3AED0AA)" }}
      />
      <rect x="0" y={height - 1} width={width} height="1" fill="#A3AED0" opacity="0.3" />
    </svg>
  );
};

export default AnalyticsLineGraph;
