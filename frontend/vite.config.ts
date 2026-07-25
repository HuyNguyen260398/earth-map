import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const stub = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The globe needs three.js and globe.gl on first paint, so deferring them behind
// a dynamic import() would not shorten the critical path. Splitting them into
// their own chunks does pay off: three.js changes only when the dependency is
// upgraded, so browsers keep it cached across ordinary app edits.
export default defineConfig({
  resolve: {
    // three-globe bundles every layer it offers and imports their dependencies
    // unconditionally, so code we never call still lands in the bundle. These
    // aliases cut the two largest such branches; see each stub for what it
    // disables and how to get it back.
    alias: [
      { find: /^three\/webgpu$/, replacement: stub('./src/vendor/three-webgpu.ts') },
      { find: /^three\/tsl$/, replacement: stub('./src/vendor/three-tsl.ts') },
      { find: /^h3-js$/, replacement: stub('./src/vendor/h3-js.ts') },
    ],
  },
  build: {
    // The three chunk is the floor here: it is one library, needed on first
    // paint, and already stripped of the WebGPU build. The limit sits just
    // above it so a genuine size regression still warns.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
});
