// Stand-in for `three/tsl`, aliased in vite.config.ts.
//
// three-globe does `import * as tsl from 'three/tsl'` and reads these names off
// the namespace to build the heatmap layer's compute shader. three/tsl
// re-exports three.webgpu.js, so leaving this alone would pull the node-material
// system back in even with [three/webgpu](./three-webgpu.ts) stubbed.
//
// The exports below are exactly the names three-globe reads (three-globe.mjs,
// the `computeGeoKde` shader). They exist so the bundler can resolve the
// namespace accesses statically; if three-globe starts using another TSL
// builder, the build warns that the import is undefined and it belongs here.

import { stubbedOut } from './stub';

const builder = (name: string) => (): never => stubbedOut('three/tsl', name);

export const Fn = builder('Fn');
export const If = builder('If');
export const Loop = builder('Loop');
export const uniform = builder('uniform');
export const storage = builder('storage');
export const instanceIndex = builder('instanceIndex');
export const float = builder('float');
export const sqrt = builder('sqrt');
export const sin = builder('sin');
export const cos = builder('cos');
export const asin = builder('asin');
export const exp = builder('exp');
export const negate = builder('negate');
