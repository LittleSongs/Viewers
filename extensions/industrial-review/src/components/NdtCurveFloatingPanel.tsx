import React, { useMemo, useState } from 'react';
import { Icons } from '@ohif/ui-next';
import type { CurveData } from '../types/curve';
import useDraggableResizable from '../hooks/useDraggableResizable';
import NdtCurveChart from './NdtCurveChart';
import NdtCurveStats from './NdtCurveStats';

interface NdtCurveFloatingPanelProps {
  curveData: CurveData;
  onClose: () => void;
}

const ChartIcon = Icons['tab-linear'] || Icons.TabLinear || Icons.MissingIcon;
const CloseIcon = Icons.Close || Icons.close || Icons.MissingIcon;
const MinimizeIcon = Icons.Minus || Icons.MissingIcon;
const MoveIcon = Icons.ToolMove || Icons['tool-move'] || Icons.MissingIcon;

function formatNumber(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '-';
  }

  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
}

export default function NdtCurveFloatingPanel({ curveData, onClose }: NdtCurveFloatingPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const { style, startDrag, startResize } = useDraggableResizable({
    initialPosition: {
      x: Math.max(16, window.innerWidth - 640),
      y: 88,
    },
    initialSize: {
      width: 600,
      height: 520,
    },
    minSize: {
      width: 440,
      height: 320,
    },
  });
  const distanceUnit = curveData.sampleOptions.xAxisUnit;
  const totalDistance = useMemo(() => {
    const lastPoint = curveData.points[curveData.points.length - 1];
    return distanceUnit === 'mm' ? lastPoint?.distanceMm : lastPoint?.distancePx;
  }, [curveData.points, distanceUnit]);

  return (
    <div
      className="border-border bg-popover text-popover-foreground fixed z-[10000] flex overflow-hidden rounded border shadow-2xl"
      style={{
        ...style,
        height: isMinimized ? 48 : style.height,
      }}
    >
      <div className="flex min-h-0 w-full flex-col">
        <div
          className="border-border bg-muted/30 flex h-12 shrink-0 cursor-move select-none items-center gap-3 border-b px-3"
          onPointerDown={startDrag}
        >
          <div className="border-border bg-background flex h-7 w-7 shrink-0 items-center justify-center rounded border">
            <ChartIcon className="text-primary h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-foreground flex items-center gap-2 truncate text-sm font-semibold">
              <span>灰度曲线分析</span>
              <MoveIcon className="text-muted-foreground h-3.5 w-3.5" />
            </div>
            <div className="text-muted-foreground truncate text-[11px]">
              {`Length ${curveData.source.measurementUid || '-'} · ${formatNumber(totalDistance)} ${distanceUnit}`}
            </div>
          </div>
          <button
            type="button"
            className="hover:bg-accent flex h-7 w-7 items-center justify-center rounded"
            title={isMinimized ? '还原' : '最小化'}
            onPointerDown={event => event.stopPropagation()}
            onClick={() => setIsMinimized(value => !value)}
          >
            <MinimizeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hover:bg-destructive/20 hover:text-destructive flex h-7 w-7 items-center justify-center rounded"
            title="关闭"
            onPointerDown={event => event.stopPropagation()}
            onClick={onClose}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {!isMinimized && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <div className="border-border bg-background min-h-0 flex-1 rounded border">
              <NdtCurveChart curveData={curveData} />
            </div>
            <NdtCurveStats statistics={curveData.statistics} />
            <div className="text-muted-foreground grid grid-cols-2 gap-2 text-[11px]">
              <div className="truncate">
                {`起点 (${curveData.geometry.start.x}, ${curveData.geometry.start.y})`}
              </div>
              <div className="truncate text-right">
                {`终点 (${curveData.geometry.end.x}, ${curveData.geometry.end.y})`}
              </div>
            </div>
          </div>
        )}
      </div>

      {!isMinimized && (
        <button
          type="button"
          className="border-border bg-muted/50 absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize rounded-tl border-l border-t"
          aria-label="调整灰度曲线窗口大小"
          onPointerDown={startResize}
        />
      )}
    </div>
  );
}
