import type { Geometry } from 'geojson';

// Bounding-box center. Good enough for fly-to targets; note it can be off
// for shapes crossing the antimeridian (e.g. Fiji, Russia).
export function geometryCentroid(geometry: Geometry): { lat: number; lng: number } {
  const bbox = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity };

  const visit = (coords: unknown): void => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      const [lng, lat] = coords as [number, number];
      bbox.minLng = Math.min(bbox.minLng, lng);
      bbox.maxLng = Math.max(bbox.maxLng, lng);
      bbox.minLat = Math.min(bbox.minLat, lat);
      bbox.maxLat = Math.max(bbox.maxLat, lat);
    } else if (Array.isArray(coords)) {
      for (const c of coords) visit(c);
    }
  };

  visit('coordinates' in geometry ? geometry.coordinates : []);
  return { lat: (bbox.minLat + bbox.maxLat) / 2, lng: (bbox.minLng + bbox.maxLng) / 2 };
}
