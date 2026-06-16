import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type { CurveData, CurveSamplePoint } from '../types/curve';

interface NdtCurveChartProps {
  curveData: CurveData;
}

function formatNumber(value?: number, digits = 2) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '-';
  }

  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(digits);
}

function getXAxisValue(point: CurveSamplePoint, unit: 'mm' | 'px') {
  return unit === 'mm' ? (point.distanceMm ?? point.distancePx) : point.distancePx;
}

export default function NdtCurveChart({ curveData }: NdtCurveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const xAxisUnit = curveData.sampleOptions.xAxisUnit;

  const seriesData = useMemo(
    () =>
      curveData.points.map(point => ({
        value: [getXAxisValue(point, xAxisUnit), point.rawValue],
        point,
      })),
    [curveData.points, xAxisUnit]
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, 'dark');
    }

    const chart = chartRef.current;

    chart.setOption({
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        top: 28,
        right: 24,
        bottom: 58,
        left: 58,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: params => {
          const item = Array.isArray(params) ? params[0] : params;
          const point = item?.data?.point as CurveSamplePoint | undefined;

          if (!point) {
            return '';
          }

          return [
            `Index: ${point.index}`,
            `Distance: ${formatNumber(getXAxisValue(point, xAxisUnit))} ${xAxisUnit}`,
            `Image: (${point.imageX}, ${point.imageY})`,
            `Raw Value: ${formatNumber(point.rawValue)}`,
          ].join('<br/>');
        },
      },
      xAxis: {
        type: 'value',
        name: `Distance (${xAxisUnit})`,
        nameTextStyle: {
          color: '#94a3b8',
        },
        axisLine: {
          lineStyle: {
            color: '#475569',
          },
        },
        axisLabel: {
          color: '#cbd5e1',
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.16)',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Raw Pixel Value',
        nameTextStyle: {
          color: '#94a3b8',
        },
        axisLine: {
          lineStyle: {
            color: '#475569',
          },
        },
        axisLabel: {
          color: '#cbd5e1',
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.16)',
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          throttle: 50,
        },
        {
          type: 'slider',
          height: 22,
          bottom: 14,
          borderColor: '#334155',
          fillerColor: 'rgba(56, 189, 248, 0.22)',
          handleStyle: {
            color: '#38bdf8',
          },
          textStyle: {
            color: '#cbd5e1',
          },
        },
      ],
      series: [
        {
          name: 'Raw Pixel Value',
          type: 'line',
          data: seriesData,
          showSymbol: false,
          smooth: false,
          lineStyle: {
            width: 2,
            color: '#38bdf8',
          },
          emphasis: {
            focus: 'series',
          },
          markPoint: {
            symbolSize: 48,
            label: {
              color: '#020617',
              fontWeight: 700,
            },
            data: [
              { type: 'max', name: 'Max' },
              { type: 'min', name: 'Min' },
            ],
          },
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(containerRef.current);
    chart.resize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [curveData.curveId, seriesData, xAxisUnit]);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[260px] w-full"
    />
  );
}
