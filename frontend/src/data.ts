import type { FeatureCollection } from 'geojson';

async function fetchGeoJson(url: string): Promise<FeatureCollection> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return res.json();
}

let countriesPromise: Promise<FeatureCollection> | null = null;
let provincesPromise: Promise<FeatureCollection> | null = null;

// Cached after first success; a failure clears the cache so the next
// band entry retries the fetch.
export function loadCountries(): Promise<FeatureCollection> {
  countriesPromise ??= fetchGeoJson('/data/countries.geojson').catch((err) => {
    countriesPromise = null;
    throw err;
  });
  return countriesPromise;
}

export function loadProvinces(): Promise<FeatureCollection> {
  provincesPromise ??= fetchGeoJson('/data/vietnam-34-provinces.geojson').catch((err) => {
    provincesPromise = null;
    throw err;
  });
  return provincesPromise;
}

// province name (as it appears in the provinces file) → ward GeoJSON filename.
type WardManifest = Record<string, string>;

let wardManifestPromise: Promise<WardManifest> | null = null;
const wardPromises = new Map<string, Promise<FeatureCollection>>();

function loadWardManifest(): Promise<WardManifest> {
  wardManifestPromise ??= fetch('/data/wards/index.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ward manifest: HTTP ${res.status}`);
      return res.json() as Promise<WardManifest>;
    })
    .catch((err) => {
      wardManifestPromise = null;
      throw err;
    });
  return wardManifestPromise;
}

// Wards are vendored one file per province (prepare-wards.mjs); each is fetched
// and cached the first time that province is opened. A failure clears the cache
// so the next visit retries.
export function loadWards(provinceName: string): Promise<FeatureCollection> {
  let promise = wardPromises.get(provinceName);
  if (!promise) {
    promise = fetchWards(provinceName).catch((err) => {
      wardPromises.delete(provinceName);
      throw err;
    });
    wardPromises.set(provinceName, promise);
  }
  return promise;
}

async function fetchWards(provinceName: string): Promise<FeatureCollection> {
  const manifest = await loadWardManifest();
  const file = manifest[provinceName];
  if (!file) throw new Error(`No ward data for province "${provinceName}"`);
  return fetchGeoJson(`/data/wards/${file}`);
}
