import type { CurveSamplePoint, CurveStatistics } from '../types/curve';

export function calculateCurveStatistics(points: CurveSamplePoint[]): CurveStatistics {
  if (!points.length) {
    return {
      maxValue: 0,
      minValue: 0,
      meanValue: 0,
      range: 0,
      sampleCount: 0,
    };
  }

  let maxPoint = points[0];
  let minPoint = points[0];
  let sum = 0;

  points.forEach(point => {
    sum += point.rawValue;

    if (point.rawValue > maxPoint.rawValue) {
      maxPoint = point;
    }

    if (point.rawValue < minPoint.rawValue) {
      minPoint = point;
    }
  });

  return {
    maxValue: maxPoint.rawValue,
    minValue: minPoint.rawValue,
    meanValue: sum / points.length,
    range: maxPoint.rawValue - minPoint.rawValue,
    sampleCount: points.length,
    maxPoint,
    minPoint,
  };
}
