import { buildLineProfilePolyline, sampleLineProfile } from './lineProfile';

describe('sampleLineProfile', () => {
  it('samples one value for each pixel step along a horizontal line', () => {
    const profile = sampleLineProfile({
      startIndex: [0, 0, 0],
      endIndex: [3, 0, 0],
      dimensions: [4, 2, 1],
      getValue: ([i, j]) => i + j * 10,
    });

    expect(profile.map(point => point.value)).toEqual([0, 1, 2, 3]);
    expect(profile.map(point => point.distance)).toEqual([0, 1, 2, 3]);
  });

  it('uses voxel spacing when computing profile distance', () => {
    const profile = sampleLineProfile({
      startIndex: [0, 0, 0],
      endIndex: [0, 2, 0],
      dimensions: [2, 3, 1],
      spacing: [1, 0.5, 2],
      getValue: ([, j]) => j,
    });

    expect(profile.map(point => point.distance)).toEqual([0, 0.5, 1]);
  });

  it('skips rounded sample points outside the image bounds', () => {
    const profile = sampleLineProfile({
      startIndex: [-1, 0, 0],
      endIndex: [2, 0, 0],
      dimensions: [3, 1, 1],
      getValue: ([i]) => i,
    });

    expect(profile.map(point => point.ijk)).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ]);
  });
});

describe('buildLineProfilePolyline', () => {
  it('maps profile values into a fixed SVG plotting box', () => {
    const polyline = buildLineProfilePolyline(
      [
        { distance: 0, value: 10, ijk: [0, 0, 0] },
        { distance: 5, value: 20, ijk: [1, 0, 0] },
        { distance: 10, value: 10, ijk: [2, 0, 0] },
      ],
      { width: 100, height: 60, padding: 10 }
    );

    expect(polyline).toBe('10,50 50,10 90,50');
  });

  it('centers a flat profile instead of producing invalid coordinates', () => {
    const polyline = buildLineProfilePolyline(
      [
        { distance: 0, value: 7, ijk: [0, 0, 0] },
        { distance: 1, value: 7, ijk: [1, 0, 0] },
      ],
      { width: 100, height: 60, padding: 10 }
    );

    expect(polyline).toBe('10,30 90,30');
  });
});
