"use client";

import React from "react";
import { motion } from "@/shared/components/motion/motion-elements";

interface DonutGaugeProps {
  percentage: number;
  label: string;
  color?: "blue" | "indigo" | "emerald" | "amber" | "cyan";
  size?: number;
  displayValue?: string;
}

const COLOR_MAP = {
  blue: {
    stroke: "#2563EB",
    bg: "rgba(37, 99, 235, 0.12)",
    text: "text-blue-600 dark:text-blue-400",
  },
  indigo: {
    stroke: "#6366F1",
    bg: "rgba(99, 102, 241, 0.12)",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  emerald: {
    stroke: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    stroke: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "text-amber-600 dark:text-amber-400",
  },
  cyan: {
    stroke: "#06B6D4",
    bg: "rgba(6, 182, 212, 0.12)",
    text: "text-cyan-600 dark:text-cyan-400",
  },
};

export function DonutGauge({
  percentage,
  label,
  color = "blue",
  size = 64,
  displayValue,
}: DonutGaugeProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validPercentage = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (validPercentage / 100) * circumference;
  const config = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex flex-col items-center text-center p-2 rounded-2xl hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
        >
          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800"
          />
          {/* Active progress circle with spring-like smooth motion */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={config.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Percentage Text */}
        <span className="absolute font-mono text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
          {displayValue ?? `${validPercentage}%`}
        </span>
      </div>

      {/* Label under gauge */}
      <span className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400 line-clamp-1 max-w-[90px] text-center">
        {label}
      </span>
    </motion.div>
  );
}
