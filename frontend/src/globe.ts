import Globe, { type GlobeInstance } from 'globe.gl';
import { POLYGON_ALTITUDE } from './styles';
import type { BorderPath, BorderPoint } from './border';

const BASE_TEXTURE = '/textures/earth-day-4k.jpg';
const DETAILED_TEXTURE = '/textures/earth-day-8k.jpg';
const BUMP_TEXTURE = '/textures/earth-topology-4k.jpg';
const SKY_TEXTURE = '/textures/night-sky.png';

// A single global texture can't show street-level detail, so once the user
// drills into a country we hand the globe over to three-globe's tile engine,
// which streams Esri World Imagery satellite tiles (XYZ scheme, row before
// column) at a zoom level chosen from the camera altitude. Attribution to Esri
// is required whenever these are shown — see the credit in main.ts.
export const SATELLITE_ATTRIBUTION = 'Imagery © Esri, Maxar, Earthstar Geographics';
const esriSatelliteTileUrl = (x: number, y: number, level: number): string =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${level}/${y}/${x}`;

// Toggle satellite tiles on (close up) or off (back to the Blue Marble texture).
// three-globe hides the base globe while a tile URL is set and restores it when
// cleared, so this cleanly swaps the two looks.
export function setSatelliteTiles(globe: GlobeInstance, on: boolean): void {
  const url = on ? esriSatelliteTileUrl : (null as unknown as typeof esriSatelliteTileUrl);
  globe.globeTileEngineUrl(url);
}

// three-globe tessellates the sphere at 360/resolution segments; the default 4°
// leaves a visibly faceted horizon once the globe fills the viewport.
const CURVATURE_RESOLUTION = 1.5;
// The elevation map is near-black over lowlands, so it needs a strong scale
// before relief shading shows up at all.
const BUMP_SCALE = 12;

// Just the fields we touch on the globe's MeshPhongMaterial — narrower than
// importing three's types for a package we only depend on transitively.
interface GlobeMaterial {
  bumpScale?: number;
  map?: Texture | null;
  bumpMap?: Texture | null;
}
interface Texture {
  anisotropy: number;
  needsUpdate: boolean;
}

export function createGlobe(container: HTMLElement): GlobeInstance {
  const globe = new Globe(container)
    .globeImageUrl(BASE_TEXTURE)
    .bumpImageUrl(BUMP_TEXTURE)
    .backgroundImageUrl(SKY_TEXTURE)
    .globeCurvatureResolution(CURVATURE_RESOLUTION)
    .polygonsData([])
    .polygonAltitude(POLYGON_ALTITUDE)
    // Falsy side colour tells three-globe to skip side walls entirely; the
    // polygons lie flush on the surface, so they'd only cost triangles.
    .polygonSideColor(noSides)
    .polygonsTransitionDuration(200)
    // Paths layer draws the highlighted country border as glowing fat lines.
    // Points arrive as [lat, lng, altitude]; a numeric stroke opts each line
    // into three-globe's Line2 fat lines (real width + rounded joins).
    .pathPoints((d: object) => (d as BorderPath).points)
    .pathPointLat((p: object) => (p as BorderPoint)[0])
    .pathPointLng((p: object) => (p as BorderPoint)[1])
    .pathPointAlt((p: object) => (p as BorderPoint)[2])
    .pathColor((d: object) => (d as BorderPath).color)
    .pathStroke((d: object) => (d as BorderPath).stroke)
    // No draw-on animation: the border should just be there when a country is
    // picked, not sweep in from one vertex every time.
    .pathTransitionDuration(0)
    .pathsData([]);

  const material = globe.globeMaterial() as GlobeMaterial;
  material.bumpScale = BUMP_SCALE;
  sharpenTextures(globe, material);

  return globe;
}

// --- Earth rotation -------------------------------------------------------
//
// The Earth spins once per *sidereal* day — one turn relative to the stars,
// which is 23h56m04s (86164 s), not the 86400 s solar day (that extra ~4 min
// is the planet catching up with its own orbital motion around the Sun). At
// real speed that's ~0.0042°/s: technically correct but motionless to the eye.
// So we keep the exact sidereal ratio and the real west-to-east direction, and
// only fast-forward time by TIME_SCALE to make the spin visible.
const SIDEREAL_DAY_SECONDS = 86164;
// Target one visible turn every ~120 s, i.e. run the clock ~718× real time.
const ROTATION_PERIOD_SECONDS = 120;
const TIME_SCALE = SIDEREAL_DAY_SECONDS / ROTATION_PERIOD_SECONDS;

// OrbitControls' autoRotate orbits the camera about the controls' up axis,
// which in globe.gl is +Y — the globe's polar axis. So this is a true rotation
// about the geographic poles, independent of where the camera has been dragged.
// autoRotateSpeed is calibrated as "60 / seconds-per-turn". A positive speed
// steps the camera's azimuth backwards, drifting the sub-camera meridian
// westward, which reads on screen as the surface flowing west→east — the way
// Earth actually turns (verified on screen against the longitude mapping).
const EASTWARD = 1;
const AUTO_ROTATE_SPEED = EASTWARD * (60 / ROTATION_PERIOD_SECONDS);

// The real-time multiplier this animation runs at — surfaced for callers/docs.
export const ROTATION_TIME_SCALE = TIME_SCALE;

// Start/stop the globe's rotation about its polar axis.
export function setEarthRotation(globe: GlobeInstance, on: boolean): void {
  const controls = globe.controls();
  controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
  controls.autoRotate = on;
}

let upgraded = false;

// Swaps in the 8k earth. It's ~4.7 MB, so it only gets fetched once the user
// leaves the far view, where the 4k texture already looks fine. Idempotent.
export function upgradeTerrainTexture(globe: GlobeInstance): void {
  if (upgraded) return;
  upgraded = true;

  // Decode it out of band first: handing the URL straight to three-globe would
  // leave the globe on the old texture for the same time anyway, but this way a
  // failed load leaves the working texture in place.
  const image = new Image();
  image.onload = () => globe.globeImageUrl(DETAILED_TEXTURE);
  image.src = DETAILED_TEXTURE;
}

// Without anisotropic filtering the surface smears into mip blur wherever the
// globe curves away from the camera — the whole rim, at every zoom level.
// three-globe loads textures itself and swaps material.map with no event to
// hook, so poll for a texture we haven't configured yet.
function sharpenTextures(globe: GlobeInstance, material: GlobeMaterial): void {
  const anisotropy = globe.renderer().capabilities.getMaxAnisotropy();
  const seen = new Set<Texture>();

  setInterval(() => {
    for (const texture of [material.map, material.bumpMap]) {
      if (!texture || seen.has(texture)) continue;
      seen.add(texture);
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
    }
  }, 250);
}

const noSides = (() => null) as unknown as (f: object) => string;
