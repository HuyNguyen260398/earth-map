import './style.css';
import type { Feature, FeatureCollection } from 'geojson';
import { createGlobe, setSatelliteTiles, upgradeTerrainTexture, SATELLITE_ATTRIBUTION } from './globe';
import { attachInteractions } from './interactions';
import { buildPolygons, featureAt, featureName, hoverFeatureAt, isVietnam } from './layers';
import { buildBorderPaths, buildDissolvedBorderPaths, type BorderPath } from './border';
import { INITIAL_NAV_STATE, navigate, type NavEvent, type NavState } from './navigation';
import { boundsAltitude, geometryBounds, geometryCentroid } from './geo';
import { polygonAltitudeFor, polygonCapColor, polygonStrokeColor } from './styles';
import {
  COUNTRIES_VIEW_ALTITUDE,
  DETAIL_VIEW_MAX_ALTITUDE,
  DETAIL_VIEW_MIN_ALTITUDE,
  GLOBE_VIEW_ALTITUDE,
  WARD_VIEW_MAX_ALTITUDE,
  WARD_VIEW_MIN_ALTITUDE,
} from './zoomLevels';
import { loadCountries, loadProvinces, loadWards } from './data';

const FLY_MS = 1000;

function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function showToast(message: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

const app = document.querySelector<HTMLDivElement>('#app')!;

if (!webglSupported()) {
  app.innerHTML = '<p class="fallback">This app requires WebGL, which your browser does not support.</p>';
} else {
  const globe = createGlobe(app);

  // Esri requires visible attribution while its imagery is on screen; shown only
  // when the satellite tiles are (see updateImagery).
  const attribution = document.createElement('div');
  attribution.className = 'attribution';
  attribution.textContent = SATELLITE_ATTRIBUTION;
  attribution.hidden = true;
  document.body.appendChild(attribution);

  let nav: NavState = INITIAL_NAV_STATE;
  let tilesOn = false;
  let hovered: Feature | null = null;
  let countries: FeatureCollection | null = null;
  let provinces: FeatureCollection | null = null;
  // Wards for whichever province is currently open (keyed by name below).
  let wards: FeatureCollection | null = null;
  let wardsProvince: string | null = null;
  // Camera flights pass through altitudes belonging to other bands; treating
  // those as user zooming would yank the band back mid-flight.
  let flyingUntil = 0;

  // The subdivided shape in focus: a province at the ward band, a country above.
  function focusFeature(): Feature | null {
    return nav.band === 'ward' ? nav.province : nav.selected;
  }

  function applyStyles(): void {
    const ctx = { band: nav.band, hovered, selected: focusFeature() };
    // A null cap/stroke tells three-globe to skip a polygon's top face / outline;
    // globe.gl types these accessors as string, so widen them like globe.ts does.
    globe
      .polygonCapColor(((d: object) => polygonCapColor(d as Feature, ctx)) as unknown as (d: object) => string)
      .polygonStrokeColor(((d: object) => polygonStrokeColor(d as Feature, ctx)) as unknown as (d: object) => string);
  }

  async function renderPolygons(): Promise<void> {
    try {
      if (nav.band !== 'globe' && !countries) countries = await loadCountries();
      if (nav.band !== 'globe' && nav.band !== 'countries' && isVietnam(nav.selected) && !provinces) {
        provinces = await loadProvinces();
      }
      if (nav.band === 'ward' && nav.province) await ensureWards(nav.province);
    } catch (err) {
      showToast('Failed to load map data — click again to retry.');
      console.error(err);
    }
    applyStyles();
    // Hug the surface up close so subdivisions and hover stay aligned with the
    // satellite imagery; keep the higher lift up high to clear z-fighting.
    globe.polygonAltitude(polygonAltitudeFor(nav.band));
    globe.polygonsData(
      buildPolygons({ band: nav.band, countries, provinces, wards, country: nav.selected, province: nav.province }),
    );
    globe.pathsData(borderPaths());
  }

  // Load (and cache) the wards for a province, tracking which province they're
  // for so a stale set isn't rendered after switching provinces.
  async function ensureWards(province: Feature): Promise<void> {
    const name = featureName(province);
    if (wardsProvince === name && wards) return;
    wards = await loadWards(name);
    wardsProvince = name;
  }

  // Glowing outline around the subdivided shape in focus. When we have its
  // subdivisions, trace their dissolved outer edge so the highlight lands exactly
  // on the subdivision lines; otherwise fall back to the shape's own (coarser,
  // smoothed) outline.
  function borderPaths(): BorderPath[] {
    if (nav.band === 'ward') {
      if (wards && wardsProvince === featureName(nav.province!)) return buildDissolvedBorderPaths(wards);
      return buildBorderPaths(nav.province);
    }
    if (nav.band === 'detail') {
      if (isVietnam(nav.selected) && provinces) return buildDissolvedBorderPaths(provinces);
      return buildBorderPaths(nav.selected);
    }
    return [];
  }

  function flyTo(pov: { lat?: number; lng?: number; altitude: number }): void {
    flyingUntil = performance.now() + FLY_MS + 100;
    globe.pointOfView(pov, FLY_MS);
  }

  function moveCamera(state: NavState, event: NavEvent): void {
    if (state.band === 'globe') {
      flyTo({ altitude: GLOBE_VIEW_ALTITUDE });
      return;
    }
    if (state.band === 'ward' && state.province?.geometry) {
      const { geometry } = state.province;
      flyTo({
        ...geometryCentroid(geometry),
        altitude: boundsAltitude(geometryBounds(geometry), WARD_VIEW_MIN_ALTITUDE, WARD_VIEW_MAX_ALTITUDE),
      });
      return;
    }
    if (state.band === 'detail' && state.selected?.geometry) {
      const { geometry } = state.selected;
      flyTo({
        ...geometryCentroid(geometry),
        altitude: boundsAltitude(geometryBounds(geometry), DETAIL_VIEW_MIN_ALTITUDE, DETAIL_VIEW_MAX_ALTITUDE),
      });
      return;
    }
    // Diving in from the far view centres on wherever the earth was clicked;
    // backing out of a country keeps the country centred.
    flyTo(
      event.type === 'globe-click'
        ? { lat: event.lat, lng: event.lng, altitude: COUNTRIES_VIEW_ALTITUDE }
        : { altitude: COUNTRIES_VIEW_ALTITUDE },
    );
  }

  // Satellite tiles stream in once a country is in focus (detail + ward), where
  // the single global texture would otherwise be blurry; up high we keep the
  // Blue Marble look. Toggling only on change avoids reloading tiles needlessly.
  function updateImagery(): void {
    const on = nav.band === 'detail' || nav.band === 'ward';
    if (on === tilesOn) return;
    tilesOn = on;
    setSatelliteTiles(globe, on);
    attribution.hidden = !on;
  }

  function dispatch(event: NavEvent): void {
    const next = navigate(nav, event);
    if (next === nav) return;
    nav = next;
    // The view is changing, so whatever was under the (stationary) cursor no
    // longer is; drop the hover until the next pointer move re-resolves it.
    // Otherwise a shape hovered in the old band lingers — e.g. the country just
    // clicked into, now the invisible focus overlay, would light up whole.
    hovered = null;
    interactions.clearHover();
    if (event.type !== 'zoom') moveCamera(nav, event);
    if (nav.band !== 'globe') upgradeTerrainTexture(globe);
    updateImagery();
    void renderPolygons();
  }

  const interactions = attachInteractions(globe, {
    onSurfaceHover: (coords) => {
      // Resolve the hovered shape from the surface point (like clicks), not from
      // globe.gl's mesh raycast, so the highlight lands exactly under the cursor.
      const next = coords
        ? hoverFeatureAt(globe.polygonsData() as Feature[], coords.lat, coords.lng, focusFeature())
        : null;
      if (next !== hovered) {
        hovered = next;
        applyStyles();
      }
      return hovered;
    },
    onSurfaceClick: ({ lat, lng }) => {
      const feature = featureAt(globe.polygonsData() as Feature[], lat, lng);
      dispatch(feature ? { type: 'feature-click', feature } : { type: 'globe-click', lat, lng });
    },
    onOutsideClick: () => dispatch({ type: 'outside-click' }),
  });

  globe.onZoom(({ altitude }) => {
    if (performance.now() < flyingUntil) return;
    dispatch({ type: 'zoom', altitude });
  });

  if (import.meta.env.DEV) {
    (window as unknown as { __globe: unknown; __nav: unknown }).__globe = globe;
    (window as unknown as { __nav: () => NavState }).__nav = () => nav;
  }
}
