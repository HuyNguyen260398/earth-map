import type { Feature, FeatureCollection } from 'geojson';
import type { ZoomBand } from './zoomLevels';

export const VIETNAM_ISO_A3 = 'VNM';

export function featureName(f: Feature): string {
  const p = f.properties ?? {};
  return (p.name ?? p.ADMIN ?? p.NAME ?? 'Unknown') as string;
}

export function buildPolygons(
  band: ZoomBand,
  countries: FeatureCollection | null,
  provinces: FeatureCollection | null,
): Feature[] {
  if (band === 'globe' || !countries) return [];
  if (band === 'countries' || !provinces) return countries.features;
  return [
    ...countries.features.filter((f) => f.properties?.ISO_A3 !== VIETNAM_ISO_A3),
    ...provinces.features,
  ];
}
