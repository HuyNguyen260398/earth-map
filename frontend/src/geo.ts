import type { Geometry } from 'geojson';

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// three.js PerspectiveCamera default, which globe.gl keeps.
const CAMERA_FOV_DEG = 50;
// Fraction of the viewport the focused country should span.
const VIEWPORT_FILL = 0.7;

// Note: bounds can be wrong for shapes crossing the antimeridian (e.g. Fiji,
// Russia) — the resulting altitude is clamped, so the damage is bounded.
export function geometryBounds(geometry: Geometry): GeoBounds {
  const bounds: GeoBounds = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity };

  const visit = (coords: unknown): void => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      const [lng, lat] = coords as [number, number];
      bounds.minLng = Math.min(bounds.minLng, lng);
      bounds.maxLng = Math.max(bounds.maxLng, lng);
      bounds.minLat = Math.min(bounds.minLat, lat);
      bounds.maxLat = Math.max(bounds.maxLat, lat);
    } else if (Array.isArray(coords)) {
      for (const c of coords) visit(c);
    }
  };

  visit('coordinates' in geometry ? geometry.coordinates : []);
  return bounds;
}

export function geometryCentroid(geometry: Geometry): { lat: number; lng: number } {
  const { minLat, maxLat, minLng, maxLng } = geometryBounds(geometry);
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

type Ring = number[][];

function ringContains(ring: Ring, lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];
    const crosses = latI > lat !== latJ > lat;
    if (crosses && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI) inside = !inside;
  }
  return inside;
}

function polygonContains(rings: Ring[], lat: number, lng: number): boolean {
  const [outer, ...holes] = rings;
  return ringContains(outer, lat, lng) && !holes.some((hole) => ringContains(hole, lat, lng));
}

// Even-odd test in lng/lat space. Same antimeridian caveat as geometryBounds:
// a ring spanning the date line tests against a shape stretched the long way
// round, which at 110m resolution only affects Russia and Fiji.
export function geometryContains(geometry: Geometry, lat: number, lng: number): boolean {
  if (geometry.type === 'Polygon') return polygonContains(geometry.coordinates, lat, lng);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((rings) => polygonContains(rings, lat, lng));
  }
  return false;
}

// Camera altitude (globe-radius units) at which `bounds` fills VIEWPORT_FILL of
// the view. Treats the country as a flat patch facing the camera, which is
// close enough at the altitudes we clamp to.
export function boundsAltitude(bounds: GeoBounds, min: number, max: number): number {
  const midLat = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = (bounds.maxLng - bounds.minLng) * Math.cos(midLat);
  const spanRad = Math.max(latSpan, lngSpan) * (Math.PI / 180);
  const altitude = spanRad / (2 * VIEWPORT_FILL * Math.tan((CAMERA_FOV_DEG / 2) * (Math.PI / 180)));
  return Math.min(max, Math.max(min, altitude));
}
