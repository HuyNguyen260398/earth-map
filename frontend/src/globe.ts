import Globe, { type GlobeInstance } from 'globe.gl';

export function createGlobe(container: HTMLElement): GlobeInstance {
  return new Globe(container)
    .globeImageUrl('/textures/earth-blue-marble.jpg')
    .bumpImageUrl('/textures/earth-topology.png')
    .backgroundImageUrl('/textures/night-sky.png')
    .polygonsData([])
    .polygonAltitude(0.006)
    .polygonCapColor(() => 'rgba(60, 120, 220, 0.25)')
    .polygonSideColor(() => 'rgba(0, 0, 0, 0.05)')
    .polygonStrokeColor(() => '#ffffff')
    .polygonsTransitionDuration(200);
}
