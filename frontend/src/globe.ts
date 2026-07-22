import Globe, { type GlobeInstance } from 'globe.gl';
import { POLYGON_ALTITUDE } from './styles';

const BASE_TEXTURE = '/textures/earth-day-4k.jpg';
const DETAILED_TEXTURE = '/textures/earth-day-8k.jpg';
const BUMP_TEXTURE = '/textures/earth-topology-4k.jpg';
const SKY_TEXTURE = '/textures/night-sky.png';

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
    .polygonsTransitionDuration(200);

  const material = globe.globeMaterial() as GlobeMaterial;
  material.bumpScale = BUMP_SCALE;
  sharpenTextures(globe, material);

  return globe;
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
