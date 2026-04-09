import type { DefectListItem, DefectMeasurement } from '../types';
import { DEFECT_TOOL_NAMES } from '../types';

function roundNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function formatCoordinate(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  const rounded = roundNumber(value as number, 1);
  return rounded === null ? '-' : String(rounded);
}

function getFirstFiniteNumber(values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function getPointCenter(points: number[][] = []) {
  if (!points.length) {
    return null;
  }

  const pointLength = points[0]?.length ?? 0;
  if (!pointLength) {
    return null;
  }

  const sums = new Array(pointLength).fill(0);

  points.forEach(point => {
    point.forEach((value, index) => {
      sums[index] += value;
    });
  });

  return sums.map(sum => sum / points.length);
}

function formatLocation(points: number[][] = []) {
  const center = getPointCenter(points);

  if (!center?.length) {
    return '-';
  }

  const [x, y, z] = center;
  const formatted = [formatCoordinate(x), formatCoordinate(y)];

  if (Number.isFinite(z)) {
    formatted.push(formatCoordinate(z));
  }

  return `(${formatted.join(', ')})`;
}

function getAreaValue(measurement: DefectMeasurement) {
  if (measurement.toolName === 'Probe') {
    return null;
  }

  const cachedStats = measurement.data || {};
  const statsList = Object.values(cachedStats).filter(Boolean) as Record<string, unknown>[];

  const area = getFirstFiniteNumber(statsList.map(stat => stat?.area));
  if (area !== null) {
    const areaUnit = statsList.find(stat => typeof stat?.areaUnit === 'string')?.areaUnit;
    return areaUnit ? `${roundNumber(area) ?? area} ${areaUnit}` : `${roundNumber(area) ?? area}`;
  }

  const primaryText = measurement.displayText?.primary || [];
  const areaText = primaryText.find(text => /\d/.test(text) && /mm|cm|px|²|2/.test(text));

  return areaText || null;
}

export function isDefectMeasurement(measurement): measurement is DefectMeasurement {
  return !!measurement && DEFECT_TOOL_NAMES.includes(measurement.toolName);
}

export function toDefectListItems(measurements: DefectMeasurement[]): DefectListItem[] {
  return measurements.map((measurement, index) => ({
    uid: measurement.uid,
    defectId: `D-${String(index + 1).padStart(3, '0')}`,
    type: measurement.defectType || '未分类',
    note: measurement.defectNote || '',
    status: measurement.defectStatus || '待确认',
    area: getAreaValue(measurement) || '-',
    location: formatLocation(measurement.points),
    toolName: measurement.toolName,
    isSelected: !!measurement.isSelected,
    measurement,
  }));
}
