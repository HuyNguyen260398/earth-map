import type { GlobeInstance } from 'globe.gl';
import type { Feature } from 'geojson';
import { featureName } from './layers';

export interface InteractionHandlers {
  // Resolve the shape to highlight from a point on the globe surface (null when
  // the pointer is off the globe). Returns the resolved shape so the cursor and
  // label can follow it.
  onSurfaceHover(coords: { lat: number; lng: number } | null): Feature | null;
  onSurfaceClick(coords: { lat: number; lng: number }): void;
  onOutsideClick(): void;
}

export interface Interactions {
  // Hide the hover label and reset the cursor. Hover only re-resolves on pointer
  // movement, so the app calls this when the view changes under a still pointer.
  clearHover(): void;
}

// A pointer that travels further than this between press and release was
// dragging the camera, not clicking.
const DRAG_SLOP_PX = 5;

export function attachInteractions(globe: GlobeInstance, handlers: InteractionHandlers): Interactions {
  // three ships no types of its own, so globe.gl's renderer() widens to any.
  const canvas = globe.renderer().domElement as HTMLCanvasElement;
  let pressedAt: { x: number; y: number } | null = null;

  const label = document.createElement('div');
  label.className = 'hover-label';
  label.hidden = true;
  document.body.appendChild(label);

  // Where on the globe surface a screen point lands, or null off the globe.
  // Reading the ray ourselves (rather than globe.gl's polygon hover, which
  // raycasts the polygon meshes floating a hair above the surface) keeps hover
  // aligned with the imagery — the same surface hit-test clicks already use.
  function surfaceAt(e: PointerEvent): { lat: number; lng: number } | null {
    const rect = canvas.getBoundingClientRect();
    return globe.toGlobeCoords(e.clientX - rect.left, e.clientY - rect.top) ?? null;
  }

  canvas.addEventListener('pointermove', (e) => {
    const feature = handlers.onSurfaceHover(surfaceAt(e));
    canvas.style.cursor = feature ? 'pointer' : 'default';
    if (feature) {
      label.textContent = featureName(feature);
      label.style.left = `${e.clientX}px`;
      label.style.top = `${e.clientY}px`;
      label.hidden = false;
    } else {
      label.hidden = true;
    }
  });

  function clearHover(): void {
    canvas.style.cursor = 'default';
    label.hidden = true;
  }

  canvas.addEventListener('pointerleave', () => {
    handlers.onSurfaceHover(null);
    clearHover();
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
    const coords = surfaceAt(e);
    coords ? handlers.onSurfaceClick(coords) : handlers.onOutsideClick();
  });

  return { clearHover };
}
