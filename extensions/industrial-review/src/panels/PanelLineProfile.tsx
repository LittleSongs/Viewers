import React, { useCallback, useMemo } from 'react';
import { useSystem } from '@ohif/core';
import { useMeasurements } from '@ohif/extension-cornerstone';
import { Button, Icons, PanelSection } from '@ohif/ui-next';
import { useViewportGrid } from '@ohif/ui-next';
import useNdtViewerContext from '../hooks/useNdtViewerContext';
import {
  buildLineProfilePolyline,
  sampleLineProfile,
  type Point3,
  type LineProfilePoint,
} from '../utils/lineProfile';

const ChartIcon = Icons['tab-linear'] || Icons.TabLinear || Icons.MissingIcon;
const CHART_WIDTH = 360;
const CHART_HEIGHT = 220;
const CHART_PADDING = 32;

interface LengthMeasurement {
  uid: string;
  toolName: string;
  points?: number[][];
  referencedImageId?: string;
  metadata?: {
    referencedImageId?: string;
    [key: string]: unknown;
  };
  isSelected?: boolean;
  displayText?: {
    primary?: string[];
    secondary?: string[];
  };
}

interface ProfileResult {
  measurement?: LengthMeasurement;
  points: LineProfilePoint[];
  error?: string;
}

function toPoint3(point?: number[]): Point3 | undefined {
  if (!point || point.length < 3) {
    return undefined;
  }

  return [Number(point[0]), Number(point[1]), Number(point[2])];
}

function getMeasurementImageId(measurement: LengthMeasurement) {
  return measurement.referencedImageId || measurement.metadata?.referencedImageId;
}

function selectLineMeasurement(measurements: LengthMeasurement[], imageId?: string) {
  const completeMeasurements = measurements.filter(measurement => measurement.points?.length >= 2);
  const imageMeasurements = imageId
    ? completeMeasurements.filter(measurement => getMeasurementImageId(measurement) === imageId)
    : completeMeasurements;
  const candidates = imageMeasurements.length ? imageMeasurements : completeMeasurements;

  return (
    candidates.find(measurement => measurement.isSelected) ||
    candidates[candidates.length - 1] ||
    null
  );
}

function normalizeVoxelValue(value) {
  if (Array.isArray(value)) {
    const numericValues = value.map(Number).filter(Number.isFinite);
    if (!numericValues.length) {
      return undefined;
    }

    return numericValues.reduce((sum, current) => sum + current, 0) / numericValues.length;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function getFallbackScalarValue(scalarData, dimensions: Point3, [i, j, k]: Point3) {
  if (!scalarData) {
    return undefined;
  }

  const [width, height] = dimensions;
  return normalizeVoxelValue(scalarData[k * width * height + j * width + i]);
}

function buildProfile(viewport, measurement: LengthMeasurement | null): ProfileResult {
  if (!measurement) {
    return {
      points: [],
      error: '请先绘制一条灰度采样线。',
    };
  }

  const [startWorldRaw, endWorldRaw] = measurement.points || [];
  const startWorld = toPoint3(startWorldRaw);
  const endWorld = toPoint3(endWorldRaw);

  if (!startWorld || !endWorld) {
    return {
      measurement,
      points: [],
      error: '采样线端点无效。',
    };
  }

  const imageDataInfo = viewport?.getImageData?.();
  const imageData = imageDataInfo?.imageData;
  const worldToIndex = imageData?.worldToIndex?.bind(imageData);

  if (!imageDataInfo || !imageData || !worldToIndex) {
    return {
      measurement,
      points: [],
      error: '当前视图暂时无法读取图像像素数据。',
    };
  }

  const dimensions = (imageDataInfo.dimensions || imageData.getDimensions?.()) as Point3;
  const spacing = (imageDataInfo.spacing || imageData.getSpacing?.() || [1, 1, 1]) as Point3;
  const voxelManager = imageDataInfo.voxelManager;
  const scalarData = imageDataInfo.scalarData || imageData.getScalarData?.();

  if (!dimensions) {
    return {
      measurement,
      points: [],
      error: '当前图像缺少尺寸信息。',
    };
  }

  const points = sampleLineProfile({
    startIndex: worldToIndex(startWorld) as Point3,
    endIndex: worldToIndex(endWorld) as Point3,
    dimensions,
    spacing,
    getValue: ijk => {
      const voxelValue =
        typeof voxelManager?.getAtIJKPoint === 'function'
          ? voxelManager.getAtIJKPoint(ijk)
          : getFallbackScalarValue(scalarData, dimensions, ijk);

      return normalizeVoxelValue(voxelValue);
    },
  });

  return {
    measurement,
    points,
    error: points.length ? undefined : '采样线未穿过有效图像像素。',
  };
}

function formatNumber(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '-';
  }

  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
}

function ProfileMetric({ label, value }: { label: string; value?: number | string }) {
  return (
    <div className="border-border bg-background min-w-0 rounded border px-2 py-2">
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="text-foreground truncate text-sm font-medium">{value ?? '-'}</div>
    </div>
  );
}

function EmptyProfile({ message }: { message: string }) {
  return (
    <div className="border-border bg-background flex min-h-[280px] flex-col items-center justify-center rounded border border-dashed px-4 text-center">
      <ChartIcon className="text-primary mb-3 h-10 w-10" />
      <div className="text-foreground text-sm font-medium">灰度曲线</div>
      <div className="text-muted-foreground mt-2 text-xs leading-5">{message}</div>
    </div>
  );
}

function LineProfileChart({ points }: { points: LineProfilePoint[] }) {
  const polyline = buildLineProfilePolyline(points, {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    padding: CHART_PADDING,
  });
  const values = points.map(point => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const lastDistance = points[points.length - 1]?.distance || 0;
  const horizontalGuides = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = CHART_PADDING + ratio * (CHART_HEIGHT - CHART_PADDING * 2);
    return y;
  });
  const verticalGuides = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const x = CHART_PADDING + ratio * (CHART_WIDTH - CHART_PADDING * 2);
    return x;
  });

  return (
    <div className="border-border bg-background h-full min-h-[320px] rounded border p-3">
      <svg
        className="h-full min-h-[280px] w-full"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="灰度曲线图"
        preserveAspectRatio="none"
      >
        <rect
          x="0"
          y="0"
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          fill="transparent"
        />
        {horizontalGuides.map(y => (
          <line
            key={`h-${y}`}
            x1={CHART_PADDING}
            y1={y}
            x2={CHART_WIDTH - CHART_PADDING}
            y2={y}
            stroke="currentColor"
            className="text-muted-foreground/25"
            strokeWidth="0.75"
          />
        ))}
        {verticalGuides.map(x => (
          <line
            key={`v-${x}`}
            x1={x}
            y1={CHART_PADDING}
            x2={x}
            y2={CHART_HEIGHT - CHART_PADDING}
            stroke="currentColor"
            className="text-muted-foreground/20"
            strokeWidth="0.75"
          />
        ))}
        <line
          x1={CHART_PADDING}
          y1={CHART_HEIGHT - CHART_PADDING}
          x2={CHART_WIDTH - CHART_PADDING}
          y2={CHART_HEIGHT - CHART_PADDING}
          stroke="currentColor"
          className="text-muted-foreground"
          strokeWidth="1"
        />
        <line
          x1={CHART_PADDING}
          y1={CHART_PADDING}
          x2={CHART_PADDING}
          y2={CHART_HEIGHT - CHART_PADDING}
          stroke="currentColor"
          className="text-muted-foreground"
          strokeWidth="1"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={CHART_PADDING}
          y="18"
          className="text-muted-foreground fill-current text-[11px]"
        >
          {`max ${formatNumber(maxValue)}`}
        </text>
        <text
          x={CHART_PADDING}
          y={CHART_HEIGHT - 8}
          className="text-muted-foreground fill-current text-[11px]"
        >
          {`0 - ${formatNumber(lastDistance)} mm`}
        </text>
        <text
          x={CHART_WIDTH - CHART_PADDING}
          y={CHART_HEIGHT - 8}
          textAnchor="end"
          className="text-muted-foreground fill-current text-[11px]"
        >
          {`min ${formatNumber(minValue)}`}
        </text>
      </svg>
    </div>
  );
}

