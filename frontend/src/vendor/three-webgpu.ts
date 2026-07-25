// Stand-in for `three/webgpu`, aliased in vite.config.ts.
//
// three-globe and three-render-objects import this entry unconditionally, but
// only reach it down two paths this globe never takes: the `heatmapsData`
// layer, whose kernel density estimate runs as a WebGPU compute shader, and
// three-render-objects' `useWebGPU` renderer switch, which globe.gl doesn't
// expose at all. Following the import drags in three.webgpu.js — the whole
// node-material system, 2.1 MB of source and over half the three chunk.
//
// Both bindings are used lazily (`new WebGPURenderer()` runs inside the KDE
// function), so nothing here executes unless one of those features is turned
// on, at which point the throw names the reason.
//
// See also [three/tsl](./three-tsl.ts), the companion entry point.

import { stubbedOut } from './stub';

export class WebGPURenderer {
  constructor() {
    stubbedOut('three/webgpu', 'WebGPURenderer');
  }
}

export class StorageInstancedBufferAttribute {
  constructor() {
    stubbedOut('three/webgpu', 'StorageInstancedBufferAttribute');
  }
}
