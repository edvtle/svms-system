

import React from 'react';

const StatCard = ({ 
  title, 
  value, 
  percentage = 0, 
  icon,
  comparisonLabel = 'vs last semester',
  iconBgColor = 'bg-cyan-500/20',
  iconColor = 'text-cyan-400',
  className = '' 
}) => {
  const isPositive = percentage >= 0;

  return (
    <div className={`bg-gradient-to-br from-[#1E1F22] to-[#26282c] rounded-xl p-4 min-h-[100px] border border-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-white/5 hover:border-white/20 hover:scale-[1.02] h-full ${className}`}>
      <div className="flex flex-col h-full justify-center gap-3">
        {/* Top Row: Value and Icon (icon only if provided) */}
        <div className="flex justify-between items-center gap-3">
          <p className="text-3xl sm:text-4xl font-bold text-white leading-none break-words">
            {value}
          </p>
          {icon && (
            <div className={`${iconBgColor} p-2.5 rounded-lg`}>
              {icon}
            </div>
          )}
        </div>
        {/* Bottom Row: Title and Percentage */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-end">
          <p className="text-gray-400 text-xs sm:text-sm font-bold leading-snug break-words max-w-[12rem]">
            {title}
          </p>
          <div className="flex flex-col items-start sm:items-end">
            <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{percentage}%
            </span>
            <span className="text-[11px] text-gray-500">{comparisonLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
