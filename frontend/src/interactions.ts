import type { GlobeInstance } from 'globe.gl';
import type { Feature } from 'geojson';
import { featureName } from './layers';

export interface InteractionHandlers {
  onHover(feature: Feature | null): void;
  onSurfaceClick(coords: { lat: number; lng: number }): void;
  onOutsideClick(): void;
}

// A pointer that travels further than this between press and release was
// dragging the camera, not clicking.
const DRAG_SLOP_PX = 5;

export function attachInteractions(globe: GlobeInstance, handlers: InteractionHandlers): void {
  // three ships no types of its own, so globe.gl's renderer() widens to any.
  const canvas = globe.renderer().domElement as HTMLCanvasElement;
  let pressedAt: { x: number; y: number } | null = null;

  globe.polygonLabel((f) => `<b>${featureName(f as Feature)}</b>`).onPolygonHover((f) => {
    const hovered = (f as Feature | null) ?? null;
    canvas.style.cursor = hovered ? 'pointer' : 'default';
    handlers.onHover(hovered);
  });

  canvas.addEventListener('pointerdown', (e) => {
    pressedAt = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
  });

  canvas.addEventListener('pointerup', (e) => {
    const start = pressedAt;
    pressedAt = null;
    if (!start || e.button !== 0) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_SLOP_PX) return;

    // globe.gl drops clicks that hit nothing, but a click on empty space is
    // exactly the "zoom back out" gesture — so read the ray ourselves.
    const rect = canvas.getBoundingClientRect();
    const coords = globe.toGlobeCoords(e.clientX - rect.left, e.clientY - rect.top);
    coords ? handlers.onSurfaceClick(coords) : handlers.onOutsideClick();
  });
}
