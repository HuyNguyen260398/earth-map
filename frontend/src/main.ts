import './style.css';
import type { FeatureCollection } from 'geojson';
import { createGlobe } from './globe';
import { nextBand, type ZoomBand } from './zoomLevels';
import { buildPolygons } from './layers';
import { loadCountries, loadProvinces } from './data';

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

  if (import.meta.env.DEV) {
    (window as unknown as { __globe: unknown }).__globe = globe;
  }

  let band: ZoomBand = 'globe';
  let countries: FeatureCollection | null = null;
  let provinces: FeatureCollection | null = null;

  const refreshPolygons = async (): Promise<void> => {
    try {
      if (band !== 'globe' && !countries) countries = await loadCountries();
      if (band === 'detail' && !provinces) provinces = await loadProvinces();
    } catch (err) {
      showToast('Failed to load map data — zoom again to retry.');
      console.error(err);
    }
    globe.polygonsData(buildPolygons(band, countries, provinces));
  };

  globe.onZoom(({ altitude }) => {
    const next = nextBand(band, altitude);
    if (next === band) return;
    band = next;
    void refreshPolygons();
  });
}
