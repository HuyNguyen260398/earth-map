# Texture provenance

## earth-day-4k.jpg / earth-day-8k.jpg

- NASA Blue Marble Next Generation, August 2004, with topography and bathymetry
  (public domain). Source image: `world.topo.bathy.200408.3x21600x10800.jpg`
  from https://visibleearth.nasa.gov/images/73776.
- The 4k copy loads first; the 8k copy is swapped in once the user zooms past
  the far view (see `src/globe.ts`), which is where the extra detail shows.

## earth-topology-4k.jpg

- NASA/GEBCO global elevation, `gebco_08_rev_elev_21600x10800.png`, from
  https://visibleearth.nasa.gov/images/73934 (public domain). Used as the
  bump map; it is near-black over lowlands, hence the high `bumpScale`.

## night-sky.png

- Starfield background shipped with
  [three-globe](https://github.com/vasturiano/three-globe) (`example/img`).

## Regenerating

Downsampled with macOS `sips` (any resampler will do):

    curl -fLO https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73776/world.topo.bathy.200408.3x21600x10800.jpg
    curl -fLO https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73934/gebco_08_rev_elev_21600x10800.png

    sips -s format jpeg -s formatOptions 72 --resampleWidth 4096 \
      world.topo.bathy.200408.3x21600x10800.jpg --out earth-day-4k.jpg
    sips -s format jpeg -s formatOptions 70 --resampleWidth 8192 \
      world.topo.bathy.200408.3x21600x10800.jpg --out earth-day-8k.jpg
    sips -s format jpeg -s formatOptions 75 --resampleWidth 4096 \
      gebco_08_rev_elev_21600x10800.png --out earth-topology-4k.jpg

Keep both earth images derived from the *same* source month: the app swaps one
for the other at runtime, and a mismatch shows up as a colour shift.
