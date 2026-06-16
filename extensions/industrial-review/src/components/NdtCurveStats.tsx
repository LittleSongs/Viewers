import React from 'react';
import type { CurveStatistics } from '../types/curve';

interface NdtCurveStatsProps {
  statistics: CurveStatistics;
}

function formatNumber(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '-';
  }

  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
}

function StatItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-border bg-background/80 min-w-0 rounded border px-3 py-2">
      <div className="text-muted-foreground text-[11px] leading-4">{label}</div>
      <div className="text-foreground truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

export default function NdtCurveStats({ statistics }: NdtCurveStatsProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      <StatItem
        label="Max"
        value={formatNumber(statistics.maxValue)}
      />
      <StatItem
        label="Min"
        value={formatNumber(statistics.minValue)}
      />
      <StatItem
        label="Mean"
        value={formatNumber(statistics.meanValue)}
      />
      <StatItem
        label="Range"
        value={formatNumber(statistics.range)}
      />
      <StatItem
        label="Samples"
        value={statistics.sampleCount}
      />
    </div>
  );
}
