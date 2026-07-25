// Shared failure mode for the vendor stubs in this directory.
//
// Each stub replaces a dependency that three-globe imports for a layer this
// globe doesn't draw. The alias makes those imports resolve here instead of to
// the real (large) package, so the code is absent from the bundle rather than
// merely unused. If a future change does switch on one of those layers, the
// call lands on a stub and this says which alias to drop.

export function stubbedOut(module: string, name: string): never {
  throw new Error(
    `${module}: \`${name}\` was stubbed out of this bundle to keep it small. ` +
      `Remove the '${module}' alias in vite.config.ts to restore the real module.`,
  );
}
