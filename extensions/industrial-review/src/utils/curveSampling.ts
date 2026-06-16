import type {
  CurveData,
  CurveGeometry,
  CurveSamplePoint,
  CurveSamplingResult,
} from '../types/curve';
import { calculateCurveStatistics } from './curveStatistics';

type Point3 = [number, number, number];

interface LengthMeasurement {
  uid: string;
  toolName: string;
  points?: number[][];
  referencedImageId?: string;
  referenceStudyUID?: string;
  referenceSeriesUID?: string;
  SOPInstanceUID?: string;
  FrameOfReferenceUID?: string;
  metadata?: {
    referencedImageId?: string;
    StudyInstanceUID?: string;
    SeriesInstanceUID?: string;
    SOPInstanceUID?: string;
    frameNumber?: number;
    [key: string]: unknown;
  };
  isSelected?: boolean;
}

interface SampleLineNearestOptions {
  startIndex: Point3;
  endIndex: Point3;
  dimensions: Point3;
  spacing?: Point3;
  hasReliableSpacing: boolean;
  getValue: (ijk: Point3) => number | undefined | null;
}

function toPoint3(point?: number[]): Point3 | undefined {
  if (!point || point.length < 3) {
    return undefined;
  }

  const normalized = [Number(point[0]), Number(point[1]), Number(point[2])] as Point3;

  return normalized.every(Number.isFinite) ? normalized : undefined;
}

function roundPoint(point: Point3): Point3 {
  return point.map(value => Math.round(value)) as Point3;
}

function isInsideImage([i, j, k]: Point3, [width, height, depth]: Point3) {
  return i >= 0 && i < width && j >= 0 && j < height && k >= 0 && k < depth;
}