export default function PanelLineProfile() {
  const { commandsManager, servicesManager } = useSystem();
  const [{ activeViewportId }] = useViewportGrid();
  const { currentImage } = useNdtViewerContext();
  const { cornerstoneViewportService } = servicesManager.services as AppTypes.Services;
  const lengthMeasurementFilter = useCallback(measurement => measurement.toolName === 'Length', []);
  const lengthMeasurements = useMeasurements({
    measurementFilter: lengthMeasurementFilter,
  }) as LengthMeasurement[];

  const viewport = activeViewportId
    ? cornerstoneViewportService?.getCornerstoneViewport?.(activeViewportId)
    : undefined;
  const selectedMeasurement = useMemo(
    () => selectLineMeasurement(lengthMeasurements, currentImage.imageId),
    [currentImage.imageId, lengthMeasurements]
  );
  const profile = useMemo(
    () => buildProfile(viewport, selectedMeasurement),
    [selectedMeasurement, viewport, currentImage.imageId]
  );
  const values = profile.points.map(point => point.value);
  const min = values.length ? Math.min(...values) : undefined;
  const max = values.length ? Math.max(...values) : undefined;
  const lastDistance = profile.points[profile.points.length - 1]?.distance;
  const activateLineProfileTool = () => {
    commandsManager.runCommand('activateLineProfileTool');
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <PanelSection defaultOpen={true}>
        <PanelSection.Header className="bg-popover">
          <span>灰度曲线</span>
        </PanelSection.Header>
        <PanelSection.Content className="px-2 py-2">
          <div className="mb-3 flex items-center gap-3">
            <div className="border-border bg-background flex h-9 w-9 shrink-0 items-center justify-center rounded border">
              <ChartIcon className="text-primary h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground truncate text-sm font-medium">
                {profile.measurement ? '当前采样线' : '等待采样线'}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {profile.measurement?.uid || '点击绘制后在图像上画一条直线'}
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={activateLineProfileTool}
          >
            <ChartIcon className="mr-2 h-4 w-4" />
            绘制采样线
          </Button>
        </PanelSection.Content>
      </PanelSection>

      <PanelSection defaultOpen={true}>
        <PanelSection.Header className="bg-popover">
          <span>曲线图</span>
        </PanelSection.Header>
        <PanelSection.Content className="flex min-h-0 flex-1 flex-col px-2 py-2">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <ProfileMetric
              label="采样点"
              value={profile.points.length}
            />
            <ProfileMetric
              label="最小值"
              value={formatNumber(min)}
            />
            <ProfileMetric
              label="最大值"
              value={formatNumber(max)}
            />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <ProfileMetric
              label="长度"
              value={lastDistance !== undefined ? `${formatNumber(lastDistance)} mm` : '-'}
            />
            <ProfileMetric
              label="当前图像"
              value={currentImage.instanceNumber ?? '-'}
            />
          </div>

          <div className="min-h-[320px] flex-1">
            {profile.points.length > 1 ? (
              <LineProfileChart points={profile.points} />
            ) : (
              <EmptyProfile message={profile.error || '当前采样线没有足够的灰度数据。'} />
            )}
          </div>
        </PanelSection.Content>
      </PanelSection>
    </div>
  );
}
