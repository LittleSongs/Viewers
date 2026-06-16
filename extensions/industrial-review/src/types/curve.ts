export interface CurveSamplePoint {
  index: number;
  imageX: number;
  imageY: number;
  distancePx: number;
  distanceMm?: number;
  rawValue: number;
}

export interface CurveStatistics {
  maxValue: number;
  minValue: number;
  meanValue: number;
  range: number;
  sampleCount: number;
  maxPoint?: CurveSamplePoint;
  minPoint?: CurveSamplePoint;
}

export interface CurveSourceInfo {
  viewportId?: string;
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
  sopInstanceUid?: string;
  frameNumber?: number;
  imageId?: string;
  measurementUid?: string;
}

export interface CurveGeometry {
  type: 'line';
  start: {
    x: number;
    y: number;
  };
  end: {
    x: number;
    y: number;
  };
}

export interface CurveSampleOptions {
  sampleMode: 'nearest';
  xAxisUnit: 'mm' | 'px';
  yAxisValueType: 'raw';
}

export interface CurveData {
  curveId: string;
  source: CurveSourceInfo;
  geometry: CurveGeometry;
  sampleOptions: CurveSampleOptions;
  points: CurveSamplePoint[];
  statistics: CurveStatistics;
}

export interface CurveSamplingResult {
  data?: CurveData;
  error?: string;
}