function getDistancePx(startIndex: Point3, currentIndex: Point3) {
  const dx = currentIndex[0] - startIndex[0];
  const dy = currentIndex[1] - startIndex[1];
  const dz = currentIndex[2] - startIndex[2];

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getDistanceMm(startIndex: Point3, currentIndex: Point3, spacing: Point3) {
  const dx = (currentIndex[0] - startIndex[0]) * spacing[0];
  const dy = (currentIndex[1] - startIndex[1]) * spacing[1];
  const dz = (currentIndex[2] - startIndex[2]) * spacing[2];

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
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

function getMeasurementImageId(measurement: LengthMeasurement) {
  return measurement.referencedImageId || measurement.metadata?.referencedImageId;
}

function selectLineMeasurement(measurements: LengthMeasurement[], imageId?: string) {
  const completeMeasurements = measurements.filter(
    measurement => measurement.toolName === 'Length' && measurement.points?.length >= 2
  );
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

function getSpacing(imageDataInfo, imageData): { spacing: Point3; hasReliableSpacing: boolean } {
  const spacing = (imageDataInfo?.spacing || imageData?.getSpacing?.()) as Point3 | undefined;
  const hasReliableSpacing =
    Array.isArray(spacing) &&
    spacing.length >= 2 &&
    Number.isFinite(Number(spacing[0])) &&
    Number.isFinite(Number(spacing[1])) &&
    Number(spacing[0]) > 0 &&
    Number(spacing[1]) > 0;

  return {
    spacing: hasReliableSpacing
      ? ([Number(spacing[0]), Number(spacing[1]), Number(spacing[2]) || 1] as Point3)
      : [1, 1, 1],
    hasReliableSpacing,
  };
}

function getInstanceValue(instance, keys: string[]) {
  if (!instance) {
    return undefined;
  }

  for (const key of keys) {
    if (instance[key] !== undefined) {
      return instance[key];
    }
  }

  return undefined;
}

function buildCurveSource({
  activeViewportId,
  currentImageId,
  displaySet,
  measurement,
}: {
  activeViewportId?: string;
  currentImageId?: string;
  displaySet;
  measurement: LengthMeasurement;
}) {
  const instance = displaySet?.instance || displaySet?.instances?.[0];

  return {
    viewportId: activeViewportId,
    studyInstanceUid:
      measurement.metadata?.StudyInstanceUID ||
      measurement.referenceStudyUID ||
      getInstanceValue(instance, ['StudyInstanceUID', 'studyInstanceUID']),
    seriesInstanceUid:
      measurement.metadata?.SeriesInstanceUID ||
      measurement.referenceSeriesUID ||
      getInstanceValue(instance, ['SeriesInstanceUID', 'seriesInstanceUID']),
    sopInstanceUid:
      measurement.metadata?.SOPInstanceUID ||
      measurement.SOPInstanceUID ||
      getInstanceValue(instance, ['SOPInstanceUID', 'sopInstanceUID']),
    frameNumber: measurement.metadata?.frameNumber,
    imageId: currentImageId || getMeasurementImageId(measurement),
    measurementUid: measurement.uid,
  };
}

export function sampleLineNearest({
  startIndex,
  endIndex,
  dimensions,
  spacing = [1, 1, 1],
  hasReliableSpacing,
  getValue,
}: SampleLineNearestOptions): CurveSamplePoint[] {
  const delta: Point3 = [
    endIndex[0] - startIndex[0],
    endIndex[1] - startIndex[1],
    endIndex[2] - startIndex[2],
  ];
  const stepCount = Math.max(
    Math.ceil(Math.max(Math.abs(delta[0]), Math.abs(delta[1]), Math.abs(delta[2]))),
    1
  );
  const points: CurveSamplePoint[] = [];
  const seen = new Set<string>();

  for (let step = 0; step <= stepCount; step += 1) {
    const ratio = step / stepCount;
    const ijk = roundPoint([
      startIndex[0] + delta[0] * ratio,
      startIndex[1] + delta[1] * ratio,
      startIndex[2] + delta[2] * ratio,
    ]);
    const key = ijk.join(':');

    if (seen.has(key) || !isInsideImage(ijk, dimensions)) {
      continue;
    }

    seen.add(key);
    const value = normalizeVoxelValue(getValue(ijk));

    if (value === undefined) {
      continue;
    }

    points.push({
      index: points.length,
      imageX: ijk[0],
      imageY: ijk[1],
      distancePx: getDistancePx(startIndex, ijk),
      distanceMm: hasReliableSpacing ? getDistanceMm(startIndex, ijk, spacing) : undefined,
      rawValue: value,
    });
  }

  return points;
}

export function sampleLineFromActiveViewport({
  servicesManager,
}: {
  servicesManager: AppTypes.ServicesManager;
}): CurveSamplingResult {
  const { viewportGridService, displaySetService, measurementService, cornerstoneViewportService } =
    servicesManager.services as AppTypes.Services;

  const viewportGridState = viewportGridService?.getState?.();
  const activeViewportId = viewportGridState?.activeViewportId;

  if (!activeViewportId) {
    return { error: '当前没有激活的视图。' };
  }

  const viewport = cornerstoneViewportService?.getCornerstoneViewport?.(activeViewportId);

  if (!viewport) {
    return { error: '当前视图不支持灰度曲线分析。' };
  }

  const currentImageId = viewport.getCurrentImageId?.();
  const measurements = measurementService?.getMeasurements?.(
    measurement => measurement.toolName === 'Length'
  ) as LengthMeasurement[];
  const measurement = selectLineMeasurement(measurements || [], currentImageId);

  if (!measurement) {
    return { error: '请先在图像上绘制一条 Length 采样线，然后再次点击灰度曲线。' };
  }

  const [startWorldRaw, endWorldRaw] = measurement.points || [];
  const startWorld = toPoint3(startWorldRaw);
  const endWorld = toPoint3(endWorldRaw);

  if (!startWorld || !endWorld) {
    return { error: '当前选中的线段测量无效。' };
  }

  const imageDataInfo = viewport.getImageData?.();
  const imageData = imageDataInfo?.imageData;
  const worldToIndex = imageData?.worldToIndex?.bind(imageData);

  if (!imageDataInfo || !imageData || !worldToIndex) {
    return { error: '当前视图暂时无法读取图像像素数据。' };
  }

  const rawDimensions = (imageDataInfo.dimensions || imageData.getDimensions?.()) as
    | number[]
    | undefined;

  if (!rawDimensions || rawDimensions.length < 2) {
    return { error: '当前图像缺少尺寸信息。' };
  }

  const dimensions: Point3 = [
    Number(rawDimensions[0]),
    Number(rawDimensions[1]),
    Number(rawDimensions[2]) || 1,
  ];

  if (!dimensions.every(Number.isFinite)) {
    return { error: '当前图像尺寸信息无效。' };
  }

  if ((dimensions[2] || 1) > 1) {
    return { error: '当前仅支持单帧二维图像，暂不支持 Volume/MPR 场景。' };
  }

  const { spacing, hasReliableSpacing } = getSpacing(imageDataInfo, imageData);
  const voxelManager = imageDataInfo.voxelManager;
  const scalarData = imageDataInfo.scalarData || imageData.getScalarData?.();

  if (!voxelManager && !scalarData) {
    return { error: '当前图像没有可用的 raw pixel data。' };
  }

  const startIndex = toPoint3(worldToIndex(startWorld));
  const endIndex = toPoint3(worldToIndex(endWorld));

  if (!startIndex || !endIndex) {
    return { error: '无法将线段坐标转换为图像像素坐标。' };
  }
  const points = sampleLineNearest({
    startIndex,
    endIndex,
    dimensions,
    spacing,
    hasReliableSpacing,
    getValue: ijk => {
      const voxelValue =
        typeof voxelManager?.getAtIJKPoint === 'function'
          ? voxelManager.getAtIJKPoint(ijk)
          : getFallbackScalarValue(scalarData, dimensions, ijk);

      return normalizeVoxelValue(voxelValue);
    },
  });

  if (points.length < 2) {
    return { error: '采样线未穿过足够的有效图像像素。' };
  }

  const displaySetInstanceUID =
    viewportGridState?.viewports?.get(activeViewportId)?.displaySetInstanceUIDs?.[0];
  const displaySet =
    typeof displaySetInstanceUID === 'string'
      ? displaySetService?.getDisplaySetByUID?.(displaySetInstanceUID)
      : undefined;
  const geometry: CurveGeometry = {
    type: 'line',
    start: {
      x: Math.round(startIndex[0]),
      y: Math.round(startIndex[1]),
    },
    end: {
      x: Math.round(endIndex[0]),
      y: Math.round(endIndex[1]),
    },
  };
  const data: CurveData = {
    curveId: `curve-${measurement.uid}-${Date.now()}`,
    source: buildCurveSource({
      activeViewportId,
      currentImageId,
      displaySet,
      measurement,
    }),
    geometry,
    sampleOptions: {
      sampleMode: 'nearest',
      xAxisUnit: hasReliableSpacing ? 'mm' : 'px',
      yAxisValueType: 'raw',
    },
    points,
    statistics: calculateCurveStatistics(points),
  };

  return { data };
}
