export type Point3 = [number, number, number];

export interface LineProfilePoint {
  distance: number;
  value: number;
  ijk: Point3;
}

export interface SampleLineProfileOptions {
  startIndex: Point3;
  endIndex: Point3;
  dimensions: Point3;
  spacing?: Point3;
  getValue: (ijk: Point3) => number | undefined | null;
}

export interface LineProfilePolylineOptions {
  width: number;
  height: number;
  padding: number;
}

function isInsideImage([i, j, k]: Point3, [width, height, depth]: Point3) {
  return i >= 0 && i < width && j >= 0 && j < height && k >= 0 && k < depth;
}

function roundPoint(point: Point3): Point3 {
  return point.map(value => Math.round(value)) as Point3;
}

function getDistance(startIndex: Point3, currentIndex: Point3, spacing: Point3) {
  const dx = (currentIndex[0] - startIndex[0]) * spacing[0];
  const dy = (currentIndex[1] - startIndex[1]) * spacing[1];
  const dz = (currentIndex[2] - startIndex[2]) * spacing[2];

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function sampleLineProfile({
  startIndex,
  endIndex,
  dimensions,
  spacing = [1, 1, 1],
  getValue,
}: SampleLineProfileOptions): LineProfilePoint[] {
  const delta: Point3 = [
    endIndex[0] - startIndex[0],
    endIndex[1] - startIndex[1],
    endIndex[2] - startIndex[2],
  ];
  const stepCount = Math.max(
    Math.ceil(Math.max(Math.abs(delta[0]), Math.abs(delta[1]), Math.abs(delta[2]))),
    1
  );
  const profile: LineProfilePoint[] = [];
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
    const value = getValue(ijk);
    if (value === undefined || value === null || !Number.isFinite(Number(value))) {
      continue;
    }

    profile.push({
      distance: getDistance(startIndex, ijk, spacing),
      value: Number(value),
      ijk,
    });
  }

  return profile;
}

function formatSvgNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function buildLineProfilePolyline(
  points: LineProfilePoint[],
  { width, height, padding }: LineProfilePolylineOptions
) {
  if (points.length < 2) {
    return '';
  }

  const distances = points.map(point => point.distance);
  const values = points.map(point => point.value);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const distanceRange = maxDistance - minDistance || 1;
  const valueRange = maxValue - minValue;

  return points
    .map(point => {
      const x = padding + ((point.distance - minDistance) / distanceRange) * plotWidth;
      const y =
        valueRange === 0
          ? height / 2
          : padding + (1 - (point.value - minValue) / valueRange) * plotHeight;

      return `${formatSvgNumber(x)},${formatSvgNumber(y)}`;
    })
    .join(' ');
}
