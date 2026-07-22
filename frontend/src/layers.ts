import type { Feature, FeatureCollection } from 'geojson';
import { geometryContains } from './geo';
import type { ZoomBand } from './zoomLevels';

export const VIETNAM_ISO_A3 = 'VNM';

export function featureName(f: Feature): string {
  const p = f.properties ?? {};
  return (p.name ?? p.ADMIN ?? p.NAME ?? 'Unknown') as string;
}

export function isVietnam(f: Feature | null): boolean {
  return f?.properties?.ISO_A3 === VIETNAM_ISO_A3;
}

// Which rendered shape a click landed on. Resolved from the click's
// coordinates rather than the hover highlight, which can lag behind the pointer
// (and never exists at all on a touch screen).
export function featureAt(features: Feature[], lat: number, lng: number): Feature | null {
  return features.find((f) => f.geometry && geometryContains(f.geometry, lat, lng)) ?? null;
}

export function buildPolygons(
  band: ZoomBand,
  countries: FeatureCollection | null,
  provinces: FeatureCollection | null,
  selected: Feature | null = null,
): Feature[] {
  if (band === 'globe' || !countries) return [];
  if (band === 'countries' || !selected) return countries.features;
  // Detail band focuses on one country: its neighbours' borders are dropped
  // entirely so nothing competes with the subdivisions on screen. Vietnam is
  // the only country we carry subdivisions for; until they load (or for any
  // other country) the national outline stands in.
  if (isVietnam(selected) && provinces) return provinces.features;
  return [selected];
}
