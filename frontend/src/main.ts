import './style.css';
import type { Feature, FeatureCollection } from 'geojson';
import { createGlobe, upgradeTerrainTexture } from './globe';
import { attachInteractions } from './interactions';
import { buildPolygons, featureAt, isVietnam } from './layers';
import { buildBorderPaths, buildProvinceBorderPaths } from './border';
import { INITIAL_NAV_STATE, navigate, type NavEvent, type NavState } from './navigation';
import { boundsAltitude, geometryBounds, geometryCentroid } from './geo';
import { polygonCapColor, polygonStrokeColor } from './styles';
import {
  COUNTRIES_VIEW_ALTITUDE,
  DETAIL_VIEW_MAX_ALTITUDE,
  DETAIL_VIEW_MIN_ALTITUDE,
  GLOBE_VIEW_ALTITUDE,
} from './zoomLevels';
import { loadCountries, loadProvinces } from './data';

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

  let nav: NavState = INITIAL_NAV_STATE;
  let hovered: Feature | null = null;
  let countries: FeatureCollection | null = null;
  let provinces: FeatureCollection | null = null;
  // Camera flights pass through altitudes belonging to other bands; treating
  // those as user zooming would yank the band back mid-flight.
  let flyingUntil = 0;

  function applyStyles(): void {
    const ctx = { band: nav.band, hovered, selected: nav.selected };
    // A null cap/stroke tells three-globe to skip a polygon's top face / outline;
    // globe.gl types these accessors as string, so widen them like globe.ts does.
    globe
      .polygonCapColor(((d: object) => polygonCapColor(d as Feature, ctx)) as unknown as (d: object) => string)
      .polygonStrokeColor(((d: object) => polygonStrokeColor(d as Feature, ctx)) as unknown as (d: object) => string);
  }

  async function renderPolygons(): Promise<void> {
    try {
      if (nav.band !== 'globe' && !countries) countries = await loadCountries();
      if (nav.band === 'detail' && isVietnam(nav.selected) && !provinces) provinces = await loadProvinces();
    } catch (err) {
      showToast('Failed to load map data — click again to retry.');
      console.error(err);
    }
    applyStyles();
    globe.polygonsData(buildPolygons(nav.band, countries, provinces, nav.selected));
    globe.pathsData(borderPaths());
  }

  // Glowing outline around the country whose subdivisions we're viewing. When we
  // have that country's subdivisions, trace their dissolved outer edge so the
  // highlight lands exactly on the province lines; otherwise fall back to the
  // country's own (coarser, smoothed) outline.
  function borderPaths(): ReturnType<typeof buildBorderPaths> {
    if (nav.band !== 'detail') return [];
    if (isVietnam(nav.selected) && provinces) return buildProvinceBorderPaths(provinces);
    return buildBorderPaths(nav.selected);
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

  function dispatch(event: NavEvent): void {
    const next = navigate(nav, event);
    if (next === nav) return;
    nav = next;
    if (event.type !== 'zoom') moveCamera(nav, event);
    if (nav.band !== 'globe') upgradeTerrainTexture(globe);
    void renderPolygons();
  }

  attachInteractions(globe, {
    onHover: (feature) => {
      hovered = feature;
      applyStyles();
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
