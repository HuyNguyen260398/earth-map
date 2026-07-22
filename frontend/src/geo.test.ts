import { describe, expect, it } from 'vitest';
import type { Geometry } from 'geojson';
import { geometryCentroid } from './geo';

describe('geometryCentroid', () => {
  it('returns the bbox center of a polygon', () => {
    const square: Geometry = {
      type: 'Polygon',
      coordinates: [[[100, 10], [110, 10], [110, 20], [100, 20], [100, 10]]],
    };
    expect(geometryCentroid(square)).toEqual({ lat: 15, lng: 105 });
  });

  it('spans all parts of a MultiPolygon', () => {
    const multi: Geometry = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [2, 0], [2, 2], [0, 0]]],
        [[[8, 8], [10, 8], [10, 10], [8, 8]]],
      ],
    };
    expect(geometryCentroid(multi)).toEqual({ lat: 5, lng: 5 });
  });
});
