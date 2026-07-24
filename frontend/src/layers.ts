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

// Which shape a hover should highlight, resolved — like clicks (see featureAt) —
// from the pointer's position on the globe surface rather than from raycasting
// the polygon meshes. The meshes sit a hair above the surface, so at a shallow
// viewing angle their raycast hit drifts to a neighbouring shape (parallax);
// picking on the surface, where the imagery lives, keeps the highlight exactly
// under the cursor. `focus` is the invisible overlay of the drilled-into shape
// (a country, then a province); it's skipped so hovering the gaps between
// subdivisions doesn't light up the whole focus shape.
export function hoverFeatureAt(
  features: Feature[],
  lat: number,
  lng: number,
  focus: Feature | null,
): Feature | null {
  const feature = featureAt(features, lat, lng);
  return feature && feature !== focus ? feature : null;
}

export interface PolygonInputs {
  band: ZoomBand;
  countries: FeatureCollection | null;
  provinces: FeatureCollection | null;
  wards: FeatureCollection | null;
  // Selections carried down the ladder: the focused country (detail + ward) and
  // the focused province (ward).
  country: Feature | null;
  province: Feature | null;
}

// The polygons to render for the current band. Each drill-down level appends its
// focus shape last as an invisible overlay: styles.ts gives it no cap or stroke,
// so it stays clear of hover raycasting but still resolves clicks inside it (see
// featureAt), keeping the user in that level instead of dropping to open ocean.
export function buildPolygons(i: PolygonInputs): Feature[] {
  const { band, countries, provinces, wards, country, province } = i;
  if (band === 'globe' || !countries) return [];
  if (band === 'countries' || !country) return countries.features;

  if (band === 'detail') {
    // Vietnam is the only country we carry subdivisions for; until they load (or
    // for any other country) the national outline stands in as the overlay.
    if (isVietnam(country) && provinces) return [...provinces.features, country];
    return [country];
  }

  // ward band: the province's wards, with the province outline as the overlay.
  if (province && wards) return [...wards.features, province];
  return province ? [province] : [];
}
